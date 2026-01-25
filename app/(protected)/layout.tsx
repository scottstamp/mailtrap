import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME);

    if (!session) {
        redirect('/login');
    }

    // Since this is a server component, we need to import Header dynamically if it uses client hooks, 
    // but our Header uses mostly links and a client component (SettingsDialog).
    // Standard import should be fine as Header can be a Server Component that renders Client Components.
    const { Header } = await import('@/components/Header');

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main className="container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
