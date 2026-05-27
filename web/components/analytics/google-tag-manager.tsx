import Script from 'next/script';
import { Suspense } from 'react';
import {
  AnalyticsConsentBanner,
  AnalyticsPageView,
  CONSENT_STORAGE_KEY,
} from '@/components/analytics/google-analytics-client';

const DEFAULT_CONTAINER_ID = 'GTM-MV8ZFZWT';
const CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

type GoogleTagManagerProps = {
  containerId?: string;
};

function getContainerId(containerId?: string) {
  return containerId ?? process.env.NEXT_PUBLIC_GTM_ID ?? DEFAULT_CONTAINER_ID;
}

export function GoogleTagManager({
  containerId: providedContainerId,
}: GoogleTagManagerProps) {
  const containerId = getContainerId(providedContainerId);

  if (!CONTAINER_ID_PATTERN.test(containerId)) {
    return null;
  }

  return (
    <>
      <Script id="google-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;

          var analyticsConsent = 'denied';
          try {
            analyticsConsent = window.localStorage.getItem('${CONSENT_STORAGE_KEY}') === 'granted'
              ? 'granted'
              : 'denied';
          } catch (error) {}

          gtag('consent', 'default', {
            ad_storage: 'denied',
            analytics_storage: analyticsConsent,
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
          });
          gtag('set', 'ads_data_redaction', true);
        `}
      </Script>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${containerId}');
        `}
      </Script>
      <Suspense fallback={null}>
        <AnalyticsPageView />
      </Suspense>
      <AnalyticsConsentBanner />
    </>
  );
}

export function GoogleTagManagerNoScript({
  containerId: providedContainerId,
}: GoogleTagManagerProps) {
  const containerId = getContainerId(providedContainerId);

  if (!CONTAINER_ID_PATTERN.test(containerId)) {
    return null;
  }

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${containerId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
