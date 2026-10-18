// mora - Build firestore.rules from firestore.rules.template.
//
//   npm run rules            # reads ALLOWED_USER_EMAIL from .env.local / env
//   npm run rules -- --emu   # emulator: dev@mora.test
//
// Deploy: firebase deploy --only firestore:rules
// The email stays out of git: the output file is gitignored.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const EMU = process.argv.includes('--emu');

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const env = { ...readEnvFile('.env.local'), ...process.env };
const email = EMU ? 'dev@mora.test' : (env.ALLOWED_USER_EMAIL ?? '').trim().toLowerCase();

if (!/^[^\s'"\\@]+@[^\s'"\\@]+$/.test(email)) {
  console.error('ALLOWED_USER_EMAIL is missing or not an email. Set it in .env.local.');
  process.exit(1);
}

const out = readFileSync('firestore.rules.template', 'utf8').replaceAll('__ALLOWED_EMAIL__', email);
// The emulator gets its own file, so a test run can never leave the fake
// email in the rules that `firebase deploy` uploads.
const file = EMU ? 'firestore.emu.rules' : 'firestore.rules';
writeFileSync(file, out);
console.log(`${file} written`);
