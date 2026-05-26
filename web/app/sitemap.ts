import type { MetadataRoute } from 'next';
import { getAllBlogPosts } from '@/lib/blog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllBlogPosts();

  return [
    { url: 'https://dareapp.com', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://dareapp.com/trust-safety', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://dareapp.com/faq', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://dareapp.com/blog', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    ...posts.map((post) => ({
      url: `https://dareapp.com/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
