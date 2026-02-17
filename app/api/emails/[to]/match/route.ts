import { NextRequest, NextResponse } from 'next/server';
import { getEmails } from '@/lib/store';
import { htmlToText } from 'html-to-text';
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

    const searchParams = request.nextUrl.searchParams;
    const pattern = searchParams.get('pattern');

    if (!pattern) {
        return NextResponse.json({ error: 'Pattern query parameter is required' }, { status: 400 });
    }

    try {
        const regex = new RegExp(pattern);
        const emails = (await getEmails()).filter(email =>
            email.to.some(recipient => recipient.address.toLowerCase() === decodedTo)
        );

        for (const email of emails) {
            // Check text
            const textToSearch = email.text || (email.html ? htmlToText(email.html) : '');
            const match = textToSearch.match(regex);
            if (match) {
                return NextResponse.json({
                    found: true,
                    match: match[0],
                    groups: match.slice(1),
                    emailId: email.id,
                    date: email.date
                });
            }

            // Also check subject?
            const subjectMatch = email.subject.match(regex);
            if (subjectMatch) {
                return NextResponse.json({
                    found: true,
                    match: subjectMatch[0],
                    groups: subjectMatch.slice(1),
                    emailId: email.id,
                    date: email.date
                });
            }
        }

        return NextResponse.json({ found: false });

    } catch (error) {
        return NextResponse.json({ error: 'Invalid Regex Pattern' }, { status: 400 });
    }
}
