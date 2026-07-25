'use strict';

const imageAttribute = /(<img\b[^>]*?\s(?:src|data-src)=["'])([^"']+)(["'][^>]*>)/gi;

function assetUrl(url, postPath) {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(url) || url.startsWith('/images/')) return url;
  if (url.startsWith(postPath)) return url;

  const normalized = url.replace(/\\|%5C/gi, '/');
  const parts = normalized.split('/').filter(part => part && part !== '.');
  if (parts.length > 1) parts.shift();
  return `${postPath}${parts.join('/')}`;
}

hexo.extend.filter.register('after_post_render', data => {
  if (!data.permalink) return data;
  const postPath = new URL(data.permalink).pathname.replace(/index\.html$/, 'index/');

  for (const key of ['content', 'excerpt', 'more']) {
    if (!data[key]) continue;
    data[key] = data[key].replace(imageAttribute, (match, before, url, after) =>
      `${before}${assetUrl(url, postPath)}${after}`);
  }
  return data;
});
