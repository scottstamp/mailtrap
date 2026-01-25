import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/store';
import { isAuthenticated } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
    if (!await isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = getSettings();
    // Return settings but DO NOT return the password hash!
    return NextResponse.json({
        allowedDomains: settings.allowedDomains,
        auth: {
            username: settings.auth.username,
            apiKey: settings.auth.apiKey,
            // No password hash
        }
    }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}

export async function POST(request: NextRequest) {
    if (!await isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const currentSettings = getSettings();

        // Update allowed domains
        if (body.allowedDomains) {
            currentSettings.allowedDomains = body.allowedDomains;
        }

        // Update Password
        if (body.newPassword) {
            currentSettings.auth.passwordHash = bcrypt.hashSync(body.newPassword, 10);
        }

        // Rotate API Key
        if (body.rotateApiKey) {
            currentSettings.auth.apiKey = randomUUID();
        }

        saveSettings(currentSettings);

        return NextResponse.json({
            success: true,
            apiKey: currentSettings.auth.apiKey
        });

    } catch (error) {
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}
