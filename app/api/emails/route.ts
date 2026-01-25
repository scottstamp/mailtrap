import { NextRequest, NextResponse } from 'next/server';
import { getEmails } from '@/lib/store';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: NextRequest) {
    if (!await isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prevent caching
    return NextResponse.json(getEmails().slice(0, 20), {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}
