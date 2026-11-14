import { writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

// Bundle the main app without shared multipage chunks; preserve the Pages build.
const result = await build({ configFile: false, base: './', plugins: [react()], build: { write: false, rollupOptions: { input: 'index.html', output: { inlineDynamicImports: true } } } });
const files = result.output;
let html = String(files.find(file => file.fileName === 'index.html').source);
const script = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const stylesheet = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!script || !stylesheet) throw new Error('Expected production JavaScript and stylesheet were not found.');
const filename = url => url.replace(/^\.?\//, '');
let js = files.find(file => file.fileName === filename(script[1])).code;
let css = String(files.find(file => file.fileName === filename(stylesheet[1])).source);
for (const asset of files.filter(file => file.type === 'asset')) {
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[extname(asset.fileName)];
  if (!mime) continue;
  const url = `data:${mime};base64,${Buffer.from(asset.source).toString('base64')}`;
  for (const prefix of ['./', '/']) {
    js = js.replaceAll(`${prefix}${asset.fileName}`, url);
    css = css.replaceAll(`${prefix}${asset.fileName}`, url);
  }
}
html = html.replace(script[0], () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(stylesheet[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
const output = resolve('dist/VR-Control.html');
await writeFile(output, html);
console.log(`Standalone app created: ${output}`);
