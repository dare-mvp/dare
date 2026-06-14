import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.title,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#050509',
    theme_color: '#FF5500',
    categories: ['games', 'sports', 'finance', 'social'],
    lang: 'en-NG',
    orientation: 'portrait',
    icons: [
      {
        src: '/brand/dare-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/dare-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/dare-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/brand/dare-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/brand/dare-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
