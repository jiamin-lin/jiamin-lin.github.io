import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../data/site';

export type BlogPost = CollectionEntry<'blog'>;

export function postSlug(post: BlogPost) {
  return post.id.replace(/\.(md|mdx)$/, '').replace(/\/index$/, '');
}

export function postPath(post: BlogPost, localized = false) {
  const slug = postSlug(post);
  return localized ? `/${post.data.lang}/blog/${slug}/` : `/blog/${slug}/`;
}

export function tagSlug(tag: string) {
  return encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'));
}

export function formatDate(date: Date, lang: Lang | 'en' = 'en') {
  return new Intl.DateTimeFormat(lang === 'zh-cn' ? 'zh-CN' : lang, {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date);
}

export async function getPublishedPosts(lang?: Lang) {
  const posts = await getCollection('blog', ({ data }) => {
    return !data.draft && (!lang || data.lang === lang);
  });

  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getTags() {
  const posts = await getPublishedPosts();
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, slug: tagSlug(name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
