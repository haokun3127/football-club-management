#!/usr/bin/env python3
"""Capture the exact logical viewport from a visible WeChat DevTools simulator window."""

from __future__ import annotations

import argparse
import ctypes
from ctypes import wintypes
import json
import math
from pathlib import Path
import struct
import sys
import zlib


PW_RENDERFULLCONTENT = 2
BI_RGB = 0
DIB_RGB_COLORS = 0


class RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.c_long),
        ("top", ctypes.c_long),
        ("right", ctypes.c_long),
        ("bottom", ctypes.c_long),
    ]


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ("biSize", ctypes.c_uint32),
        ("biWidth", ctypes.c_long),
        ("biHeight", ctypes.c_long),
        ("biPlanes", ctypes.c_uint16),
        ("biBitCount", ctypes.c_uint16),
        ("biCompression", ctypes.c_uint32),
        ("biSizeImage", ctypes.c_uint32),
        ("biXPelsPerMeter", ctypes.c_long),
        ("biYPelsPerMeter", ctypes.c_long),
        ("biClrUsed", ctypes.c_uint32),
        ("biClrImportant", ctypes.c_uint32),
    ]


class RGBQUAD(ctypes.Structure):
    _fields_ = [
        ("rgbBlue", ctypes.c_ubyte),
        ("rgbGreen", ctypes.c_ubyte),
        ("rgbRed", ctypes.c_ubyte),
        ("rgbReserved", ctypes.c_ubyte),
    ]


class BITMAPINFO(ctypes.Structure):
    _fields_ = [("bmiHeader", BITMAPINFOHEADER), ("bmiColors", RGBQUAD * 1)]


user32 = ctypes.WinDLL("user32", use_last_error=True)
gdi32 = ctypes.WinDLL("gdi32", use_last_error=True)

EnumWindowsProc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
user32.EnumWindows.argtypes = [EnumWindowsProc, wintypes.LPARAM]
user32.EnumWindows.restype = wintypes.BOOL
user32.IsWindowVisible.argtypes = [wintypes.HWND]
user32.IsWindowVisible.restype = wintypes.BOOL
user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
user32.GetWindowTextLengthW.restype = ctypes.c_int
user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
user32.GetWindowTextW.restype = ctypes.c_int
user32.GetWindowRect.argtypes = [wintypes.HWND, ctypes.POINTER(RECT)]
user32.GetWindowRect.restype = wintypes.BOOL
user32.PrintWindow.argtypes = [wintypes.HWND, wintypes.HDC, wintypes.UINT]
user32.PrintWindow.restype = wintypes.BOOL
user32.GetDC.argtypes = [wintypes.HWND]
user32.GetDC.restype = wintypes.HDC
user32.ReleaseDC.argtypes = [wintypes.HWND, wintypes.HDC]
user32.ReleaseDC.restype = ctypes.c_int
user32.SetProcessDPIAware.restype = wintypes.BOOL
if hasattr(user32, "GetDpiForWindow"):
    user32.GetDpiForWindow.argtypes = [wintypes.HWND]
    user32.GetDpiForWindow.restype = wintypes.UINT

gdi32.CreateCompatibleDC.argtypes = [wintypes.HDC]
gdi32.CreateCompatibleDC.restype = wintypes.HDC
gdi32.CreateCompatibleBitmap.argtypes = [wintypes.HDC, ctypes.c_int, ctypes.c_int]
gdi32.CreateCompatibleBitmap.restype = wintypes.HBITMAP
gdi32.SelectObject.argtypes = [wintypes.HDC, wintypes.HGDIOBJ]
gdi32.SelectObject.restype = wintypes.HGDIOBJ
gdi32.DeleteDC.argtypes = [wintypes.HDC]
gdi32.DeleteDC.restype = wintypes.BOOL
gdi32.DeleteObject.argtypes = [wintypes.HGDIOBJ]
gdi32.DeleteObject.restype = wintypes.BOOL
gdi32.GetDIBits.argtypes = [
    wintypes.HDC,
    wintypes.HBITMAP,
    wintypes.UINT,
    wintypes.UINT,
    ctypes.c_void_p,
    ctypes.POINTER(BITMAPINFO),
    wintypes.UINT,
]
gdi32.GetDIBits.restype = ctypes.c_int


def rounded_pixels(value: float) -> int:
    return int(math.floor(value + 0.5))


def find_simulator_window(title: str | None) -> tuple[wintypes.HWND, str]:
    windows: list[tuple[wintypes.HWND, str]] = []

    @EnumWindowsProc
    def collect(hwnd: wintypes.HWND, _lparam: wintypes.LPARAM) -> bool:
        if not user32.IsWindowVisible(hwnd):
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        if length <= 0:
            return True
        buffer = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buffer, len(buffer))
        candidate = buffer.value
        if candidate:
            windows.append((hwnd, candidate))
        return True

    if not user32.EnumWindows(collect, 0):
        raise RuntimeError("Could not enumerate top-level windows")

    suffix = "\u7684\u6a21\u62df\u5668"
    matches = [(hwnd, candidate) for hwnd, candidate in windows if candidate == title] if title else [
        (hwnd, candidate) for hwnd, candidate in windows if candidate.endswith(suffix)
    ]
    if not matches:
        if title:
            raise RuntimeError(f"No visible WeChat DevTools simulator window found titled {title!r}")
        raise RuntimeError("No visible WeChat DevTools simulator window found ending in the simulator suffix")
    if len(matches) > 1:
        raise RuntimeError("Found multiple visible DevTools simulator windows; set WECHAT_DEVTOOLS_SIMULATOR_TITLE to the exact window title")
    return matches[0]


def capture_window_bgra(hwnd: wintypes.HWND) -> tuple[bytes, int, int, int]:
    user32.SetProcessDPIAware()
    rect = RECT()
    if not user32.GetWindowRect(hwnd, ctypes.byref(rect)):
        raise RuntimeError("Could not read simulator window bounds")
    width = rect.right - rect.left
    height = rect.bottom - rect.top
    if width < 1 or height < 1:
        raise RuntimeError("Simulator window has invalid bounds")

    dpi = int(user32.GetDpiForWindow(hwnd)) if hasattr(user32, "GetDpiForWindow") else 96
    if dpi <= 0:
        raise RuntimeError("Could not determine simulator window DPI")

    screen_dc = user32.GetDC(0)
    if not screen_dc:
        raise RuntimeError("Could not acquire a compatible display context")
    memory_dc = None
    bitmap = None
    original = None
    try:
        memory_dc = gdi32.CreateCompatibleDC(screen_dc)
        if not memory_dc:
            raise RuntimeError("Could not create simulator capture context")
        bitmap = gdi32.CreateCompatibleBitmap(screen_dc, width, height)
        if not bitmap:
            raise RuntimeError("Could not allocate simulator capture bitmap")
        original = gdi32.SelectObject(memory_dc, bitmap)
        if not original:
            raise RuntimeError("Could not select simulator capture bitmap")
        if not user32.PrintWindow(hwnd, memory_dc, PW_RENDERFULLCONTENT):
            raise RuntimeError(f"PrintWindow failed: {ctypes.get_last_error()}")

        info = BITMAPINFO()
        info.bmiHeader.biSize = ctypes.sizeof(BITMAPINFOHEADER)
        info.bmiHeader.biWidth = width
        info.bmiHeader.biHeight = -height
        info.bmiHeader.biPlanes = 1
        info.bmiHeader.biBitCount = 32
        info.bmiHeader.biCompression = BI_RGB
        pixels = (ctypes.c_ubyte * (width * height * 4))()
        rows = gdi32.GetDIBits(memory_dc, bitmap, 0, height, ctypes.byref(pixels), ctypes.byref(info), DIB_RGB_COLORS)
        if rows != height:
            raise RuntimeError(f"GetDIBits returned {rows} rows instead of {height}")
        return bytes(pixels), width, height, dpi
    finally:
        if memory_dc and original:
            gdi32.SelectObject(memory_dc, original)
        if bitmap:
            gdi32.DeleteObject(bitmap)
        if memory_dc:
            gdi32.DeleteDC(memory_dc)
        user32.ReleaseDC(0, screen_dc)


def locate_iphone_x_viewport(bgra: bytes, window_width: int, window_height: int, dpi: int, logical_width: int, logical_height: int) -> tuple[int, int, int, int]:
    scale = dpi / 96.0
    width = rounded_pixels(logical_width * scale)
    height = rounded_pixels(logical_height * scale)
    if width > window_width or height > window_height:
        raise RuntimeError("Simulator window is smaller than the requested logical viewport at its current Windows scale")
    center_x = window_width // 2
    notch_run = max(16, rounded_pixels(28 * scale))
    max_top = window_height - height
    for top in range(max_top + 1):
        for offset in range(notch_run):
            index = ((top + offset) * window_width + center_x) * 4
            blue, green, red = bgra[index], bgra[index + 1], bgra[index + 2]
            if red > 12 or green > 12 or blue > 12:
                break
        else:
            return (window_width - width) // 2, top, width, height
    raise RuntimeError("Could not locate the iPhone X simulator notch needed to crop the logical viewport")


def png_chunk(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)


def write_png(path: Path, bgra: bytes, source_width: int, crop: tuple[int, int, int, int]) -> None:
    left, top, width, height = crop
    raw = bytearray()
    for row_index in range(top, top + height):
        raw.append(0)
        start = (row_index * source_width + left) * 4
        row = bytearray(bgra[start:start + width * 4])
        row[0::4], row[2::4] = row[2::4], row[0::4]
        raw.extend(row)
    payload = b"\x89PNG\r\n\x1a\n"
    payload += png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    payload += png_chunk(b"IDAT", zlib.compress(bytes(raw), level=9))
    payload += png_chunk(b"IEND", b"")
    path.write_bytes(payload)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    parser.add_argument("--logical-width", type=int, required=True)
    parser.add_argument("--logical-height", type=int, required=True)
    parser.add_argument("--simulator-title", default="")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output = Path(args.output)
    if not output.parent.is_dir():
        raise RuntimeError("Capture output parent directory does not exist")
    hwnd, title = find_simulator_window(args.simulator_title or None)
    bgra, window_width, window_height, dpi = capture_window_bgra(hwnd)
    crop = locate_iphone_x_viewport(bgra, window_width, window_height, dpi, args.logical_width, args.logical_height)
    write_png(output, bgra, window_width, crop)
    print(json.dumps({
        "title": title,
        "window": {"width": window_width, "height": window_height},
        "crop": {"x": crop[0], "y": crop[1], "width": crop[2], "height": crop[3]},
        "dpi": dpi,
    }, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
