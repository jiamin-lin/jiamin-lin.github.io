# Drzone Cloud Field Notes

Astro static site for a cloud architecture blog and field notebook.

## Stack

- Astro 6
- MDX
- Content collections
- RSS and sitemap
- GitHub Pages through GitHub Actions
- Prepared routes for `zh-cn`, `en`, and `ja`

## Local Development

```bash
npm ci
npm run dev
```

Open <http://localhost:4000>.

## Content

Add posts in `src/content/blog` as `.md` or `.mdx`.

Required frontmatter:

```yaml
title: "Post title"
description: "Short summary"
pubDate: 2026-06-20
lang: en
tags:
  - aws
  - architecture
```

Supported languages:

- `zh-cn`
- `en`
- `ja`

## Deploy

Push to `main`. GitHub Actions builds Astro and deploys `dist/` to GitHub Pages.
