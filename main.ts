// Vice Cover Studio — entry program for gta6-cover-art-01 (Node 22, stdlib only).
// Copies app/ and screenshots/ from this repository into the output directory
// (MAKEFUN_OUTPUT_DIR outside the grader, /output inside it) and writes
// /output/dossier.json with buildDossier from vendor/makefun-app.ts.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const repoRoot = dirname(fileURLToPath(import.meta.url));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
console.log(`wrote ${outDir}/dossier.json`);
