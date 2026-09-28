#!/usr/bin/env node
/* ============================================================
   Copies the shared blocks in tools/partials/ into every page, so the
   head, the nav and the footer are edited in one place.

     node tools/sync.mjs           rewrite the pages
     node tools/sync.mjs --check   only report pages that are out of date

   Each page marks where a block goes with <!-- @name --> ... <!-- /@name -->.
   {{url}} becomes the page's public address, and the nav link to the
   page itself gets aria-current="page".
   ============================================================ */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://nabil-sehli.github.io/portfolio/';
const BLOCKS = ['head', 'header', 'footer'];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const partials = Object.fromEntries(BLOCKS.map((name) =>
  [name, readFileSync(join(root, 'tools', 'partials', `${name}.html`), 'utf8').trimEnd()]));

const stale = [];
for (const file of readdirSync(root).filter((f) => f.endsWith('.html')).sort()) {
  const path = join(root, file);
  const src = readFileSync(path, 'utf8');
  let out = src;
  for (const name of BLOCKS) {
    const block = new RegExp(`<!-- @${name} -->[\\s\\S]*?<!-- /@${name} -->`);
    if (!block.test(out)) {
      console.error(`${file}: no <!-- @${name} --> block`);
      process.exit(2);
    }
    let body = partials[name].replaceAll('{{url}}', SITE + (file === 'index.html' ? '' : file));
    if (name === 'header') body = body.replace(`href="${file}"`, `href="${file}" aria-current="page"`);
    out = out.replace(block, () => `<!-- @${name} -->\n${body}\n<!-- /@${name} -->`);
  }
  if (out !== src) {
    stale.push(file);
    if (!check) writeFileSync(path, out);
  }
}

if (check && stale.length) {
  console.error(`Out of date: ${stale.join(', ')}. Run node tools/sync.mjs`);
  process.exit(1);
}
console.log(stale.length ? `${check ? 'Out of date' : 'Updated'}: ${stale.join(', ')}` : 'All pages up to date.');
