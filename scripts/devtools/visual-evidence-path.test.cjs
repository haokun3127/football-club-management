const assert = require('node:assert/strict');
const { existsSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, resolve } = require('node:path');
const test = require('node:test');

const {
  assertVisualEvidencePath,
  getVisualEvidenceDirectory,
  createDefaultVisualEvidencePath,
} = require('./visual-evidence-path.cjs');

test('default visual evidence stays outside the desktop repository', () => {
  const directory = getVisualEvidenceDirectory({
    env: {},
    temporaryDirectory: tmpdir(),
  });
  const output = createDefaultVisualEvidencePath('route-shot', {
    env: {},
    temporaryDirectory: tmpdir(),
    now: () => 1788151200000,
    random: () => 0.123456,
  });

  assert.equal(directory, resolve(tmpdir(), 'cq-talent-visual-evidence'));
  assert.equal(dirname(output), directory);
  assert.match(output, /route-shot-1788151200000-\d+\.png$/);
  assert.equal(output.includes('Desktop'), false);
  assert.equal(existsSync(directory), true);

  rmSync(directory, { recursive: true, force: true });
});

test('rejects a configured evidence directory on the desktop or inside this repository', () => {
  assert.throws(
    () => getVisualEvidenceDirectory({
      env: { CQ_TALENT_VISUAL_EVIDENCE_DIR: 'C:\\Users\\ASUS\\Desktop\\cq-talent-evidence' },
      temporaryDirectory: tmpdir(),
    }),
    /desktop/i,
  );
  assert.throws(
    () => getVisualEvidenceDirectory({
      env: { CQ_TALENT_VISUAL_EVIDENCE_DIR: 'C:\\Users\\ASUS\\Desktop\\football-club-management-codex-windows-2026-08-02\\tmp\\evidence' },
      temporaryDirectory: tmpdir(),
    }),
    /repository|worktree/i,
  );
});

test('rejects unsafe explicit output paths and accepts a temporary PNG path', () => {
  assert.throws(
    () => assertVisualEvidencePath('C:\\Users\\ASUS\\Desktop\\shot.png'),
    /desktop/i,
  );
  assert.throws(
    () => assertVisualEvidencePath('C:\\Users\\ASUS\\Desktop\\football-club-management-codex-windows-2026-08-02\\tmp\\shot.png'),
    /repository|worktree/i,
  );
  const output = assertVisualEvidencePath('C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-visual-evidence\\shot.png');
  assert.match(output, /shot\.png$/i);
});
