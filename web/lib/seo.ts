import type { Metadata, MetadataRoute } from 'next';

export const SITE_URL = 'https://daregamesapp.com';
export const SITE_NAME = 'DARE';
export const DEFAULT_OG_IMAGE = '/og-image.png';
export const DEFAULT_OG_ALT = 'DARE - Skill Challenges and Task Rewards';

export const siteConfig = {
  name: SITE_NAME,
  url: SITE_URL,
  domain: 'daregamesapp.com',
  locale: 'en_NG',
  title: 'DARE - Skill Challenges and Task Rewards in Nigeria',
  description:
    "DARE is Nigeria's skill-based challenge platform. Dare your friends, complete tasks, and earn real money paid directly to your wallet.",
  shortDescription:
    'Create skill challenges and task rewards with escrow-backed, proof-led settlement.',
  socials: {
    instagram: 'https://www.instagram.com/dareappofficial',
    youtube: 'https://www.youtube.com/@iDareUChallenge',
  },
  supportEmail: 'info@daregamesapp.com',
} as const;

export const defaultKeywords = [
  'DARE app',
  'skill challenge app Nigeria',
  'task reward app Nigeria',
  'peer to peer challenges',
  'escrow challenges',
  'challenge friends for money',
  'skill based games Nigeria',
  'DARE wallet',
  'DARE jury',
  'Live Court challenges',
];

export const publicRoutes = {
  home: '/',
  challenge: '/challenge',
  faq: '/faq',
  trustSafety: '/trust-safety',
  blog: '/blog',
} as const;

export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized === '/' ? '' : normalized}`;
}

export function defaultRobots(): Metadata['robots'] {
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}

export function noIndexRobots(): Metadata['robots'] {
  return {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  };
}

type SeoMetadataInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  imageAlt?: string;
  keywords?: string[];
  type?: 'article' | 'website';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  noIndex?: boolean;
};

export function createSeoMetadata({
  title,
  description,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  imageAlt = DEFAULT_OG_ALT,
  keywords = [],
  type = 'website',
  publishedTime,
  modifiedTime,
  authors,
  noIndex = false,
}: SeoMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        'en-NG': url,
        'x-default': url,
      },
    },
    keywords: [...defaultKeywords, ...keywords],
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: 'technology',
    robots: noIndex ? noIndexRobots() : defaultRobots(),
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: imageAlt }],
      locale: siteConfig.locale,
      type,
      ...(type === 'article'
        ? {
            publishedTime,
            modifiedTime,
            authors: authors ?? [SITE_NAME],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      site: '@dareappofficial',
      creator: '@dareappofficial',
    },
  };
}

export function jsonLdScript(data: unknown): { __html: string } {
  return {
    __html: JSON.stringify(data).replace(/</g, '\\u003c'),
  };
}

export function createOrganizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/icon.svg'),
    },
    sameAs: [siteConfig.socials.instagram, siteConfig.socials.youtube],
    description: siteConfig.description,
    areaServed: [
      { '@type': 'Country', name: 'Nigeria' },
      { '@type': 'Country', name: 'Kenya' },
    ],
    foundingLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'NG',
      },
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: siteConfig.supportEmail,
      contactType: 'customer support',
      areaServed: ['NG', 'KE'],
      availableLanguage: ['English'],
    },
  };
}

export function createWebsiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: siteConfig.description,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-NG',
  };
}

export function createMobileApplicationSchema() {
  return {
    '@type': 'MobileApplication',
    '@id': `${SITE_URL}/#mobile-application`,
    name: SITE_NAME,
    description: siteConfig.description,
    url: SITE_URL,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Android, iOS',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    publisher: { '@id': `${SITE_URL}/#organization` },
    availableOnDevice: 'Mobile',
    countriesSupported: ['NG', 'KE'],
  };
}

export function createWebPageSchema(input: {
  path: string;
  name: string;
  description: string;
  type?: 'AboutPage' | 'Blog' | 'CollectionPage' | 'FAQPage' | 'WebPage';
}) {
  const url = absoluteUrl(input.path);
  return {
    '@type': input.type ?? 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-NG',
  };
}

export function createBreadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function sitemapEntry(
  path: string,
  options: Omit<MetadataRoute.Sitemap[number], 'url'> = {},
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    ...options,
  };
}
