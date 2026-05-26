import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog';

export async function BlogPreviewSection() {
  const posts = await getAllBlogPosts();
  const preview = posts.slice(0, 3);

  if (preview.length === 0) return null;

  return (
    <section id="blog" className="bg-brand-surface px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 flex items-end justify-between">
          <h2 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
            From the blog
          </h2>
          <Link href="/blog" className="text-sm text-brand-primary hover:underline">
            View all
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-xl border border-white/8 bg-brand-bg p-6 transition-colors hover:border-brand-primary/30"
            >
              <div className="mb-3 flex items-center gap-2">
                {post.category && (
                  <span className="font-mono text-xs text-brand-primary">
                    {post.category}
                  </span>
                )}
                <span className="font-mono text-xs text-muted-foreground">{post.date}</span>
              </div>
              <h3 className="font-syne text-lg font-extrabold text-foreground group-hover:text-brand-primary transition-colors">
                {post.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {post.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
