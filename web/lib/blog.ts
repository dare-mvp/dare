import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  category?: string;
  author?: string;
  source: string;
};

export type BlogPostMeta = Omit<BlogPost, 'source'>;

export async function getBlogSlugs(): Promise<string[]> {
  let files: string[];
  try {
    files = await fs.readdir(BLOG_DIR);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  return files
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''))
    .filter((s) => SLUG_PATTERN.test(s));
}

export async function getBlogPost(slug: string): Promise<BlogPost> {
  if (!SLUG_PATTERN.test(slug)) throw new Error('INVALID_SLUG');
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  const raw = await fs.readFile(filePath, 'utf8');
  const { data, content } = matter(raw);
  return {
    slug,
    title: String(data.title ?? slug),
    date: String(data.date ?? ''),
    excerpt: String(data.excerpt ?? ''),
    category: data.category ? String(data.category) : undefined,
    author: data.author ? String(data.author) : undefined,
    source: content,
  };
}

export async function getAllBlogPosts(): Promise<BlogPostMeta[]> {
  const slugs = await getBlogSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const post = await getBlogPost(slug);
      const { source: _source, ...meta } = post;
      return meta;
    }),
  );
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}
