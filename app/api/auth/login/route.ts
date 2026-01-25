import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSession } from '@/lib/store';
import { verifyPassword, SESSION_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (verifyPassword(username, password)) {
            const settings = getSettings();
            const user = settings.users.find(u => u.username === username);

            if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

            // Generate Token
            const token = randomBytes(32).toString('hex');
            const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 1 week

            saveSession({
                token,
                userId: user.id,
                expiresAt
            });

            const cookieStore = await cookies();
            cookieStore.set(SESSION_COOKIE_NAME, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}
