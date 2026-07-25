import assert from 'node:assert/strict';
import test from 'node:test';

import { formatMarkdown } from './format-spacing.mjs';

test('formats visible Markdown text and the title only', () => {
  const input = `---
title: 中文API与Markdown
tags: [中文API]
---

正文使用API和2个参数。
`;
  const expected = `---
title: 中文 API 与 Markdown
tags: [中文API]
---

正文使用 API 和 2 个参数。
`;
  assert.equal(formatMarkdown(input), expected);
});

test('preserves Markdown structures and technical content', () => {
  const input = `中文使用\`const变量 = 1\`处理API。

中文[API](https://example.com/中文API)链接。

<span data-name="中文API">中文HTML</span>

{% note 中文API %}

行内公式$x_i=中文API$之后和显示公式$$O(n)=中文API$$结束。

\`\`\`cpp
const char* 中文API = "不修改English";
\`\`\`
`;
  const expected = `中文使用 \`const变量 = 1\` 处理 API。

中文 [API](https://example.com/中文API) 链接。

<span data-name="中文API">中文 HTML</span>

{% note 中文API %}

行内公式 $x_i=中文API$ 之后和显示公式 $$O(n)=中文API$$ 结束。

\`\`\`cpp
const char* 中文API = "不修改English";
\`\`\`
`;
  assert.equal(formatMarkdown(input), expected);
});

test('is idempotent', () => {
  const input = '中文 **API** 与 $O(n)$ 已经留白。\n';
  assert.equal(formatMarkdown(formatMarkdown(input)), formatMarkdown(input));
});

test('repairs spacing inside legacy emphasis markers', () => {
  const input = '保留 ** 外部API ** 空格，并修复**连续 **** 强调**。\n';
  const expected = '保留 **外部 API** 空格，并修复**连续****强调**。\n';
  assert.equal(formatMarkdown(input), expected);
});
