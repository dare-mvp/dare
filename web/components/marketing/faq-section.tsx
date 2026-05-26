'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { faqItems, FAQ_CATEGORIES, type FaqCategory } from '@/lib/faq-data';

export function FaqSection({ preview = false }: { preview?: boolean }) {
  const [activeCategory, setActiveCategory] = useState<FaqCategory>('all');

  const filtered =
    activeCategory === 'all'
      ? faqItems
      : faqItems.filter((item) => item.category === activeCategory);

  const items = preview ? filtered.slice(0, 5) : filtered;

  return (
    <section id="faq" className="scroll-mt-14 bg-brand-bg px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h2 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need to know about DARE.
          </p>
        </div>

        {/* Category filter */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {FAQ_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveCategory(cat.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                activeCategory === cat.value
                  ? 'bg-brand-primary text-white'
                  : 'border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No questions in this category yet.
          </p>
        ) : (
          <Accordion className="space-y-2">
            {items.map((item, index) => (
              <AccordionItem
                key={`${activeCategory}-${index}`}
                value={`item-${index}`}
                className="rounded-xl border border-white/8 bg-brand-surface px-6 transition-colors hover:border-white/15"
              >
                <AccordionTrigger className="font-semibold text-foreground hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {preview && (
          <div className="mt-8 text-center">
            <Link
              href="/faq"
              className="text-sm font-medium text-brand-primary hover:underline"
            >
              View all {faqItems.length} questions →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
