"""Read-only evidence extraction; lexical inventory, not a call-graph proof."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TASK = Path(__file__).resolve().parent
api = ROOT / 'apps/api/src/routes'
routes = []
for path in sorted(api.glob('*.ts')):
    lines = path.read_text().splitlines()
    method = None
    for number, line in enumerate(lines, 1):
        match = re.search(r'\bapp\.(get|post|put|patch|delete)\b', line)
        if match:
            method = match.group(1).upper()
        match = re.search(r'["`\'](/(?:clubs|health)[^"`\']*)["`\']', line)
        if match and method:
            routes.append({'method': method, 'path': match.group(1), 'file': str(path.relative_to(ROOT)), 'line': number})
        elif method and '`${base}/' in line:
            route = re.search(r'`([^`]+)`', line)
            if route:
                routes.append({'method': method, 'path': route.group(1), 'file': str(path.relative_to(ROOT)), 'line': number, 'note': 'base resolved in source'})

mini = ROOT / 'apps/miniprogram-cq-talent'
bindings = []
for path in sorted((mini / 'pages').rglob('*.wxml')):
    text = path.read_text()
    ts = path.with_suffix('.ts')
    source = ts.read_text() if ts.exists() else ''
    handlers = sorted(set(re.findall(r'(?:bind|catch)(?::)?(?:tap|change|input|submit|longpress|touchstart|touchmove|touchend)\s*=\s*["\']([A-Za-z_$][\w$]*)["\']', text)))
    actions = []
    for handler in handlers:
        pattern = re.compile(r'(?:async\s+)?'+re.escape(handler)+r'\s*\(')
        match = pattern.search(source)
        actions.append({'handler': handler, 'definitionLine': source[:match.start()].count('\n') + 1 if match else None})
    bindings.append({'page': str(path.relative_to(mini)), 'handlers': actions})

result = {'scope': 'local working tree only; regex inventory, not full semantic linkage or runtime validation', 'routes': routes, 'pages': bindings}
(TASK / 'local-contract-inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'routes': len(routes), 'pages': len(bindings), 'handlers': sum(len(p['handlers']) for p in bindings), 'output': str(TASK / 'local-contract-inventory.json')}, ensure_ascii=False))
