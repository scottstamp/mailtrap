import { NextRequest, NextResponse } from 'next/server';
import { getEmails } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = await getCurrentUser(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let emails = await getEmails();

    // Filter based on user allowed domains
    if (user.role !== 'admin' && !user.allowedDomains.includes('*')) {
        emails = emails.filter(email => {
            // Check if ANY recipient matches allowed domains
            return email.to.some(recipient => {
                const domain = recipient.address.split('@')[1]?.toLowerCase();
                return domain && user.allowedDomains.includes(domain);
            });
        });
    }

    // Prevent caching
    return NextResponse.json(emails.slice(0, 20), {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}
