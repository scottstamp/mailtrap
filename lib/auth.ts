import { NextRequest } from 'next/server';
import { getSettings, getSessions, User } from './store';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from './constants';

export { SESSION_COOKIE_NAME };

export async function getCurrentUser(req: NextRequest): Promise<User | null> {
    const settings = await getSettings();
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
        const sessions = await getSessions();
        const activeSession = sessions.find(s => s.token === sessionCookie.value && s.expiresAt > Date.now());

        if (activeSession) {
            const user = settings.users.find(u => u.id === activeSession.userId);
            if (user) return user;
        }
    }

    return null;
}

export async function isAuthenticated(req: NextRequest): Promise<boolean> {
    const user = await getCurrentUser(req);
    return !!user;
}

export async function verifyPassword(username: string, password: string): Promise<boolean> {
    const settings = await getSettings();
    const user = settings.users.find(u => u.username === username);
    if (!user) return false;
    return bcrypt.compareSync(password, user.passwordHash);
}
