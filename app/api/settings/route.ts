import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
    const user = await getCurrentUser(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = getSettings();

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
        const currentSettings = getSettings();
        const currentUserIndex = currentSettings.users.findIndex(u => u.id === user.id);

        if (currentUserIndex === -1) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Admin Global Settings Updates
        if (user.role === 'admin') {
            if (body.allowedDomains) {
                currentSettings.allowedDomains = body.allowedDomains;
            }
            if (body.smtp) {
                currentSettings.smtp = body.smtp;
            }
        }

        // User Self Updates (Password / API Key)
        // Check if we are updating ourselves OR if valid admin updating another user?
        // For now, let's assume body contains updates for the current user unless specified

        if (body.newPassword) {
            currentSettings.users[currentUserIndex].passwordHash = bcrypt.hashSync(body.newPassword, 10);
        }

        if (body.rotateApiKey) {
            currentSettings.users[currentUserIndex].apiKey = randomUUID();
        }

        saveSettings(currentSettings);

        return NextResponse.json({
            success: true,
            apiKey: currentSettings.users[currentUserIndex].apiKey
        });

    } catch (error) {
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}
