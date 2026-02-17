import { NextRequest, NextResponse } from 'next/server';
import { getEmails } from '@/lib/store';
import { isAuthenticated } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ to: string }> }
) {
    if (!await isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to } = await params;
    const decodedTo = decodeURIComponent(to).toLowerCase();

    const emails = (await getEmails()).filter(email =>
        email.to.some(recipient => recipient.address.toLowerCase() === decodedTo)
    );

    return NextResponse.json(emails.slice(0, 50), {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}
