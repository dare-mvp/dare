import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const SLUG_PATTERN = /^[a-z0-9-]+$/;

export type BlogFrontmatter = {
  title: string;
  date: string;
  excerpt: string;
  image?: string;
  author: string;
  category?: string;
};

export type BlogPostPreview = BlogFrontmatter & {
  slug: string;
};

function assertFrontmatter(data: Record<string, unknown>, slug: string): BlogFrontmatter {
  if (
    typeof data.title !== 'string' ||
    typeof data.date !== 'string' ||
    typeof data.excerpt !== 'string' ||
    typeof data.author !== 'string'
  ) {
    throw new Error(`Invalid blog frontmatter for ${slug}`);
  }

  return {
    title: data.title,
    date: data.date,
    excerpt: data.excerpt,
    author: data.author,
    image: typeof data.image === 'string' ? data.image : undefined,
    category: typeof data.category === 'string' ? data.category : undefined,
  };
}

export async function getBlogSlugs(): Promise<string[]> {
  let files: string[];
  try {
    files = await fs.readdir(BLOG_DIR);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  return files
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''))
    .filter((slug) => SLUG_PATTERN.test(slug));
}

export async function getBlogPost(slug: string): Promise<{
  slug: string;
  frontmatter: BlogFrontmatter;
  source: string;
}> {
  if (!SLUG_PATTERN.test(slug)) throw new Error('Invalid blog slug');
  const source = await fs.readFile(path.join(BLOG_DIR, `${slug}.mdx`), 'utf8');
  const parsed = matter(source);
  return {
    slug,
    frontmatter: assertFrontmatter(parsed.data, slug),
    source: parsed.content,
  };
}

export async function getAllBlogPosts(): Promise<BlogPostPreview[]> {
  const slugs = await getBlogSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const { frontmatter } = await getBlogPost(slug);
      return { slug, ...frontmatter };
    }),
  );
  return posts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export async function getLatestBlogPosts(limit = 3): Promise<BlogPostPreview[]> {
  return (await getAllBlogPosts()).slice(0, limit);
}
