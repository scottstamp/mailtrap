import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth';
import { deleteSession } from '@/lib/store';
import { cookies } from 'next/headers';

export async function POST() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
        deleteSession(token);
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ success: true });
}
