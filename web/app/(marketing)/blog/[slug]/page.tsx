import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import { getBlogPost, getBlogSlugs } from '@/lib/blog';
import { MarketingFooter } from '@/components/marketing/footer';
import {
  SITE_URL,
  absoluteUrl,
  createBreadcrumbSchema,
  createSeoMetadata,
  jsonLdScript,
} from '@/lib/seo';

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
    return createSeoMetadata({
      title: frontmatter.title,
      description: frontmatter.excerpt,
      path: `/blog/${slug}`,
      image: frontmatter.image,
      imageAlt: frontmatter.title,
      type: 'article',
      publishedTime: frontmatter.date,
      authors: [frontmatter.author],
      keywords: [
        frontmatter.category ?? 'DARE guide',
        'DARE blog',
        'skill challenge education',
      ],
    });
  } catch {
    return {
      title: 'Post not found',
      robots: { index: false, follow: false },
    };
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

  const canonical = absoluteUrl(`/blog/${slug}`);
  const image = absoluteUrl(post.frontmatter.image ?? '/og-image.png');

  const isDareTeam =
    !post.frontmatter.author ||
    post.frontmatter.author.toLowerCase().includes('dare');

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': ['Article', 'BlogPosting'],
    '@id': `${canonical}#article`,
    headline: post.frontmatter.title,
    description: post.frontmatter.excerpt,
    url: canonical,
    datePublished: post.frontmatter.date,
    dateModified: post.frontmatter.date,
    image: {
      '@type': 'ImageObject',
      url: image,
      width: 1200,
      height: 630,
    },
    articleSection: post.frontmatter.category ?? 'General',
    inLanguage: 'en-NG',
    author: isDareTeam
      ? {
          '@type': 'Organization',
          name: 'DARE',
          '@id': `${SITE_URL}/#organization`,
          url: SITE_URL,
        }
      : {
          '@type': 'Person',
          name: post.frontmatter.author,
        },
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
    isPartOf: {
      '@type': 'Blog',
      '@id': `${SITE_URL}/blog#blog`,
      name: 'DARE Blog',
      url: `${SITE_URL}/blog`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(articleSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(createBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.frontmatter.title, path: `/blog/${slug}` },
        ]))}
      />
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
