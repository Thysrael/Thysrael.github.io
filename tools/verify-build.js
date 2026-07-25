'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');
const sourceRoot = path.join(root, 'source');
const maxSiteBytes = 750 * 1024 * 1024;
const ignoredLocalPrefixes = ['/obsidian-quartz/'];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : file;
  });
}

function localTarget(rawUrl, document) {
  if (!rawUrl || /^(?:[a-z]+:|\/\/|#)/i.test(rawUrl)) return null;
  const cleanUrl = rawUrl.replaceAll('&amp;', '&').split(/[?#]/, 1)[0];
  if (!cleanUrl || ignoredLocalPrefixes.some(prefix => cleanUrl.startsWith(prefix))) {
    return null;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(cleanUrl);
  } catch {
    decoded = cleanUrl;
  }
  const target = decoded.startsWith('/')
    ? path.join(publicRoot, decoded)
    : path.resolve(path.dirname(document), decoded);
  if (!target.startsWith(publicRoot)) return null;
  return target;
}

function targetExists(target) {
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return true;
  return fs.existsSync(path.join(target, 'index.html'));
}

if (!fs.existsSync(path.join(publicRoot, 'index.html'))) {
  throw new Error('public/index.html is missing. Run npm run build first.');
}

const publicFiles = walk(publicRoot);
const symlinks = publicFiles.filter(file => fs.lstatSync(file).isSymbolicLink());
if (symlinks.length) {
  throw new Error(`Pages artifacts cannot contain symlinks: ${symlinks[0]}`);
}

const missing = [];
for (const htmlFile of publicFiles.filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const urls = [...html.matchAll(/(?:href|src|data-src)=["']([^"']+)["']/g)]
    .map(match => match[1]);
  for (const url of urls) {
    const target = localTarget(url, htmlFile);
    if (target && !targetExists(target)) {
      missing.push(`${path.relative(publicRoot, htmlFile)} -> ${url}`);
    }
  }
}

if (missing.length) {
  console.error(`Found ${missing.length} missing local references:`);
  missing.slice(0, 50).forEach(item => {
    console.error(`  ${item}`);
  });
  process.exitCode = 1;
}

const remainingImages = walk(sourceRoot).filter(file =>
  /\.(?:png|jpe?g)$/i.test(file) && !/^favicon-.*\.png$/i.test(path.basename(file)));
if (remainingImages.length) {
  console.error(`Found ${remainingImages.length} unoptimized source images.`);
  remainingImages.slice(0, 20).forEach(file => {
    console.error(`  ${path.relative(root, file)}`);
  });
  process.exitCode = 1;
}

const siteBytes = publicFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
if (siteBytes > maxSiteBytes) {
  console.error(
    `Generated site is ${(siteBytes / 1048576).toFixed(1)} MiB; ` +
    `the project budget is ${maxSiteBytes / 1048576} MiB.`
  );
  process.exitCode = 1;
}

const postCount = publicFiles.filter(file =>
  /^posts[/\\][^/\\]+[/\\]index\.html$/.test(path.relative(publicRoot, file))).length;
if (postCount < 200) {
  console.error(`Expected at least 200 generated posts, found ${postCount}.`);
  process.exitCode = 1;
}

const linksHtml = fs.readFileSync(path.join(publicRoot, 'links', 'index.html'), 'utf8');
const friendCount = (linksHtml.match(/class="friend-card"/g) || []).length;
if (friendCount !== 16) {
  console.error(`Expected 16 friend cards, found ${friendCount}.`);
  process.exitCode = 1;
}

console.log(
  `Verified ${publicFiles.length} files, ${postCount} posts, ${friendCount} friend links, ` +
  `${(siteBytes / 1048576).toFixed(1)} MiB total.`
);
