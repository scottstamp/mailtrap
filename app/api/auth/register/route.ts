import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/store';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { code, username, password } = await request.json();
        const settings = getSettings();

        const inviteIndex = settings.invites.findIndex(i => i.code === code && !i.used && i.expiresAt > Date.now());

        if (inviteIndex === -1) {
            return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 400 });
        }

        const invite = settings.invites[inviteIndex];

        // Check if username exists
        if (settings.users.some(u => u.username === username)) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
        }

        settings.users.push({
            id: randomUUID(),
            username,
            passwordHash: bcrypt.hashSync(password, 10),
            role: invite.role,
            allowedDomains: invite.allowedDomains,
            apiKey: randomUUID()
        });

        settings.invites[inviteIndex].used = true;
        saveSettings(settings);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}
