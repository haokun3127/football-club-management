// Cross-platform clean helper: removes the given paths (files or directories).
// Usage: node scripts/clean.mjs dist tsconfig.tsbuildinfo
import { rmSync } from 'node:fs';

for (const target of process.argv.slice(2)) {
  rmSync(target, { recursive: true, force: true });
}
