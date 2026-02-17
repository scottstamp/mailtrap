import { NextRequest, NextResponse } from 'next/server';
import { updateUser, deleteUser } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, allowedDomains } = await request.json();

        const updatedUser = await updateUser(id, { allowedDomains });

        if (!updatedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('User update error:', error);
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

        // Prevent deleting self
        if (id === user.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        }

        const deleted = await deleteUser(id);

        if (!deleted) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('User delete error:', error);
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}
