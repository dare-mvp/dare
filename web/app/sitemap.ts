import type { MetadataRoute } from 'next';
import { getAllBlogPosts } from '@/lib/blog';
import { DEFAULT_OG_IMAGE, absoluteUrl, publicRoutes, sitemapEntry } from '@/lib/seo';

const now = new Date();
const defaultImage = absoluteUrl(DEFAULT_OG_IMAGE);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllBlogPosts();

  return [
    sitemapEntry(publicRoutes.home, {
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
      images: [defaultImage],
    }),
    sitemapEntry(publicRoutes.challenge, {
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
      images: [defaultImage],
    }),
    sitemapEntry(publicRoutes.faq, {
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
      images: [defaultImage],
    }),
    sitemapEntry(publicRoutes.trustSafety, {
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
      images: [defaultImage],
    }),
    sitemapEntry(publicRoutes.blog, {
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
      images: [defaultImage],
    }),
    ...posts.map((post) =>
      sitemapEntry(`/blog/${post.slug}`, {
        lastModified: new Date(post.date),
        changeFrequency: 'monthly',
        priority: 0.6,
        images: [absoluteUrl(post.image ?? DEFAULT_OG_IMAGE)],
      }),
    ),
  ];
}
