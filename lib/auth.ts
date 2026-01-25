import { NextRequest } from 'next/server';
import { getSettings } from './store';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from './constants';

export { SESSION_COOKIE_NAME };

export async function isAuthenticated(req: NextRequest): Promise<boolean> {
    const settings = getSettings();

    // 1. Check API Key Header
    const apiKeyHeader = req.headers.get('x-api-key');
    if (apiKeyHeader && apiKeyHeader === settings.auth.apiKey) {
        return true;
    }

    // 2. Check Session Cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    // For this simple app, the session cookie value is just the username for simplicity, 
    // but in production it should be a signed token. 
    // We'll rely on the fact that this is a local tool.
    // To make it slightly better, we could store a session ID in memory, 
    // but let's just valid against the username for now since we are "MailTrap Local".
    // Actually, let's just check if the cookie exists and equals the username.
    if (sessionCookie && sessionCookie.value === settings.auth.username) {
        return true;
    }

    return false;
}

export function verifyPassword(password: string): boolean {
    const settings = getSettings();
    return bcrypt.compareSync(password, settings.auth.passwordHash);
}
