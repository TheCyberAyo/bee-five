// Compile test dependencies with the project's TypeScript version. This keeps
// checks offline and avoids differences between Node's TS loader and tsx.
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tests = process.argv.slice(2);
if (!tests.length) throw new Error('Pass one or more test script paths');
const output = mkdtempSync(join(tmpdir(), 'bee-five-tests-'));
try {
  const sources = tests.map(test => readFileSync(resolve(root, test), 'utf8'));
  const dependencies = [...new Set(sources.flatMap(source =>
    [...source.matchAll(/['"]\.\.\/src\/([^'"]+\.ts)['"]/g)].map(match => `src/${match[1]}`)
  ))];
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'),
    '--module', 'commonjs', '--target', 'ES2020', '--esModuleInterop', '--skipLibCheck',
    '--rootDir', 'src', '--outDir', output, ...dependencies,
  ], { cwd: root, stdio: 'inherit' });
  writeFileSync(join(output, 'package.json'), '{"type":"commonjs"}');
  sources.forEach((source, index) => {
    const testPath = join(output, basename(tests[index]));
    writeFileSync(testPath, source.replace(/(['"])\.\.\/src\/([^'"]+)\.ts\1/g, '$1./$2.js$1'));
    execFileSync(process.execPath, [testPath], { stdio: 'inherit' });
  });
} finally {
  rmSync(output, { recursive: true, force: true });
}
