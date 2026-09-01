// Vérifie le budget de bundle du §14, tel que plafonné : le poids AJOUTÉ par le
// code applicatif, pas le total imposé par la pile.
//
// Se lance après `expo export`, ou avec --export pour construire lui-même.
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const budget = JSON.parse(readFileSync(join(root, 'perf/budget.json'), 'utf8')).web;
const distribution = join(root, 'apps/web/dist/_expo/static/js/web');

if (process.argv.includes('--export')) {
  execFileSync('pnpm', ['--filter', '@runtrack/web', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
}

const bundles = readdirSync(distribution).filter((name) => name.endsWith('.js'));
if (bundles.length === 0) {
  console.error(`Aucun bundle dans ${distribution}. Lance d'abord l'export web.`);
  process.exit(1);
}

// Le §14 plafonne le bundle **initial**, et c'est le mot qui compte : Metro sort
// un morceau séparé par `import()` différé, et un morceau qu'on ne télécharge
// qu'en ouvrant une course ne pèse ni sur le premier rendu ni sur le LCP.
// L'entrée est ce que Metro nomme `entry-*.js` ; le reste est listé, hors budget.
const isEntry = (name) => name.startsWith('entry-');
const entries = bundles.filter(isEntry);
const deferred = bundles.filter((name) => !isEntry(name));
// Un export sans fichier `entry-*` : on ne devine pas, on compte tout.
const initial = entries.length === 0 ? bundles : entries;

const sizeOf = (names) =>
  names.reduce((total, name) => total + gzipSync(readFileSync(join(distribution, name))).length, 0);

const kilobytes = sizeOf(initial) / 1024;
const ceiling = budget.floorKilobytes + budget.applicativeKilobytes;
const applicative = kilobytes - budget.floorKilobytes;

const round = (value) => value.toFixed(0);
console.log(`bundle web        : ${round(kilobytes)} Ko compressés`);
console.log(`plancher de pile  : ${round(budget.floorKilobytes)} Ko (mesuré, sans écran)`);
console.log(
  `poids applicatif  : ${round(applicative)} Ko sur ${round(budget.applicativeKilobytes)} Ko de budget`,
);

if (kilobytes > ceiling) {
  console.error(
    `\nBudget dépassé de ${round(kilobytes - ceiling)} Ko. Le §14 plafonne le poids ajouté à ` +
      `${round(budget.applicativeKilobytes)} Ko ; il en fait ${round(applicative)}.`,
  );
  process.exit(1);
}

console.log(`reste             : ${round(ceiling - kilobytes)} Ko`);

if (deferred.length > 0) {
  console.log("\nmorceaux différés (hors budget, chargés à l'usage) :");
  for (const name of deferred) {
    const weight = gzipSync(readFileSync(join(distribution, name))).length / 1024;
    console.log(`  ${name} : ${round(weight)} Ko`);
  }
}
