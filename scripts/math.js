'use strict';

hexo.extend.filter.register('after_post_render', data => {
  data.mathjax = /class="katex(?:-display)?"/.test(data.content || '');
  return data;
});
