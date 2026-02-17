import { NextRequest, NextResponse } from 'next/server';
import { getSettings, createUser, updateInvite } from '@/lib/store';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { code, username, password } = await request.json();
        const settings = await getSettings();

        const invite = settings.invites.find(i => i.code === code && !i.used && i.expiresAt > Date.now());

        if (!invite) {
            return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 400 });
        }

        // Check if username exists
        if (settings.users.some(u => u.username === username)) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
        }

        // Create user using the new helper function
        await createUser({
            username,
            passwordHash: bcrypt.hashSync(password, 10),
            role: invite.role,
            allowedDomains: invite.allowedDomains,
            apiKey: randomUUID()
        });

        // Mark invite as used
        await updateInvite(code, { used: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}
