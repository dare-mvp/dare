import Script from 'next/script';
import { Suspense } from 'react';
import {
  AnalyticsConsentBanner,
  AnalyticsPageView,
  CONSENT_STORAGE_KEY,
} from '@/components/analytics/google-analytics-client';

const DEFAULT_MEASUREMENT_ID = 'G-WS89C1QLZ1';
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;

type GoogleAnalyticsProps = {
  measurementId?: string;
};

export function GoogleAnalytics({
  measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? DEFAULT_MEASUREMENT_ID,
}: GoogleAnalyticsProps) {
  if (!MEASUREMENT_ID_PATTERN.test(measurementId)) {
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
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
      <Suspense fallback={null}>
        <AnalyticsPageView measurementId={measurementId} />
      </Suspense>
      <AnalyticsConsentBanner />
    </>
  );
}
