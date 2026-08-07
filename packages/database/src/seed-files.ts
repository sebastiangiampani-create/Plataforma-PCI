import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface SeedFile {
  name: string;
  path: string;
}

export function listSeedFiles(dir: string): SeedFile[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((name) => ({ name, path: join(dir, name) }));
}

export function readSeedSql(path: string): string {
  return readFileSync(path, 'utf8');
}
