import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-bg px-6">
      <span className="font-mono text-5xl text-brand-primary">404</span>
      <h1 className="font-syne text-2xl font-extrabold text-foreground">Page not found.</h1>
      <p className="text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/" className="text-sm text-brand-primary hover:underline">
        Back to home
      </Link>
    </div>
  );
}
