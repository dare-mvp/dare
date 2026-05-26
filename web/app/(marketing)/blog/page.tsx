import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getAllBlogPosts } from '@/lib/blog';
import { MarketingFooter } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'Blog — DARE',
  description: 'Updates, guides, and community stories from DARE.',
  openGraph: {
    title: 'Blog — DARE',
    description: 'Updates, guides, and community stories from DARE.',
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
            Updates, guides, and community stories from DARE.
          </p>

          {posts.length === 0 ? (
            <p className="mt-12 text-muted-foreground">No posts yet. Check back soon.</p>
          ) : (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block overflow-hidden rounded-xl border border-white/8 bg-brand-surface transition-colors hover:border-brand-primary/30"
                >
                  {post.image ? (
                    <div className="relative h-40 w-full overflow-hidden">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="h-40 w-full bg-gradient-to-br from-brand-primary/20 to-brand-bg" />
                  )}
                  <div className="p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-mono text-xs text-brand-primary">
                        {post.category ?? 'General'}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{post.date}</span>
                    </div>
                    <h2 className="font-syne text-base font-extrabold text-foreground group-hover:text-brand-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                      {post.excerpt}
                    </p>
                  </div>
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
