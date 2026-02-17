import { NextRequest, NextResponse } from 'next/server';
import { createInvite } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const code = randomBytes(16).toString('hex');

        await createInvite({
            code,
            role: body.role || 'user',
            allowedDomains: body.allowedDomains || [],
            used: false,
            expiresAt: Date.now() + 1000 * 60 * 60 * 48 // 48 hours
        });

        // Return full link or just code? Return full link for convenience
        const origin = request.nextUrl.origin;
        return NextResponse.json({
            success: true,
            code,
            link: `${origin}/register/${code}`
        });
    } catch (error) {
        console.error('Invite creation error:', error);
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}
