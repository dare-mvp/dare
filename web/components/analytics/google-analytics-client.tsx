'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export const CONSENT_STORAGE_KEY = 'dare.analyticsConsent';

const CONSENT_CHANGED_EVENT = 'dare:analytics-consent-changed';

type ConsentValue = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readStoredConsent(): ConsentValue | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

function writeStoredConsent(value: ConsentValue) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {}

  window.gtag?.('consent', 'update', {
    ad_storage: 'denied',
    analytics_storage: value,
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });

  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }));
}

function useAnalyticsConsent() {
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setConsent(readStoredConsent());
    setLoaded(true);

    function handleConsentChange(event: Event) {
      const value = (event as CustomEvent<ConsentValue>).detail;
      setConsent(value);
    }

    window.addEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);

    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);
    };
  }, []);

  return { consent, loaded };
}

export function AnalyticsPageView({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { consent } = useAnalyticsConsent();

  useEffect(() => {
    if (consent !== 'granted' || !window.gtag) {
      return;
    }

    const queryString = searchParams.toString();
    const pagePath = queryString ? `${pathname}?${queryString}` : pathname;

    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
      send_to: measurementId,
    });
  }, [consent, measurementId, pathname, searchParams]);

  return null;
}

export function AnalyticsConsentBanner() {
  const { consent, loaded } = useAnalyticsConsent();

  if (!loaded || consent) {
    return null;
  }

  return (
    <section
      aria-label="Analytics consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-brand-bg/95 px-4 py-4 shadow-2xl backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-foreground">Analytics preferences</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            We use Google Analytics to understand aggregate site usage. You can accept or decline
            analytics cookies. Essential cookies still run for security and sessions. Read our{' '}
            <Link href="/privacy" className="text-brand-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => writeStoredConsent('denied')}
          >
            Decline
          </Button>
          <Button type="button" onClick={() => writeStoredConsent('granted')}>
            Accept
          </Button>
        </div>
      </div>
    </section>
  );
}
