import Link from 'next/link';
import Image from 'next/image';
import { getLatestBlogPosts } from '@/lib/blog';

export async function BlogPreviewSection() {
  const posts = await getLatestBlogPosts(3);

  if (posts.length === 0) return null;

  return (
    <section id="blog" className="bg-brand-surface px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
            From the blog
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block overflow-hidden rounded-xl border border-white/8 bg-brand-bg transition-colors hover:border-brand-primary/30"
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
                <div className="h-40 w-full bg-gradient-to-br from-brand-primary/20 to-brand-surface" />
              )}
              <div className="p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-xs text-brand-primary">
                    {post.category ?? 'General'}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{post.date}</span>
                </div>
                <h3 className="font-syne text-base font-extrabold text-foreground group-hover:text-brand-primary transition-colors">
                  {post.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {post.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="text-sm font-medium text-brand-primary hover:underline"
          >
            Read all posts →
          </Link>
        </div>
      </div>
    </section>
  );
}
