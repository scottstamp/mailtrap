import { NextRequest } from 'next/server';
import { getSettings, User } from './store';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from './constants';

export { SESSION_COOKIE_NAME };

export async function getCurrentUser(req: NextRequest): Promise<User | null> {
    const settings = getSettings();
    if (!settings.users) return null;

    // 1. Check API Key Header
    const apiKeyHeader = req.headers.get('x-api-key');
    if (apiKeyHeader) {
        const user = settings.users.find(u => u.apiKey === apiKeyHeader);
        if (user) return user;
    }

    // 2. Check Session Cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (sessionCookie && sessionCookie.value) {
        // In a real app we'd look up a session ID. Here valid value is just username.
        const user = settings.users.find(u => u.username === sessionCookie.value);
        if (user) return user;
    }

    return null;
}

export async function isAuthenticated(req: NextRequest): Promise<boolean> {
    const user = await getCurrentUser(req);
    return !!user;
}

export function verifyPassword(username: string, password: string): boolean {
    const settings = getSettings();
    const user = settings.users.find(u => u.username === username);
    if (!user) return false;
    return bcrypt.compareSync(password, user.passwordHash);
}
