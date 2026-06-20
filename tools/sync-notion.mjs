import 'dotenv/config';
import { Client } from '@notionhq/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import slugify from 'slugify';

const root = process.cwd();
const configPath = path.join(root, 'notion.config.yml');
const generatedPostsDir = path.join(root, 'source/_posts/notion');
const generatedImagesDir = path.join(root, 'source/images/notion');
const providedNotionId = 'be1e22c687994c7bbfeb6b787384015e';

const config = yaml.load(await fs.readFile(configPath, 'utf8'));
const token = process.env.NOTION_TOKEN;

if (!token) {
  throw new Error('Missing NOTION_TOKEN. Copy .env.example to .env locally, or add NOTION_TOKEN to GitHub Actions secrets.');
}

const notion = new Client({ auth: token });

function normalizeNotionId(id) {
  const raw = String(id || '').replace(/-/g, '').trim();
  if (!raw) return '';
  if (raw.length !== 32) return id;
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function configuredNotionId(kind) {
  if (kind === 'database') {
    return normalizeNotionId(process.env.NOTION_DATABASE_ID || config.notion?.database_id || providedNotionId);
  }
  return normalizeNotionId(process.env.NOTION_ROOT_PAGE_ID || config.notion?.root_page_id || '');
}

function pickProperty(properties, names) {
  for (const name of names || []) {
    if (properties?.[name]) return properties[name];
  }
  return undefined;
}

function richTextPlain(richText = []) {
  return richText.map(item => item.plain_text || '').join('');
}

function propertyValue(prop) {
  if (!prop) return undefined;
  switch (prop.type) {
    case 'title':
      return richTextPlain(prop.title);
    case 'rich_text':
      return richTextPlain(prop.rich_text);
    case 'select':
      return prop.select?.name;
    case 'status':
      return prop.status?.name;
    case 'multi_select':
      return prop.multi_select.map(item => item.name);
    case 'date':
      return prop.date?.start;
    case 'created_time':
      return prop.created_time;
    case 'last_edited_time':
      return prop.last_edited_time;
    case 'checkbox':
      return prop.checkbox;
    case 'number':
      return prop.number;
    case 'url':
      return prop.url;
    case 'email':
      return prop.email;
    case 'phone_number':
      return prop.phone_number;
    case 'formula':
      return propertyValue(prop.formula);
    default:
      return undefined;
  }
}

function fieldValue(page, fieldName) {
  const names = config.fields?.[fieldName] || [];
  return propertyValue(pickProperty(page.properties, names));
}

function normalizeLang(value) {
  const fallback = config.languages?.default || 'zh-cn';
  if (!value) return fallback;
  const aliases = config.languages?.aliases || {};
  const key = String(value).trim();
  return aliases[key] || aliases[key.toLowerCase()] || key.toLowerCase();
}

function cleanFrontmatter(value) {
  if (Array.isArray(value)) return value.filter(item => item !== undefined && item !== null && item !== '');
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined && item !== null && item !== '')
        .map(([key, item]) => [key, cleanFrontmatter(item)])
    );
  }
  return value;
}

function safeSlug(title, pageId) {
  const candidate = slugify(String(title || ''), { lower: true, strict: true, locale: 'en' });
  return candidate || String(pageId).replace(/-/g, '').slice(0, 12);
}

function markdownEscape(text) {
  return String(text || '').replace(/\|/g, '\\|');
}

function richTextMarkdown(richText = []) {
  return richText.map(item => {
    let text = item.plain_text || '';
    const href = item.href || item.text?.link?.url;
    const ann = item.annotations || {};
    if (ann.code) text = `\`${text.replace(/`/g, '\\`')}\``;
    if (ann.bold) text = `**${text}**`;
    if (ann.italic) text = `*${text}*`;
    if (ann.strikethrough) text = `~~${text}~~`;
    if (ann.underline) text = `<u>${text}</u>`;
    if (href) text = `[${text}](${href})`;
    return text;
  }).join('');
}

async function listChildren(blockId) {
  const blocks = [];
  let cursor;
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100
    });
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

async function downloadImage(url, pageId, index) {
  const pageDir = path.join(generatedImagesDir, String(pageId).replace(/-/g, ''));
  await fs.mkdir(pageDir, { recursive: true });

  let extension = '.png';
  try {
    const parsed = new URL(url);
    const parsedExtension = path.extname(parsed.pathname);
    if (parsedExtension && parsedExtension.length <= 6) extension = parsedExtension;
  } catch {
    // Keep default extension.
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image download failed: ${response.status} ${url}`);

  const type = response.headers.get('content-type') || '';
  if (type.includes('jpeg')) extension = '.jpg';
  if (type.includes('webp')) extension = '.webp';
  if (type.includes('gif')) extension = '.gif';
  if (type.includes('svg')) extension = '.svg';

  const filename = `${String(index).padStart(3, '0')}${extension}`;
  const diskPath = path.join(pageDir, filename);
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(diskPath, bytes);
  return `/images/notion/${String(pageId).replace(/-/g, '')}/${filename}`;
}

async function renderBlocks(blocks, context, depth = 0) {
  const lines = [];
  const indent = '  '.repeat(depth);

  for (const block of blocks) {
    const type = block.type;
    const value = block[type] || {};
    const text = richTextMarkdown(value.rich_text || []);
    const children = block.has_children ? await renderBlocks(await listChildren(block.id), context, depth + 1) : '';

    switch (type) {
      case 'paragraph':
        if (text) lines.push(`${text}\n`);
        if (children) lines.push(children);
        break;
      case 'heading_1':
        lines.push(`# ${text}\n`);
        break;
      case 'heading_2':
        lines.push(`## ${text}\n`);
        break;
      case 'heading_3':
        lines.push(`### ${text}\n`);
        break;
      case 'bulleted_list_item':
        lines.push(`${indent}- ${text}`);
        if (children) lines.push(children.trimEnd());
        break;
      case 'numbered_list_item':
        lines.push(`${indent}1. ${text}`);
        if (children) lines.push(children.trimEnd());
        break;
      case 'to_do':
        lines.push(`${indent}- [${value.checked ? 'x' : ' '}] ${text}`);
        if (children) lines.push(children.trimEnd());
        break;
      case 'quote':
        lines.push(`> ${text}\n`);
        if (children) lines.push(children);
        break;
      case 'callout': {
        const icon = value.icon?.emoji ? `${value.icon.emoji} ` : '';
        lines.push(`> ${icon}${text}\n`);
        if (children) lines.push(children);
        break;
      }
      case 'code': {
        const language = value.language || '';
        lines.push(`\`\`\`${language}\n${richTextPlain(value.rich_text || [])}\n\`\`\`\n`);
        break;
      }
      case 'image': {
        const url = value.type === 'external' ? value.external?.url : value.file?.url;
        const caption = markdownEscape(richTextPlain(value.caption || []));
        if (url) {
          context.imageIndex += 1;
          try {
            const localUrl = await downloadImage(url, context.pageId, context.imageIndex);
            lines.push(`![${caption}](${localUrl})\n`);
          } catch {
            lines.push(`![${caption}](${url})\n`);
          }
        }
        break;
      }
      case 'divider':
        lines.push('---\n');
        break;
      case 'bookmark':
      case 'embed':
      case 'link_preview': {
        const url = value.url;
        if (url) lines.push(`<${url}>\n`);
        break;
      }
      case 'equation':
        lines.push(`$$\n${value.expression || ''}\n$$\n`);
        break;
      case 'child_page':
        lines.push(`- ${value.title || 'Untitled child page'}\n`);
        break;
      case 'table':
        if (children) lines.push(children);
        break;
      case 'table_row': {
        const cells = (value.cells || []).map(cell => markdownEscape(richTextPlain(cell)));
        lines.push(`| ${cells.join(' | ')} |`);
        break;
      }
      default:
        if (text) lines.push(text);
        if (children) lines.push(children);
    }
  }

  return lines.join('\n').replace(/\n{4,}/g, '\n\n\n').trimEnd() + '\n';
}

async function databasePages(databaseId) {
  const pages = [];
  let cursor;
  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100
    });
    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return pages;
}

async function rootChildPages(rootPageId) {
  const children = await listChildren(rootPageId);
  const childPages = children.filter(block => block.type === 'child_page');
  return Promise.all(childPages.map(block => notion.pages.retrieve({ page_id: block.id })));
}

function isPublished(page) {
  const status = fieldValue(page, 'status');
  if (!status) return true;
  return (config.publish_statuses || []).includes(status);
}

async function collectPages() {
  const databaseId = configuredNotionId('database');
  const rootPageId = configuredNotionId('root');

  if (databaseId) {
    try {
      return await databasePages(databaseId);
    } catch (error) {
      if (!rootPageId) throw error;
      console.warn(`Database query failed, falling back to root page: ${error.message}`);
    }
  }

  if (!rootPageId) {
    throw new Error('Set NOTION_DATABASE_ID or NOTION_ROOT_PAGE_ID.');
  }
  return rootChildPages(rootPageId);
}

async function buildPost(page, usedSlugs) {
  const title = fieldValue(page, 'title') || page.child_page?.title || 'Untitled';
  const lang = normalizeLang(fieldValue(page, 'lang'));
  let slug = fieldValue(page, 'slug') || safeSlug(title, page.id);
  slug = safeSlug(slug, page.id);

  const slugKey = `${lang}/${slug}`;
  const duplicateCount = usedSlugs.get(slugKey) || 0;
  usedSlugs.set(slugKey, duplicateCount + 1);
  if (duplicateCount > 0) slug = `${slug}-${duplicateCount + 1}`;

  const date = fieldValue(page, 'date') || page.created_time;
  const updated = fieldValue(page, 'updated') || page.last_edited_time;
  const tags = fieldValue(page, 'tags') || [];
  const categories = fieldValue(page, 'categories') || [config.default_category || 'Notion'];
  const summary = fieldValue(page, 'summary');
  const translationGroup = fieldValue(page, 'translation_group') || slug;
  const blocks = await listChildren(page.id);
  const body = await renderBlocks(blocks, { pageId: page.id, imageIndex: 0 });

  return {
    pageId: page.id,
    lang,
    slug,
    translationGroup,
    frontmatter: cleanFrontmatter({
      title,
      date,
      updated,
      tags,
      categories,
      lang,
      translation_group: translationGroup,
      permalink: `${lang}/posts/${slug}/`,
      description: summary,
      notion_id: page.id
    }),
    body
  };
}

function withTranslations(posts) {
  const groups = new Map();
  for (const post of posts) {
    if (!groups.has(post.translationGroup)) groups.set(post.translationGroup, []);
    groups.get(post.translationGroup).push(post);
  }

  for (const group of groups.values()) {
    for (const post of group) {
      post.frontmatter.translations = group
        .filter(other => other !== post)
        .map(other => ({
          lang: other.lang,
          url: `/${other.lang}/posts/${other.slug}/`
        }));
    }
  }
}

async function writePost(post) {
  const dir = path.join(generatedPostsDir, post.lang);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${post.slug}.md`);
  const frontmatter = yaml.dump(post.frontmatter, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false
  });
  await fs.writeFile(file, `---\n${frontmatter}---\n\n${post.body}`, 'utf8');
  return file;
}

await fs.rm(generatedPostsDir, { recursive: true, force: true });
await fs.rm(generatedImagesDir, { recursive: true, force: true });
await fs.mkdir(generatedPostsDir, { recursive: true });
await fs.mkdir(generatedImagesDir, { recursive: true });

const pages = (await collectPages()).filter(isPublished);
const usedSlugs = new Map();
const posts = [];

for (const page of pages) {
  posts.push(await buildPost(page, usedSlugs));
}

withTranslations(posts);

for (const post of posts) {
  await writePost(post);
}

console.log(`Synced ${posts.length} Notion page(s) into ${path.relative(root, generatedPostsDir)}.`);

