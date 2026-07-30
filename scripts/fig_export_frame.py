#!/usr/bin/env python3
"""Export a named Figma frame's subtree as an implementation-ready spec.

Usage: python fig_export_frame.py <fig-out.json> "<frame name>" [out.md]
Input JSON must be produced by fig2json.py. Positions are absolute (px),
composed from parent transform chain. Colors are hex with optional alpha.
"""
import json
import sys


def hex_of(c, opacity=1.0):
    if not c:
        return None
    r, g, b = (round(c['r'] * 255), round(c['g'] * 255), round(c['b'] * 255))
    a = c.get('a', 1.0) * opacity
    base = '#%02x%02x%02x' % (r, g, b)
    return base if a >= 0.999 else f'{base}@{a:.2f}'


def paint_summary(paints):
    out = []
    for p in paints or []:
        if not p.get('visible', True):
            continue
        t = p.get('type')
        if t == 0:  # solid
            out.append(hex_of(p.get('color'), p.get('opacity', 1.0)))
        else:
            out.append(f'paint-type-{t}')
    return out


def compose(pt, ct):
    # parent transform * child transform (2x3 matrices)
    return {
        'm00': pt['m00'] * ct['m00'] + pt['m01'] * ct['m10'],
        'm01': pt['m00'] * ct['m01'] + pt['m01'] * ct['m11'],
        'm02': pt['m00'] * ct['m02'] + pt['m01'] * ct['m12'] + pt['m02'],
        'm10': pt['m10'] * ct['m00'] + pt['m11'] * ct['m10'],
        'm11': pt['m10'] * ct['m01'] + pt['m11'] * ct['m11'],
        'm12': pt['m10'] * ct['m02'] + pt['m11'] * ct['m12'] + pt['m12'],
    }


IDENT = {'m00': 1.0, 'm01': 0.0, 'm02': 0.0, 'm10': 0.0, 'm11': 1.0, 'm12': 0.0}


def main():
    src, frame_name = sys.argv[1], sys.argv[2]
    out_path = sys.argv[3] if len(sys.argv) > 3 else None

    doc = json.load(open(src, encoding='utf-8'))
    changes = doc['root']['nodeChanges']
    nodes = {}
    for ch in changes:
        g = ch.get('guid')
        if g:
            nodes[(g['sessionID'], g['localID'])] = ch
    kids = {}
    for k, ch in nodes.items():
        pi = ch.get('parentIndex') or {}
        pg = pi.get('guid') or {}
        kids.setdefault((pg.get('sessionID'), pg.get('localID')), []).append(k)

    root_key = next((k for k, ch in nodes.items()
                     if ch.get('name') == frame_name and ch.get('size')), None)
    if not root_key:
        print(f'frame not found: {frame_name}', file=sys.stderr)
        sys.exit(1)

    lines = [f'# Figma 画板规格: {frame_name}', '']

    def walk(key, depth, parent_tf):
        ch = nodes.get(key)
        if ch is None or ch.get('visible') is False:
            return
        tf = compose(parent_tf, ch.get('transform') or IDENT)
        size = ch.get('size') or {}
        w, h = size.get('x'), size.get('y')
        x, y = tf['m02'], tf['m12']

        parts = [f"[{ch.get('type')}]", ch.get('name') or '(unnamed)']
        if isinstance(w, (int, float)):
            parts.append(f'{w:.0f}x{h:.0f} @({x:.0f},{y:.0f})')
        fills = paint_summary(ch.get('fillPaints'))
        strokes = paint_summary(ch.get('strokePaints'))
        if fills:
            parts.append('fill=' + ','.join(fills))
        if strokes:
            sw = ch.get('strokeWeight')
            parts.append(f"stroke={','.join(strokes)}" + (f' w{sw:g}' if sw else ''))
        if ch.get('cornerRadius'):
            parts.append(f"r={ch['cornerRadius']:g}")
        sm = ch.get('stackMode')
        if sm:
            orient = {1: 'H', 2: 'V'}.get(sm, str(sm))
            gap = ch.get('stackSpacing')
            ph = ch.get('stackHorizontalPadding')
            pv = ch.get('stackVerticalPadding')
            lay = f'layout={orient}'
            if gap is not None:
                lay += f' gap={gap:g}'
            if ph is not None or pv is not None:
                lay += f' pad={(pv or 0):g}/{(ph or 0):g}'
            parts.append(lay)
        if ch.get('type') == 13:  # TEXT
            fn = ch.get('fontName') or {}
            parts.append(f"font={fn.get('family','?')}/{fn.get('style','?')} {ch.get('fontSize'):g}px")
            chars = (ch.get('textData') or {}).get('characters', '')
            parts.append('text=' + json.dumps(chars, ensure_ascii=False))
        for eff in ch.get('effects') or []:
            if eff.get('type') == 1 and eff.get('visible', True):  # drop shadow
                off = eff.get('offset') or {}
                col = hex_of(eff.get('color'))
                parts.append(f"shadow=0,{off.get('y', 0):g},{eff.get('radius', 0):g},{col}")

        lines.append('  ' * depth + '- ' + ' | '.join(parts))
        for ck in kids.get(key, []):
            walk(ck, depth + 1, tf)

    walk(root_key, 0, IDENT)
    text = '\n'.join(lines)
    if out_path:
        open(out_path, 'w', encoding='utf-8').write(text)
        print(f'wrote {out_path} ({len(lines)} lines)')
    else:
        print(text)


if __name__ == '__main__':
    main()
