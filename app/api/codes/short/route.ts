import { NextRequest, NextResponse } from 'next/server';
import { getEmails } from '@/lib/store';
import { htmlToText } from 'html-to-text';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = await getCurrentUser(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let emails = getEmails();

    // Filter based on user allowed domains
    if (user.role !== 'admin' && !user.allowedDomains.includes('*')) {
        emails = emails.filter(email => {
            return email.to.some(recipient => {
                const domain = recipient.address.split('@')[1]?.toLowerCase();
                return domain && user.allowedDomains.includes(domain);
            });
        });
    }

    const regex = /(\d\d\d-\d\d\d\d-\d\d\d)/g;
    const matches: any[] = [];

    for (const email of emails) {
        const textToSearch = email.text || (email.html ? htmlToText(email.html) : '');

        // Find all matches in this email
        let match;
        while ((match = regex.exec(textToSearch)) !== null) {
            matches.push({
                // id: email.id + '-' + match.index, // Unique-ish ID
                code: match[0],
                email: email.to[0]?.address || 'Unknown', // Primary recipient
                // date: email.date,
                // subject: email.subject
            });
        }
    }

    // Sort by date desc
    matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(matches.slice(0, 3), {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}
