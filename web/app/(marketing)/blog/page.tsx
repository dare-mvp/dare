import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog';
import { MarketingFooter } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Insights, updates, and stories from the DARE team.',
  openGraph: {
    title: 'Blog | DARE',
    description: 'Insights, updates, and stories from the DARE team.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default async function BlogListPage() {
  const posts = await getAllBlogPosts();

  return (
    <>
      <main className="min-h-screen bg-brand-bg pt-16">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h1 className="font-syne text-5xl font-extrabold text-foreground sm:text-6xl">Blog</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Insights, updates, and stories from the DARE team.
          </p>

          {posts.length === 0 ? (
            <p className="mt-12 text-muted-foreground">No posts yet. Check back soon.</p>
          ) : (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block rounded-xl border border-white/8 bg-brand-surface p-6 transition-colors hover:border-brand-primary/30"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="font-mono text-xs text-brand-primary">
                      {post.category ?? 'General'}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{post.date}</span>
                  </div>
                  <h2 className="font-syne text-lg font-extrabold text-foreground group-hover:text-brand-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                    {post.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
