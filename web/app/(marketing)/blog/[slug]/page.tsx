import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import { getBlogPost, getBlogSlugs } from '@/lib/blog';
import { MarketingFooter } from '@/components/marketing/footer';

export async function generateStaticParams() {
  const slugs = await getBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { frontmatter } = await getBlogPost(slug);
    return {
      title: `${frontmatter.title} - DARE`,
      description: frontmatter.excerpt,
      openGraph: {
        title: `${frontmatter.title} - DARE`,
        description: frontmatter.excerpt,
        images: frontmatter.image
          ? [{ url: frontmatter.image }]
          : [{ url: '/og-image.png', width: 1200, height: 630 }],
      },
    };
  } catch {
    return { title: 'Post not found' };
  }
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let post: Awaited<ReturnType<typeof getBlogPost>>;
  let content: ReactNode;

  try {
    post = await getBlogPost(slug);
    const compiled = await compileMDX({ source: post.source });
    content = compiled.content;
  } catch {
    notFound();
  }

  return (
    <>
      <main className="min-h-screen bg-brand-bg pt-16">
        <div className="mx-auto max-w-3xl px-6 py-16">
          {post.frontmatter.image && (
            <div className="relative mb-10 h-64 w-full overflow-hidden rounded-xl">
              <Image
                src={post.frontmatter.image}
                alt={post.frontmatter.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="mb-6 flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="text-brand-primary">{post.frontmatter.category ?? 'General'}</span>
            <span>-</span>
            <span>{post.frontmatter.date}</span>
            <span>-</span>
            <span>{post.frontmatter.author}</span>
          </div>

          <h1 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
            {post.frontmatter.title}
          </h1>

          <article className="prose prose-invert mt-10 max-w-none">{content}</article>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
