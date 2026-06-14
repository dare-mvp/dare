import { ImageResponse } from 'next/og';
import { getBlogPost } from '@/lib/blog';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let title = 'DARE Blog';
  let category = 'Blog';
  let excerpt = '';

  try {
    const { frontmatter } = await getBlogPost(slug);
    title = frontmatter.title;
    category = frontmatter.category ?? 'Blog';
    excerpt = frontmatter.excerpt;
  } catch {
    // use fallback values
  }

  const truncatedExcerpt =
    excerpt.length > 130 ? excerpt.slice(0, 130).trimEnd() + '…' : excerpt;

  const titleSize = title.length > 70 ? '42px' : title.length > 50 ? '48px' : '56px';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          backgroundColor: '#050509',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left orange accent bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '6px',
            backgroundColor: '#ff5500',
          }}
        />

        {/* Top-right radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-120px',
            width: '560px',
            height: '560px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,85,0,0.14) 0%, transparent 65%)',
          }}
        />

        {/* Bottom-left subtle glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,85,0,0.06) 0%, transparent 65%)',
          }}
        />

        {/* Content column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            padding: '56px 72px 52px 80px',
          }}
        >
          {/* Top row: DARE brand + domain */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#ff5500',
                letterSpacing: '-0.5px',
              }}
            >
              DARE
            </span>
            <span
              style={{
                fontSize: '15px',
                color: '#555570',
                letterSpacing: '0.04em',
              }}
            >
              daregamesapp.com
            </span>
          </div>

          {/* Flex spacer */}
          <div style={{ flex: 1 }} />

          {/* Category badge */}
          <div style={{ display: 'flex', marginBottom: '20px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#ff5500',
                backgroundColor: 'rgba(255,85,0,0.1)',
                border: '1px solid rgba(255,85,0,0.25)',
                borderRadius: '100px',
                padding: '5px 16px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {category}
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              color: '#f5f5f5',
              lineHeight: 1.18,
              letterSpacing: '-1.5px',
              marginBottom: '20px',
              maxWidth: '960px',
            }}
          >
            {title}
          </div>

          {/* Excerpt */}
          {truncatedExcerpt ? (
            <div
              style={{
                fontSize: '19px',
                color: '#66667a',
                lineHeight: 1.55,
                maxWidth: '840px',
                marginBottom: '8px',
              }}
            >
              {truncatedExcerpt}
            </div>
          ) : null}

          {/* Flex spacer */}
          <div style={{ flex: 1 }} />

          {/* Separator */}
          <div
            style={{
              width: '100%',
              height: '1px',
              backgroundColor: 'rgba(255,255,255,0.07)',
              marginBottom: '22px',
            }}
          />

          {/* Bottom row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '15px', color: '#555570' }}>
              Skill Challenges · Task Rewards · Nigeria &amp; Kenya
            </span>
            <span
              style={{
                fontSize: '15px',
                color: '#ff5500',
                fontWeight: 600,
              }}
            >
              Read on DARE Blog →
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
