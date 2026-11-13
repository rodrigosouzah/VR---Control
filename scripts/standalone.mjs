import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

// Package the production build for opening directly from disk without a server.
const directory = resolve('dist');
const assets = resolve(directory, 'assets');
let html = await readFile(resolve(directory, 'index.html'), 'utf8');
const script = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const stylesheet = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!script || !stylesheet) throw new Error('Expected production JavaScript and stylesheet were not found.');
let js = await readFile(resolve(directory, script[1].replace(/^\//, '')), 'utf8');
let css = await readFile(resolve(directory, stylesheet[1].replace(/^\//, '')), 'utf8');
for (const asset of await readdir(assets)) {
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[extname(asset)];
  if (!mime) continue;
  const url = `data:${mime};base64,${(await readFile(resolve(assets, asset))).toString('base64')}`;
  for (const prefix of ['./assets/', '/assets/']) {
    js = js.replaceAll(`${prefix}${asset}`, url);
    css = css.replaceAll(`${prefix}${asset}`, url);
  }
}
html = html.replace(script[0], () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(stylesheet[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
const output = resolve(directory, 'VR-Control.html');
await writeFile(output, html);
console.log(`Standalone app created: ${output}`);
