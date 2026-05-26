import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { faqItems } from '@/lib/faq-data';

export function FaqSection({ preview = false }: { preview?: boolean }) {
  const items = preview ? faqItems.slice(0, 5) : faqItems;

  return (
    <section id="faq" className="bg-brand-bg px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center">
          <h2 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
            Frequently asked questions
          </h2>
        </div>

        <Accordion className="space-y-2">
          {items.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-xl border border-white/8 bg-brand-surface px-6"
            >
              <AccordionTrigger className="font-semibold text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
