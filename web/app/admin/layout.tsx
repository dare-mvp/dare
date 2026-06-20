import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminTopBar } from '@/components/admin/admin-top-bar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin: { user: { email?: string } };

  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-brand-bg px-6">
          <div className="text-center space-y-2">
            <h1 className="font-syne text-3xl font-extrabold text-foreground">403 Forbidden</h1>
            <p className="text-muted-foreground">Access denied. This account does not have admin privileges.</p>
          </div>
        </div>
      );
    }
    redirect('/auth/login');
  }

  return (
    <div className="flex min-h-dvh bg-brand-bg lg:h-screen lg:overflow-hidden">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col lg:overflow-hidden">
        <AdminTopBar email={admin.user.email ?? ''} />
        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:overflow-y-auto lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
