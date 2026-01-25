import { NextRequest, NextResponse } from 'next/server';
import { getEmails } from '@/lib/store';
import { htmlToText } from 'html-to-text';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: NextRequest) {
    if (!await isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emails = getEmails();
    const regex = /(\d\d\d-\d\d\d\d-\d\d\d)/g;
    const matches: any[] = [];

    for (const email of emails) {
        const textToSearch = email.text || (email.html ? htmlToText(email.html) : '');

        // Find all matches in this email
        let match;
        while ((match = regex.exec(textToSearch)) !== null) {
            matches.push({
                id: email.id + '-' + match.index, // Unique-ish ID
                code: match[0],
                email: email.to[0]?.address || 'Unknown', // Primary recipient
                date: email.date,
                subject: email.subject
            });
        }
    }

    // Sort by date desc
    matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(matches.slice(0, 50), {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}
