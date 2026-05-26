import type { Metadata } from 'next';
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
    const post = await getBlogPost(slug);
    return {
      title: post.title,
      description: post.excerpt,
      openGraph: {
        title: `${post.title} | DARE Blog`,
        description: post.excerpt,
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
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

  try {
    const post = await getBlogPost(slug);
    const { content } = await compileMDX({ source: post.source });

    return (
      <>
        <main className="min-h-screen bg-brand-bg pt-16">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <div className="mb-4 flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="text-brand-primary">{post.category ?? 'General'}</span>
              <span>·</span>
              <span>{post.date}</span>
              {post.author && (
                <>
                  <span>·</span>
                  <span>{post.author}</span>
                </>
              )}
            </div>
            <h1 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
              {post.title}
            </h1>
            <article className="prose prose-invert mt-10 max-w-none">{content}</article>
          </div>
        </main>
        <MarketingFooter />
      </>
    );
  } catch {
    notFound();
  }
}
