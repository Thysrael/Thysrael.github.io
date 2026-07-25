'use strict';

const fs = require('node:fs');
const path = require('node:path');
const MarkdownIt = require('markdown-it');
const markdownItKatex = require('@renbaoshuo/markdown-it-katex');
const katex = require('katex');

const postsDir = path.join(process.cwd(), 'source', '_posts');
const shouldFix = process.argv.includes('--fix');
const markdown = new MarkdownIt().use(markdownItKatex);

function markdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(filePath);
    return entry.isFile() && entry.name.endsWith('.md') ? [filePath] : [];
  });
}

function hasTopLevelLineBreak(tex) {
  let environmentDepth = 0;

  for (let index = 0; index < tex.length; index++) {
    if (tex[index] === '\\') {
      const environment = tex.slice(index).match(/^\\(begin|end)\s*\{[^}]+\}/);
      if (environment) {
        environmentDepth += environment[1] === 'begin' ? 1 : -1;
        environmentDepth = Math.max(0, environmentDepth);
        index += environment[0].length - 1;
        continue;
      }
    }
    if (environmentDepth === 0 && tex[index] === '\\' && tex[index + 1] === '\\') {
      return true;
    }
  }

  return false;
}

function nestedTokens(tokens) {
  return tokens.flatMap(token => token.children ? [token, ...nestedTokens(token.children)] : [token]);
}

let formulaCount = 0;
let fixedCount = 0;
const errors = [];

for (const filePath of markdownFiles(postsDir)) {
  let source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split('\n');
  const tokens = markdown.parse(source, {});
  const replacements = [];

  for (const token of nestedTokens(tokens)) {
    if (token.type === 'inline' && token.children) {
      for (const child of token.children) {
        if (child.type !== 'text' || !child.content.includes('$')) continue;

        const inlineDisplay = /\$\$([^$\n]*)\$\$/g;
        for (const match of child.content.matchAll(inlineDisplay)) {
          const line = token.map ? token.map[0] + 1 : null;
          errors.push(`${path.relative(process.cwd(), filePath)}${line ? `:${line}` : ''}: display delimiters used in inline text: $$${match[1]}$$`);
        }

        const possibleMath = /(^|[^\\$])\$(?!\$)([^$\n]+?)\$(?!\$)/g;
        for (const match of child.content.matchAll(possibleMath)) {
          const content = match[2];
          const hasTexSyntax = /\\[A-Za-z]+|[_^{}=<>]/.test(content);
          if (hasTexSyntax) {
            const line = token.map ? token.map[0] + 1 : null;
            errors.push(`${path.relative(process.cwd(), filePath)}${line ? `:${line}` : ''}: possible unparsed inline math: $${content}$`);
          }
        }
      }
    }

    if (token.type !== 'math_inline' && token.type !== 'math_block') continue;

    formulaCount++;
    const displayMode = token.type === 'math_block';
    const line = token.map ? token.map[0] + 1 : null;

    try {
      katex.renderToString(token.content, {
        displayMode,
        output: 'htmlAndMathml',
        strict: 'ignore',
        throwOnError: true
      });
    } catch (error) {
      errors.push(`${path.relative(process.cwd(), filePath)}${line ? `:${line}` : ''}: ${error.message}`);
      continue;
    }

    if (displayMode && token.map && hasTopLevelLineBreak(token.content)) {
      if (!shouldFix) {
        errors.push(`${path.relative(process.cwd(), filePath)}:${line}: display math uses \\\\ outside an environment`);
        continue;
      }

      const replacement = [
        '$$',
        '\\begin{aligned}',
        token.content.trim(),
        '\\end{aligned}',
        '$$'
      ].join('\n');
      replacements.push({ start: token.map[0], end: token.map[1], replacement });
    }
  }

  if (replacements.length > 0) {
    for (const item of replacements.reverse()) {
      lines.splice(item.start, item.end - item.start, item.replacement);
    }
    source = lines.join('\n');
    fs.writeFileSync(filePath, source);
    fixedCount += replacements.length;
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  console.error(`Checked ${formulaCount} formulas; found ${errors.length} errors.`);
  process.exitCode = 1;
} else {
  const fixed = shouldFix ? `; fixed ${fixedCount} display environments` : '';
  console.log(`Checked ${formulaCount} formulas${fixed}.`);
}
