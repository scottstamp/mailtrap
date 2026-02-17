import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings, updateUser, saveSMTPSettings } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
    const user = await getCurrentUser(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getSettings();

    // Base response for all users
    const response: any = {
        auth: { // Keep structure compatible with frontend for now
            username: user.username,
            apiKey: user.apiKey,
            role: user.role
        },
        allowedDomains: settings.allowedDomains
    };

    // Admin only data
    if (user.role === 'admin') {
        response.users = settings.users.map(u => ({
            id: u.id,
            username: u.username,
            role: u.role,
            allowedDomains: u.allowedDomains
        }));
        response.invites = settings.invites;
        response.smtp = settings.smtp;
    }

    return NextResponse.json(response, {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Admin Global Settings Updates
        if (user.role === 'admin') {
            if (body.allowedDomains) {
                const currentSettings = await getSettings();
                currentSettings.allowedDomains = body.allowedDomains;
                await saveSettings(currentSettings);
            }
            if (body.smtp) {
                await saveSMTPSettings(body.smtp);
            }
        }

        // User Self Updates (Password / API Key)
        let updatedApiKey = user.apiKey;

        if (body.newPassword) {
            await updateUser(user.id, {
                passwordHash: bcrypt.hashSync(body.newPassword, 10)
            });
        }

        if (body.rotateApiKey) {
            updatedApiKey = randomUUID();
            await updateUser(user.id, {
                apiKey: updatedApiKey
            });
        }

        return NextResponse.json({
            success: true,
            apiKey: updatedApiKey
        });

    } catch (error) {
        console.error('Settings update error:', error);
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}
