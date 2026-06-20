'use strict';

const pagination = require('hexo-pagination');

function postLang(post, fallback) {
  return String(post.lang || fallback || '').toLowerCase();
}

hexo.extend.generator.register('i18n_index', function(locals) {
  const cfg = hexo.config.i18n || {};
  const defaultLang = cfg.default || 'zh-cn';
  const languages = Array.isArray(cfg.languages) ? cfg.languages : [];
  const perPage = Number(cfg.per_page || hexo.config.index_generator.per_page || 10);
  const posts = locals.posts
    .filter(post => !post.hidden)
    .sort('-date');

  return languages.flatMap(language => {
    const lang = String(language.code || '').toLowerCase();
    if (!lang) return [];

    const filtered = posts.filter(post => postLang(post, defaultLang) === lang);
    return pagination(`${lang}/`, filtered, {
      perPage,
      layout: ['index', 'archive'],
      data: {
        lang,
        title: language.name || lang
      }
    });
  });
});

