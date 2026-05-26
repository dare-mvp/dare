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
            <p className="text-muted-foreground">You do not have admin access.</p>
          </div>
        </div>
      );
    }
    redirect('/auth/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopBar email={admin.user.email ?? ''} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
