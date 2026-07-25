import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fromMarkdown } from 'mdast-util-from-markdown';
import pangu from 'pangu';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'source');
const markdownPattern = /\.md$/i;
const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const protectedPattern = /(\$\$[\s\S]*?\$\$|(?<!\\)\$(?:\\.|[^$\n])+(?<!\\)\$|\\\[[\s\S]*?\\\]|\\\((?:\\.|[^\n])*?\\\)|\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}|https?:\/\/[^\s<>"')\]]+|\*+|~{2,})/g;

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : file;
  }));
  return files.flat();
}

function stagedMarkdown() {
  const output = execFileSync('git', [
    'diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'
  ], { cwd: root });

  return output.toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map(file => path.join(root, file))
    .filter(file => file.startsWith(sourceRoot + path.sep) && markdownPattern.test(file));
}

function firstCharacter(value) {
  return Array.from(value)[0] || '';
}

function lastCharacter(value) {
  return Array.from(value).at(-1) || '';
}

function needsPanguSpace(left, right) {
  if (!left || !right || /\s/u.test(left) || /\s/u.test(right)) return false;
  return pangu.spacingText(left + right) !== left + right;
}

function repairMarkdownMarkers(text) {
  const markers = [...text.matchAll(/(?<!\\)(\*{2,}|~{2,})/g)];
  const removals = [];

  for (const marker of markers) {
    const isJoinedDelimiter = marker[0].length >= 4;
    const peers = markers.filter(candidate => candidate[0] === marker[0]);
    const index = peers.indexOf(marker);
    if (!isJoinedDelimiter && peers.length % 2 !== 0) continue;

    if (isJoinedDelimiter || index % 2 === 0) {
      const whitespace = text.slice(marker.index + marker[0].length).match(/^[\t ]+/)?.[0];
      if (whitespace) {
        removals.push({
          start: marker.index + marker[0].length,
          end: marker.index + marker[0].length + whitespace.length
        });
      }
    }
    if (isJoinedDelimiter || index % 2 === 1) {
      const whitespace = text.slice(0, marker.index).match(/[\t ]+$/)?.[0];
      if (whitespace) {
        removals.push({ start: marker.index - whitespace.length, end: marker.index });
      }
    }
  }

  return applyReplacements(text, removals
    .map(removal => ({ ...removal, value: '' }))
    .sort((left, right) => right.start - left.start));
}

function spacingText(text) {
  text = repairMarkdownMarkers(text);
  const parts = [];
  let cursor = 0;

  for (const match of text.matchAll(protectedPattern)) {
    if (match.index > cursor) {
      parts.push({ protected: false, value: pangu.spacingText(text.slice(cursor, match.index)) });
    }
    parts.push({ protected: true, value: match[0] });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    parts.push({ protected: false, value: pangu.spacingText(text.slice(cursor)) });
  }
  if (!parts.length) return pangu.spacingText(text);

  let result = parts[0].value;
  for (let index = 1; index < parts.length; index++) {
    const previous = parts[index - 1];
    const current = parts[index];
    const left = lastCharacter(previous.value);
    const right = firstCharacter(current.value);
    const markdownBoundary = /^(?:\*+|~{2,})$/.test(previous.value) ||
      /^(?:\*+|~{2,})$/.test(current.value);
    if (!markdownBoundary && (previous.protected || current.protected) &&
        (cjkPattern.test(left) || cjkPattern.test(right)) &&
        !/\s/u.test(left) && !/\s/u.test(right)) {
      result += ' ';
    }
    result += current.value;
  }
  return result;
}

function visibleBoundary(node, side) {
  if (node.type === 'text' || node.type === 'inlineCode') {
    return side === 'start' ? firstCharacter(node.value) : lastCharacter(node.value);
  }
  if (!node.children?.length || ['image', 'html', 'break'].includes(node.type)) return '';

  const children = side === 'start' ? node.children : [...node.children].reverse();
  for (const child of children) {
    const boundary = visibleBoundary(child, side);
    if (boundary) return boundary;
  }
  return '';
}

function bodyReplacements(markdown) {
  const tree = fromMarkdown(markdown);
  const replacements = [];
  const insertions = new Set();

  function visit(node) {
    if (node.type === 'text' && node.position) {
      const start = node.position.start.offset;
      const end = node.position.end.offset;
      const original = markdown.slice(start, end);
      const formatted = spacingText(original);
      if (formatted !== original) replacements.push({ start, end, value: formatted });
    }

    if (node.children) {
      for (let index = 1; index < node.children.length; index++) {
        const leftNode = node.children[index - 1];
        const rightNode = node.children[index];
        const left = visibleBoundary(leftNode, 'end');
        const right = visibleBoundary(rightNode, 'start');
        const offset = leftNode.position?.end.offset;
        if (offset !== undefined && needsPanguSpace(left, right) &&
            !/\s/u.test(markdown[offset - 1] || '') &&
            !/\s/u.test(markdown[offset] || '')) {
          insertions.add(offset);
        }
      }
      node.children.forEach(visit);
    }
  }
  visit(tree);

  for (const offset of insertions) {
    replacements.push({ start: offset, end: offset, value: ' ' });
  }
  replacements.sort((left, right) => right.start - left.start || right.end - left.end);
  return replacements;
}

function applyReplacements(content, replacements) {
  let result = content;
  for (const replacement of replacements) {
    result = result.slice(0, replacement.start) + replacement.value + result.slice(replacement.end);
  }
  return result;
}

function formatFrontMatter(frontMatter) {
  return frontMatter.replace(/^(\s*title:\s*)(.+)$/mu, (line, prefix, title) => {
    return prefix + spacingText(title);
  });
}

export function formatMarkdown(content) {
  const frontMatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  const frontMatter = frontMatterMatch?.[0] || '';
  const body = content.slice(frontMatter.length);
  const formattedBody = applyReplacements(body, bodyReplacements(body));
  return formatFrontMatter(frontMatter) + formattedBody;
}

async function main() {
  const mode = process.argv[2] || '--all';
  if (!['--all', '--staged', '--check'].includes(mode)) {
    throw new Error('Usage: node tools/format-spacing.mjs [--all|--staged|--check]');
  }

  const files = mode === '--staged'
    ? stagedMarkdown()
    : (await walk(sourceRoot)).filter(file => markdownPattern.test(file));
  const changed = [];

  for (const file of files.sort()) {
    const content = await fs.readFile(file, 'utf8');
    const formatted = formatMarkdown(content);
    if (formatted === content) continue;
    changed.push(file);
    if (mode !== '--check') await fs.writeFile(file, formatted);
  }

  if (mode === '--staged' && changed.length) {
    execFileSync('git', ['add', '--', ...changed.map(file => path.relative(root, file))], { cwd: root });
  }
  if (mode === '--check' && changed.length) {
    console.error(`Found ${changed.length} Markdown files with inconsistent CJK spacing.`);
    changed.slice(0, 20).forEach(file => {
      console.error(`  ${path.relative(root, file)}`);
    });
    process.exitCode = 1;
    return;
  }
  console.log(`${mode === '--check' ? 'Checked' : 'Formatted'} ${files.length} Markdown files; ${changed.length} changed.`);
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
