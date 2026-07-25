'use strict';

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

hexo.extend.tag.register('friends', () => {
  const friends = hexo.locals.get('data').friends || [];
  const cards = friends.map(friend => `
    <article class="friend-card">
      <img class="friend-avatar" src="${escapeHtml(friend.avatar)}" alt="" loading="lazy">
      <div class="friend-details">
        <a href="${escapeHtml(friend.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(friend.name)}</a>
        <p>${escapeHtml(friend.introduction)}</p>
      </div>
    </article>`).join('');

  return `<div class="friend-grid">${cards}</div>`;
});
