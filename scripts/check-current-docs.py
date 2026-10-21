#!/usr/bin/env python3
"""Check repository documentation targets and the audit's requirement coverage.

This is a structural check, not a semantic review or external URL validator.
Run from any directory: python3 scripts/check-current-docs.py
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
files = sorted((ROOT / 'docs').rglob('*.md')) + sorted(ROOT.glob('*.md'))
for path in files:
    for raw in re.findall(r'\]\(([^)]+)\)', path.read_text()):
        target = raw.split('#', 1)[0].split(' "', 1)[0].strip('<>')
        target = re.sub(r':\d+$', '', target)  # Codex source-line links.
        if not target or re.match(r'[a-zA-Z][a-zA-Z0-9+.-]*:', target):
            continue
        if not (path.parent / target).exists():
            errors.append(f'{path.relative_to(ROOT)}: missing {target}')
requirements = set()
for name in ['01-product-and-miniprogram.md', '02-backoffice.md']:
    source = ROOT / 'docs/current/product-requirements' / name
    requirements.update(re.findall(r'^### (REQ-[A-Z]+-\d+) ', source.read_text(), re.M))
matrix = (ROOT / 'docs/current/post-optimization-audit-2026-10-21/product-gap-matrix.md').read_text()
covered = re.findall(r'^\| \[(REQ-[A-Z]+-\d+) ', matrix, re.M)
if set(covered) != requirements or len(covered) != len(set(covered)):
    errors.append(f'requirement matrix differs: missing={requirements-set(covered)}, extra={set(covered)-requirements}, rows={len(covered)}')
authority = (ROOT / 'docs/current/figma-source-of-truth.md').read_text()
if '当前唯一设计文件' not in authority or 'EyQtDtILGDZDf6neLBL6vs' not in authority:
    errors.append('Figma authority lacks the approved current file')
if '## 当前设计引用三元组' in authority:
    errors.append('historical design authority was restored into the current entry')
for error in errors:
    print(error, file=sys.stderr)
print(f'Documentation: {len(files)} Markdown files, {len(requirements)} requirements, {len(errors)} structural errors. External URLs, anchors and semantics require review.')
sys.exit(bool(errors))
