#!/usr/bin/env python3
"""Minimal fig-kiwi decoder: parses Figma .fig canvas.fig into JSON.

Format (reverse-engineered):
  8 bytes  magic "fig-kiwi"
  u32le    version
  u32le    schema chunk size
  bytes    schema chunk (kiwi binary schema)
  bytes    data chunk (kiwi message encoded with that schema)

Kiwi primitives: LEB128 varuint, zigzag varint, f32le, utf-8 strings.
"""
import json
import os
import struct
import zlib
import sys
import zipfile

TRACE = os.environ.get("FIG_TRACE") == "1"
_trace_log = []


class Buf:
    def __init__(self, data: bytes, pos: int = 0):
        self.data = data
        self.pos = pos

    def read_byte(self) -> int:
        b = self.data[self.pos]
        self.pos += 1
        return b

    def read_bytes(self, n: int) -> bytes:
        b = self.data[self.pos:self.pos + n]
        self.pos += n
        return b

    def read_varuint(self) -> int:
        result = 0
        shift = 0
        while True:
            b = self.read_byte()
            result |= (b & 0x7F) << shift
            if not (b & 0x80):
                return result
            shift += 7
            if shift > 63:
                raise ValueError("varuint too long")

    def read_varint(self) -> int:
        v = self.read_varuint()
        return (v >> 1) ^ -(v & 1)

    def read_float(self) -> float:
        # kiwi varfloat: single 0x00 byte = 0.0; otherwise 4 bytes LE,
        # rotate bits left by 23 (right by 9), reinterpret as f32.
        first = self.data[self.pos]
        if first == 0:
            self.pos += 1
            return 0.0
        bits = struct.unpack_from("<I", self.data, self.pos)[0]
        self.pos += 4
        bits = ((bits << 23) | (bits >> 9)) & 0xFFFFFFFF
        return struct.unpack("<f", struct.pack("<I", bits))[0]

    def read_string(self) -> str:
        n = self.read_varuint()
        return self.read_bytes(n).decode("utf-8", errors="replace")

    def read_cstring(self) -> str:
        end = self.data.index(b"\x00", self.pos)
        s = self.data[self.pos:end].decode("utf-8", errors="replace")
        self.pos = end + 1
        return s


def decode_schema(buf: Buf):
    definitions = []
    count = buf.read_varuint()
    for _ in range(count):
        name = buf.read_cstring()
        kind = buf.read_byte()  # 0=ENUM, 1=STRUCT, 2=MESSAGE
        field_count = buf.read_varuint()
        fields = []
        for _ in range(field_count):
            fname = buf.read_cstring()
            ftype = buf.read_varint()   # negative = builtin, >=0 = definition index
            is_array = bool(buf.read_byte())
            value = buf.read_varuint()
            fields.append({"name": fname, "type": ftype, "isArray": is_array, "value": value})
        definitions.append({"name": name, "kind": kind, "fields": fields})
    return definitions


BUILTIN_NAMES = {-1: "BOOL", -2: "BYTE", -3: "INT", -4: "UINT", -5: "FLOAT", -6: "STRING"}


def make_decoder(definitions):
    def read_value(buf: Buf, ftype: int, is_array: bool, depth: int):
        if is_array:
            n = buf.read_varuint()
            return [read_single(buf, ftype, depth) for _ in range(n)]
        return read_single(buf, ftype, depth)

    def read_single(buf: Buf, ftype: int, depth: int):
        if ftype == -1:
            return bool(buf.read_byte())
        if ftype == -2:
            return buf.read_byte()
        if ftype == -3:
            return buf.read_varint()
        if ftype == -4:
            return buf.read_varuint()
        if ftype == -5:
            return buf.read_float()
        if ftype == -6:
            return buf.read_cstring()
        d = definitions[ftype]
        if d["kind"] == 0:  # ENUM
            return buf.read_varuint()
        if d["kind"] == 1:  # STRUCT: fields inline in order
            out = {}
            for f in d["fields"]:
                out[f["name"]] = read_value(buf, f["type"], f["isArray"], depth + 1)
            return out
        # MESSAGE: tagged fields terminated by 0
        return read_message(buf, d, depth + 1)

    def read_message(buf: Buf, d, depth: int):
        if depth > 400:
            raise ValueError("too deep")
        start = buf.pos
        out = {}
        fields_by_id = {f["value"]: f for f in d["fields"]}
        while True:
            fid = buf.read_varuint()
            if fid == 0:
                break
            f = fields_by_id.get(fid)
            if f is None:
                if TRACE:
                    for entry in _trace_log[-12:]:
                        print("TRACE", *entry, file=sys.stderr)
                raise ValueError(f"unknown field id {fid} in {d['name']} at {buf.pos}")
            tname = definitions[f["type"]]["name"] if f["type"] >= 0 else str(f["type"])
            vstart = buf.pos
            out[f["name"]] = read_value(buf, f["type"], f["isArray"], depth)
            if TRACE:
                _trace_log.append(("  " * min(depth, 20), d["name"], f["name"], tname, vstart, "->", buf.pos))
                del _trace_log[:-200]
        return out

    return read_message


def main():
    src = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else None

    if zipfile.is_zipfile(src):
        with zipfile.ZipFile(src) as z:
            data = z.read("canvas.fig")
    else:
        data = open(src, "rb").read()

    assert data[:8] == b"fig-kiwi", "bad magic"
    version = struct.unpack_from("<I", data, 8)[0]
    schema_size = struct.unpack_from("<I", data, 12)[0]
    print(f"version={version} schema_size={schema_size} total={len(data)}", file=sys.stderr)

    schema_raw = zlib.decompressobj(-15).decompress(data[16:16 + schema_size])
    # data chunk: u32 length prefix, then zstd frame (magic 28 b5 2f fd)
    off = 16 + schema_size
    dlen = struct.unpack_from("<I", data, off)[0]
    dchunk = data[off + 4:off + 4 + dlen]
    if dchunk[:4] == b"\x28\xb5\x2f\xfd":
        import zstandard
        data_raw = zstandard.ZstdDecompressor().decompress(dchunk, max_output_size=512 * 1024 * 1024)
    else:
        data_raw = zlib.decompressobj(-15).decompress(dchunk)
    print(f"schema inflated: {len(schema_raw)}, data inflated: {len(data_raw)}", file=sys.stderr)

    sbuf = Buf(schema_raw)
    definitions = decode_schema(sbuf)
    assert sbuf.pos == len(schema_raw), f"schema overrun: {sbuf.pos} vs {len(schema_raw)}"
    print(f"definitions={len(definitions)}", file=sys.stderr)
    kinds = {0: "ENUM", 1: "STRUCT", 2: "MESSAGE"}
    from collections import Counter
    print(Counter(kinds[d["kind"]] for d in definitions), file=sys.stderr)
    print("first defs:", [d["name"] for d in definitions[:10]], file=sys.stderr)
    print("last defs:", [d["name"] for d in definitions[-10:]], file=sys.stderr)

    # root message: prefer the one named "Message", else last definition
    root_idx = next((i for i, d in enumerate(definitions) if d["name"] == "Message"), len(definitions) - 1)
    root = definitions[root_idx]
    print(f"root={root['name']} fields={len(root['fields'])}", file=sys.stderr)

    dbuf = Buf(data_raw)
    read_message = make_decoder(definitions)
    decoded = read_message(dbuf, root, 0)
    print(f"decoded bytes consumed: {dbuf.pos} / {len(data)}", file=sys.stderr)

    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"definitions_meta": [{"name": d["name"], "kind": d["kind"]} for d in definitions],
                       "root": decoded}, f, ensure_ascii=False)
        print(f"wrote {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
