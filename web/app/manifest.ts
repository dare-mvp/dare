import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DARE',
    short_name: 'DARE',
    description:
      'DARE is a hyper-local platform for user-authored Skill-Based DAREs and Task-Based rewards.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#050509',
    theme_color: '#FF5500',
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
