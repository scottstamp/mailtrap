import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, allowedDomains } = await request.json();
        const currentSettings = getSettings();
        const targetUserIndex = currentSettings.users.findIndex(u => u.id === id);

        if (targetUserIndex === -1) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        currentSettings.users[targetUserIndex].allowedDomains = allowedDomains;
        saveSettings(currentSettings);

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}

export async function DELETE(request: NextRequest) {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await request.json();
        const currentSettings = getSettings();
        const targetUserIndex = currentSettings.users.findIndex(u => u.id === id);

        if (targetUserIndex === -1) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Prevent deleting self (though UI hides button) or primary admin if we wanted to enforce that
        if (currentSettings.users[targetUserIndex].id === user.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        }

        currentSettings.users.splice(targetUserIndex, 1);
        saveSettings(currentSettings);

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}
