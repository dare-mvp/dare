import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
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
            top: '-100px',
            right: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,85,0,0.16) 0%, transparent 65%)',
          }}
        />

        {/* Center-bottom secondary glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '200px',
            width: '500px',
            height: '300px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,85,0,0.05) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            padding: '56px 72px 52px 80px',
          }}
        >
          {/* Top: DARE + domain */}
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
            <span style={{ fontSize: '15px', color: '#555570', letterSpacing: '0.04em' }}>
              daregamesapp.com
            </span>
          </div>

          {/* Flex spacer */}
          <div style={{ flex: 1 }} />

          {/* Label */}
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
              Blog
            </span>
          </div>

          {/* Heading */}
          <div
            style={{
              fontSize: '60px',
              fontWeight: 800,
              color: '#f5f5f5',
              lineHeight: 1.15,
              letterSpacing: '-2px',
              marginBottom: '20px',
            }}
          >
            DARE Blog
          </div>

          {/* Subheading */}
          <div
            style={{
              fontSize: '22px',
              color: '#66667a',
              lineHeight: 1.5,
              maxWidth: '760px',
            }}
          >
            Guides, product updates, and strategy for skill challenges and task rewards in Nigeria and Kenya.
          </div>

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

          {/* Bottom */}
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
              daregamesapp.com/blog →
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
