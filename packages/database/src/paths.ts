import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// packages/database/src -> packages/database -> packages -> <repo root>
const repoRoot = resolve(here, '../../..');

export const DEFAULT_MIGRATIONS_DIR = resolve(repoRoot, 'database/migrations');
export const DEFAULT_SEEDS_DIR = resolve(repoRoot, 'database/seeds');
