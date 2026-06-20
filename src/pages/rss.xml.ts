import rss from '@astrojs/rss';
import { site } from '../data/site';
import { getPublishedPosts, postPath } from '../lib/content';

export async function GET(context: { site?: URL }) {
  const posts = await getPublishedPosts();

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? new URL(site.url),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postPath(post)
    }))
  });
}
