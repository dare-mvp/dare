import { Apple, Download, ShieldCheck, Smartphone } from 'lucide-react';

const DOWNLOAD_OPTIONS = [
  {
    id: 'apk-download',
    label: 'Android APK',
    status: 'Beta available',
    body: 'Install the Android beta, try the challenge flow, and send feedback before public launch.',
    action: 'Request Android beta',
    href: '#waitlist',
    icon: Download,
  },
  {
    id: 'testflight',
    label: 'iOS TestFlight',
    status: 'Invite list',
    body: 'Join the iOS waitlist so we can send a TestFlight invite when the next build opens.',
    action: 'Join iOS waitlist',
    href: '#waitlist',
    icon: Apple,
  },
];

export function DownloadSection() {
  return (
    <section id="download" className="bg-brand-surface px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase text-brand-primary">Get the beta</p>
            <h2 className="mt-2 font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
              Take DARE with you.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Available now in beta. Join the list and we&apos;ll send your download link directly
            when your platform build opens.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {DOWNLOAD_OPTIONS.map((option) => (
            <article
              key={option.id}
              id={option.id}
              className="scroll-mt-24 rounded-xl border border-white/8 bg-brand-bg p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/12 text-brand-primary">
                  <option.icon className="h-6 w-6" />
                </div>
                <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  {option.status}
                </span>
              </div>

              <h3 className="mt-5 font-syne text-2xl font-extrabold text-foreground">{option.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{option.body}</p>

              <a
                href={option.href}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-brand-primary px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Smartphone className="h-4 w-4" />
                {option.action}
              </a>
            </article>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-lg border border-white/8 bg-white/[0.03] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#19C37D]" />
          <p className="text-sm leading-6 text-muted-foreground">
            Only install builds linked from this page or official DARE channels. Never install APKs sent by unknown accounts.
          </p>
        </div>
      </div>
    </section>
  );
}
