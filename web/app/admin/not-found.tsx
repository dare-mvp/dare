import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <h2 className="font-syne text-xl font-extrabold text-foreground">Not found.</h2>
      <p className="text-sm text-muted-foreground">The resource you requested does not exist.</p>
      <Link href="/admin" className="text-sm text-brand-primary hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
