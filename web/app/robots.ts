import type { MetadataRoute } from 'next';
import { SITE_URL, siteConfig } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/auth/',
          '/api/',
          '/_next/data/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: siteConfig.domain,
  };
}
