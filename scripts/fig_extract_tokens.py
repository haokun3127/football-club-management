#!/usr/bin/env python3
"""Extract design tokens (variables, text styles, shadows) + page inventory
from decoded fig-kiwi JSON into markdown/JSON reports."""
import json
import sys
sys.path.insert(0, 'tools')
from fig2json import Buf, decode_schema
import zipfile
import zlib

FIG = 'football-club-management-最终完整交接包-2026-07-29/01-当前项目完整副本/.hermes/desktop-attachments/重庆天才小程序 UIUX Design System.fig'

z = zipfile.ZipFile(FIG)
defs = decode_schema(Buf(zlib.decompressobj(-15).decompress(z.read('canvas.fig')[16:16+28766])))
enums = {}
for i, d in enumerate(defs):
    if d['kind'] == 0:
        enums[i] = {f['value']: f['name'] for f in d['fields']}

doc = json.load(open('tools/fig-out.json', encoding='utf-8'))
changes = doc['root']['nodeChanges']

nc_def = next(d for d in defs if d['name'] == 'NodeChange')
nt_idx = next(f['type'] for f in nc_def['fields'] if f['name'] == 'type')
def enum_name(idx, v): return enums.get(idx, {}).get(v, f'?{v}')

nodes = {}
for ch in changes:
    g = ch.get('guid')
    if g:
        nodes[(g.get('sessionID'), g.get('localID'))] = ch

def parent_key(ch):
    pi = ch.get('parentIndex')
    pg = pi and pi.get('guid')
    return (pg.get('sessionID'), pg.get('localID')) if pg else None

children = {}
for key, ch in nodes.items():
    children.setdefault(parent_key(ch), []).append(key)

def hex_of(c):
    return '#%02x%02x%02x' % (round(c['r']*255), round(c['g']*255), round(c['b']*255))

# ---------- variables ----------
lines = ['# Figma 设计变量提取（自动解析 .fig）', '']
var_sets = {k: nodes[k].get('name') for k, ch in nodes.items() if enum_name(nt_idx, ch.get('type', -1)) == 'VARIABLE_SET'}
vars_by_set = {}
for k, ch in nodes.items():
    if enum_name(nt_idx, ch.get('type', -1)) != 'VARIABLE':
        continue
    vsid = (ch.get('variableSetID') or {}).get('guid') or {}
    vars_by_set.setdefault((vsid.get('sessionID'), vsid.get('localID')), []).append(ch)

for vs_key, vs_name in var_sets.items():
    lines.append(f"\n## 变量集: {vs_name}")
    for v in vars_by_set.get(vs_key, []):
        entries = (v.get('variableDataValues') or {}).get('entries', [])
        vals = []
        for e in entries:
            vd = (e.get('variableData') or {}).get('value') or {}
            if 'colorValue' in vd:
                c = vd['colorValue']
                vals.append(hex_of(c) + (f" @{c['a']:.2f}" if c.get('a', 1) < 1 else ''))
            elif 'floatValue' in vd:
                vals.append(str(vd['floatValue']))
            elif 'stringValue' in vd:
                vals.append(repr(vd['stringValue']))
            elif 'alias' in vd:
                vals.append('alias')
        syntax = (v.get('codeSyntax') or {}).get('entries', [])
        syn = syntax[0]['value'] if syntax else ''
        lines.append(f"- `{v.get('name')}` = {' | '.join(vals)}" + (f"  ({syn})" if syn else ''))

# ---------- pages ----------
lines.append('\n\n# 页面清单（CANVAS → FRAME）')
canvas_keys = [k for k, ch in nodes.items() if enum_name(nt_idx, ch.get('type', -1)) == 'CANVAS']
canvas_keys.sort(key=lambda k: nodes[k].get('name', ''))
for ck in canvas_keys:
    c = nodes[ck]
    frames = children.get(ck, [])
    lines.append(f"\n## {c.get('name')}  ({len(frames)} frames)")
    for fk in frames:
        f = nodes[fk]
        t = enum_name(nt_idx, f.get('type', -1))
        size = f.get('size') or {}
        w, h = size.get('x'), size.get('y')
        dim = f" {w:.0f}x{h:.0f}" if isinstance(w, (int, float)) and isinstance(h, (int, float)) else ''
        lines.append(f"- [{t}] {f.get('name')}{dim}")

open('tools/fig-report.md', 'w', encoding='utf-8').write('\n'.join(lines))
print(f'wrote tools/fig-report.md, {len(lines)} lines')
