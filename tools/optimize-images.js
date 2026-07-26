'use strict';

const fs = require('fs/promises');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'source');
const imagePattern = /\.(?:png|jpe?g)$/i;
const textPattern = /\.(?:md|markdown|html?|njk|styl|ya?ml|org)$/i;
const faviconPattern = /^favicon-.*\.png$/i;

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : file;
  }));
  return files.flat();
}

function stagedImages() {
  const output = execFileSync('git', [
    'diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'
  ], { cwd: root });

  return output.toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map(file => path.join(root, file))
    .filter(file => file.startsWith(sourceRoot + path.sep) && imagePattern.test(file));
}

function shouldConvert(file) {
  return imagePattern.test(file) && !faviconPattern.test(path.basename(file));
}

async function convertImage(file, output) {
  const extension = path.extname(file).toLowerCase();

  const before = (await fs.stat(file)).size;
  const pipeline = sharp(file, { animated: true, failOn: 'warning' }).rotate();
  if (extension === '.png') {
    pipeline.webp({ lossless: true, effort: 6 });
  } else {
    pipeline.keepIccProfile().webp({
      quality: 95,
      effort: 6,
      smartSubsample: true
    });
  }
  await pipeline.toFile(output);

  const metadata = await sharp(output, { animated: true }).metadata();
  if (!metadata.width || !metadata.height) {
    await fs.rm(output);
    throw new Error(`Invalid WebP output: ${path.relative(root, output)}`);
  }

  const after = (await fs.stat(output)).size;
  await fs.rm(file);
  return { file, output, before, after };
}

function replaceLocalFilename(content, oldName, newName) {
  let cursor = 0;
  let result = '';
  while (true) {
    const index = content.indexOf(oldName, cursor);
    if (index === -1) return result + content.slice(cursor);

    const boundary = Math.max(
      content.lastIndexOf('\n', index),
      content.lastIndexOf('(', index),
      content.lastIndexOf('"', index),
      content.lastIndexOf("'", index),
      content.lastIndexOf('<', index),
      content.lastIndexOf(' ', index)
    );
    const prefix = content.slice(boundary + 1, index);
    result += content.slice(cursor, index);
    result += prefix.includes('://') ? oldName : newName;
    cursor = index + oldName.length;
  }
}

async function updateReferences(conversions) {
  const sourceImages = conversions.filter(item =>
    path.dirname(item.file) === path.join(sourceRoot, 'images'));
  const textFiles = (await walk(sourceRoot)).filter(file => textPattern.test(file));
  textFiles.push(path.join(root, '_config.yml'), path.join(root, '_config.next.yml'));

  const changed = [];
  for (const textFile of textFiles) {
    let content = await fs.readFile(textFile, 'utf8');
    const original = content;
    const extension = path.extname(textFile);
    const assetDirectory = textFile.slice(0, -extension.length);

    for (const item of sourceImages) {
      const oldName = path.basename(item.file);
      const newName = path.basename(item.output);
      content = content.split(`/images/${oldName}`).join(`/images/${newName}`);
    }

    for (const item of conversions) {
      if (path.dirname(item.file) !== assetDirectory) continue;
      content = replaceLocalFilename(
        content,
        path.basename(item.file),
        path.basename(item.output)
      );
    }

    if (content !== original) {
      await fs.writeFile(textFile, content);
      changed.push(textFile);
    }
  }
  return changed;
}

async function runPool(tasks, concurrency) {
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const task = tasks[cursor++];
      const result = await convertImage(task.file, task.output);
      if (result) results.push(result);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function main() {
  const mode = process.argv[2] || '--staged';
  if (!['--all', '--staged'].includes(mode)) {
    throw new Error('Usage: node scripts/optimize-images.js [--all|--staged]');
  }

  const candidates = mode === '--all'
    ? (await walk(sourceRoot)).filter(shouldConvert)
    : stagedImages().filter(shouldConvert);
  if (!candidates.length) {
    console.log('No PNG or JPEG images to optimize.');
    return;
  }

  const baseTargets = new Map();
  for (const file of candidates) {
    const output = file.replace(imagePattern, '.webp');
    const group = baseTargets.get(output) || [];
    group.push(file);
    baseTargets.set(output, group);
  }

  const tasks = [];
  for (const [baseOutput, files] of baseTargets) {
    let baseExists = false;
    try {
      await fs.access(baseOutput);
      baseExists = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    for (const file of files) {
      tasks.push({
        file,
        output: files.length > 1 || baseExists ? `${file}.webp` : baseOutput
      });
    }
  }
  for (const { output } of tasks) {
    try {
      await fs.access(output);
      throw new Error(`Target already exists: ${path.relative(root, output)}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  console.log(`Optimizing ${candidates.length} images...`);
  const conversions = await runPool(tasks, 4);
  const changedReferences = await updateReferences(conversions);

  if (mode === '--staged') {
    const paths = conversions.flatMap(item => [item.file, item.output])
      .concat(changedReferences)
      .map(file => path.relative(root, file));
    execFileSync('git', ['add', '-A', '--', ...paths], { cwd: root });
  }

  const before = conversions.reduce((sum, item) => sum + item.before, 0);
  const after = conversions.reduce((sum, item) => sum + item.after, 0);
  const saved = before - after;
  console.log(
    `Converted ${conversions.length} images: ` +
    `${(before / 1048576).toFixed(1)} MiB -> ${(after / 1048576).toFixed(1)} MiB ` +
    `(${(saved / before * 100).toFixed(1)}% smaller).`
  );
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
