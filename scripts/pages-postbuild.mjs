// GitHub Pages has no server to fall back to the SPA shell for unknown paths
// (ТЗ §7.2): it serves 404.html instead, so the shell goes there as well as
// to index.html, and .nojekyll keeps Pages from dropping `_`-prefixed files.
import { copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = join(import.meta.dirname, '..', 'dist', 'client')
copyFileSync(join(out, '_shell.html'), join(out, 'index.html'))
copyFileSync(join(out, '_shell.html'), join(out, '404.html'))
writeFileSync(join(out, '.nojekyll'), '')
console.log(
  'GitHub Pages: index.html, 404.html, .nojekyll written to dist/client',
)
