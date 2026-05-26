'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';

export function UserSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      const trimmed = query.trim();

      if (trimmed) {
        next.set('q', trimmed);
      } else {
        next.delete('q');
      }
      next.set('page', '1');

      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`);
      });
    }, 300);

    return () => window.clearTimeout(handle);
  }, [pathname, query, router, searchParams]);

  return (
    <Input
      placeholder="Search by username..."
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      className="max-w-xs border-white/8 bg-brand-surface"
    />
  );
}
