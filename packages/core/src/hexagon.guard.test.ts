import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The hexagon is only real if something checks it. The ESLint rule and the
 * narrowed `tsconfig.src.json` both guard this boundary, but a build can be run
 * with lint skipped and an editor can be pointed at the wrong project — this
 * test cannot be skipped, because it is part of the suite that gates the merge.
 *
 * It reads the source rather than importing it: an import would already be the
 * thing we are trying to forbid.
 */
const SOURCE_ROOT = join(import.meta.dirname, '.');

const IMPORT_SPECIFIER = /^\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/gm;
const BARE_IMPORT = /^\s*import\s+['"]([^'"]+)['"]/gm;

function sourceFilesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(path);
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) return [];
    return [path];
  });
}

function specifiersIn(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(IMPORT_SPECIFIER), ...source.matchAll(BARE_IMPORT)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined);
}

describe("packages/core n'importe aucune plateforme", () => {
  const files = sourceFilesUnder(SOURCE_ROOT);

  it('trouve bien des fichiers à inspecter', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s ne dépend que de lui-même', (file) => {
    const outsideWorld = specifiersIn(file).filter((specifier) => !specifier.startsWith('.'));

    expect(
      outsideWorld,
      `${relative(SOURCE_ROOT, file)} importe ${outsideWorld.join(', ')} : ` +
        "un besoin de plateforme se déclare en port, il ne s'importe pas.",
    ).toEqual([]);
  });
});
