const assert = require('node:assert/strict');
const { existsSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, resolve } = require('node:path');
const test = require('node:test');

const {
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
