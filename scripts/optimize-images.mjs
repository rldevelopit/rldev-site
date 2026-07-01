// Image optimizer — resizes oversized raster images down to a sensible max
// width and re-encodes them with compression, in place. Only overwrites when
// the result is actually smaller, so it's safe to run repeatedly.
//
//   pnpm run optimize:images         # optimize in place
//   pnpm run optimize:images --dry   # report savings, write nothing

import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIRS = ['assets/projects', 'assets/img'];
const MAX_WIDTH = 1600;         // no displayed image needs more than this
const EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const DRY = process.argv.includes('--dry');

const kb = (n) => (n / 1024).toFixed(0) + ' KB';

async function optimizeFile(path) {
  const before = (await stat(path)).size;
  const img = sharp(path, { failOn: 'none' });
  const meta = await img.metadata();
  const ext = extname(path).toLowerCase();

  if (meta.width && meta.width > MAX_WIDTH) {
    img.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  if (ext === '.png') {
    img.png({ compressionLevel: 9, effort: 8, palette: true, quality: 82 });
  } else if (ext === '.jpg' || ext === '.jpeg') {
    img.jpeg({ quality: 80, mozjpeg: true });
  } else if (ext === '.webp') {
    img.webp({ quality: 82, effort: 6 });
  }

  const out = await img.toBuffer();
  if (out.length >= before) {
    console.log(`  skip  ${path}  (${kb(before)}, already optimal)`);
    return { before, after: before };
  }

  if (!DRY) await writeFile(path, out);
  const tag = DRY ? 'would save' : 'saved';
  console.log(`  ${DRY ? 'dry ' : 'done'}  ${path}  ${kb(before)} -> ${kb(out.length)}  (${tag} ${kb(before - out.length)})`);
  return { before, after: out.length };
}

async function run() {
  console.log(DRY ? 'Dry run — no files will be written.\n' : 'Optimizing images in place…\n');
  let total = { before: 0, after: 0, count: 0 };

  for (const dir of DIRS) {
    let entries;
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!EXTS.has(extname(name).toLowerCase())) continue;
      const path = join(dir, name);
      try {
        const r = await optimizeFile(path);
        total.before += r.before;
        total.after += r.after;
        total.count += 1;
      } catch (err) {
        console.warn(`  fail  ${path}  (${err.message})`);
      }
    }
  }

  const saved = total.before - total.after;
  console.log(
    `\n${total.count} images — ${kb(total.before)} -> ${kb(total.after)} ` +
    `(${DRY ? 'potential ' : ''}saving ${kb(saved)}, ${total.before ? ((saved / total.before) * 100).toFixed(0) : 0}%)`
  );
}

run().catch((e) => { console.error(e); process.exit(1); });
