// SOLMAR HEAT — a gta6-01 entry (Node 22, standard library only): the game is this
// directory's game/ folder, plain static files a desktop browser loads offline
// (game/index.html and its ES modules, no library and no network request), and this
// program hands it in. It copies game/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library.
//
// The game itself: an original open-world crime story in the invented coastal city of
// Solmar. Dario Cruz walks the streets or steals and drives cars, traffic and
// pedestrians fill the roads, the police answer a five-star wanted level, and five
// story missions — pickup, delivery, getaway, a bank vault crack under a screaming
// alarm, and a timed last run to the boat — pay out in cash, across a full night
// that falls from dusk to dawn, with a start screen, a minimap HUD with a dashed
// mission route, a three-station pirate radio and a localStorage save.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The entry is only as good as its screenshots: refuse to hand in a dossier
// with more than four, or any one over the scorer's 256 KiB cap.
const SHOT_MAX = 4;
const SHOT_MAX_BYTES = 262144;
const shotDir = join(here, 'screenshots');
const shots = existsSync(shotDir) ? readdirSync(shotDir).filter((name) => /\.(jpe?g|png|webp)$/i.test(name)).sort() : [];
if (shots.length === 0) {
  console.error('error: no screenshots in screenshots/ — capture them before handing in');
  process.exitCode = 1;
  process.exit(1);
}
if (shots.length > SHOT_MAX) {
  console.error(`error: ${shots.length} screenshots, the scorer takes at most ${SHOT_MAX}`);
  process.exitCode = 1;
  process.exit(1);
}
for (const name of shots) {
  const size = statSync(join(shotDir, name)).size;
  if (size > SHOT_MAX_BYTES) {
    console.error(`error: screenshots/${name} is ${size} bytes, over the ${SHOT_MAX_BYTES} byte cap`);
    process.exitCode = 1;
    process.exit(1);
  }
}
if (!existsSync(join(here, 'game', 'index.html'))) {
  console.error('error: game/index.html is missing');
  process.exitCode = 1;
  process.exit(1);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`solmar heat: ${shots.length} screenshot(s) (${shots.join(', ')}) copied to ${out}`);
