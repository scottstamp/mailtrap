import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

export interface Email {
    id: string;
    from: {
        address: string;
        name: string;
    };
    to: {
        address: string;
        name: string;
    }[];
    subject: string;
    text: string;
    html: string;
    date: string; // ISO string
}

export interface User {
    id: string;
    username: string;
    passwordHash: string;
    role: 'admin' | 'user';
    allowedDomains: string[]; // ['*'] for all
    apiKey: string;
    resetToken?: string;
    resetTokenExpiry?: number;
}

export interface Invite {
    code: string;
    role: 'admin' | 'user';
    allowedDomains: string[];
    used: boolean;
    expiresAt: number;
}

export interface SMTPSettings {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
    from: string;
    enabled: boolean;
}

export interface Settings {
    allowedDomains: string[]; // For partial matching of incoming emails
    users: User[];
    invites: Invite[];
    smtp?: SMTPSettings;
    // Legacy auth support during migration, optional
    auth?: {
        username: string;
        passwordHash: string;
        apiKey: string;
    };
}

export interface Session {
    token: string;
    userId: string;
    expiresAt: number;
}

// Initialize default admin user if no users exist
async function initializeSettings() {
    try {
        // Try to create default admin user, ignore if already exists
        await prisma.user.create({
            data: {
                username: 'admin',
                passwordHash: bcrypt.hashSync('password', 10),
                role: 'admin',
                apiKey: 'd7a3519e-7476-4519-b83d-d40e0c4128e7',
                domains: {
                    create: {
                        domain: '*'
                    }
                }
            }
        });
        console.log('Created default admin user: admin');
    } catch (error: any) {
        // If user already exists, that's fine
        if (error.code === 'P2002') {
            // Unique constraint violation - admin user already exists
            return;
        }
        console.error('Error initializing settings:', error);
    }
}

// Run initialization
initializeSettings().catch(console.error);

// Email functions
export async function getEmails(): Promise<Email[]> {
    const emails = await prisma.email.findMany({
        orderBy: { date: 'desc' },
        take: 20,
        include: { to: true }
    });
    
    return emails.map(e => ({
        id: e.id,
        from: {
            address: e.fromEmail,
            name: e.fromName
        },
        to: e.to.map(t => ({
            address: t.address,
            name: t.name
        })),
        subject: e.subject,
        text: e.text,
        html: e.html,
        date: e.date.toISOString()
    }));
}

export async function saveEmail(email: Email) {
    await prisma.email.create({
        data: {
            id: email.id,
            fromName: email.from.name,
            fromEmail: email.from.address,
            subject: email.subject,
            text: email.text,
            html: email.html,
            date: new Date(email.date),
            to: {
                create: email.to.map(t => ({
                    address: t.address,
                    name: t.name
                }))
            }
        }
    });
    
    // Keep only the latest 300 emails
    const count = await prisma.email.count();
    if (count > 300) {
        const emailsToDelete = await prisma.email.findMany({
            orderBy: { date: 'desc' },
            skip: 300,
            select: { id: true }
        });
        
        await prisma.email.deleteMany({
            where: { id: { in: emailsToDelete.map(e => e.id) } }
        });
    }
}

// Settings functions
export async function getSettings(): Promise<Settings> {
    const [users, invites, smtpSettings, allowedDomainsSetting] = await Promise.all([
        prisma.user.findMany({
            include: { domains: true }
        }),
        prisma.invite.findMany({
            include: { domains: true }
        }),
        prisma.sMTPSettings.findFirst(),
        prisma.appSettings.findUnique({ where: { key: 'allowedDomains' } })
    ]);
    
    return {
        allowedDomains: allowedDomainsSetting ? JSON.parse(allowedDomainsSetting.value) : [],
        users: users.map(u => ({
            id: u.id,
            username: u.username,
            passwordHash: u.passwordHash,
            role: u.role as 'admin' | 'user',
            allowedDomains: u.domains.map(d => d.domain),
            apiKey: u.apiKey,
            resetToken: u.resetToken || undefined,
            resetTokenExpiry: u.resetTokenExpiry ? u.resetTokenExpiry.getTime() : undefined
        })),
        invites: invites.map(i => ({
            code: i.code,
            role: i.role as 'admin' | 'user',
            allowedDomains: i.domains.map(d => d.domain),
            used: i.used,
            expiresAt: i.expiresAt.getTime()
        })),
        smtp: smtpSettings ? {
            host: smtpSettings.host,
            port: smtpSettings.port,
            user: smtpSettings.user,
            pass: smtpSettings.pass,
            secure: smtpSettings.secure,
            from: smtpSettings.from,
            enabled: smtpSettings.enabled
        } : undefined
    };
}

export async function saveSettings(settings: Settings) {
    // Update allowed domains
    await prisma.appSettings.upsert({
        where: { key: 'allowedDomains' },
        create: {
            key: 'allowedDomains',
            value: JSON.stringify(settings.allowedDomains)
        },
        update: {
            value: JSON.stringify(settings.allowedDomains)
        }
    });
    
    // Note: Users and invites are managed individually through other functions
    // SMTP settings are managed separately
}

// User management functions
export async function createUser(userData: Omit<User, 'id'>): Promise<User> {
    const user = await prisma.user.create({
        data: {
            username: userData.username,
            passwordHash: userData.passwordHash,
            role: userData.role,
            apiKey: userData.apiKey,
            resetToken: userData.resetToken,
            resetTokenExpiry: userData.resetTokenExpiry ? new Date(userData.resetTokenExpiry) : null,
            domains: {
                create: userData.allowedDomains.map(d => ({ domain: d }))
            }
        },
        include: { domains: true }
    });
    
    return {
        id: user.id,
        username: user.username,
        passwordHash: user.passwordHash,
        role: user.role as 'admin' | 'user',
        allowedDomains: user.domains.map(d => d.domain),
        apiKey: user.apiKey,
        resetToken: user.resetToken || undefined,
        resetTokenExpiry: user.resetTokenExpiry ? user.resetTokenExpiry.getTime() : undefined
    };
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const existing = await prisma.user.findUnique({
        where: { id: userId },
        include: { domains: true }
    });
    
    if (!existing) return null;
    
    // Handle domain updates
    if (updates.allowedDomains) {
        await prisma.userDomain.deleteMany({ where: { userId } });
        await prisma.userDomain.createMany({
            data: updates.allowedDomains.map(d => ({ domain: d, userId }))
        });
    }
    
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            username: updates.username,
            passwordHash: updates.passwordHash,
            role: updates.role,
            apiKey: updates.apiKey,
            resetToken: updates.resetToken,
            resetTokenExpiry: updates.resetTokenExpiry ? new Date(updates.resetTokenExpiry) : undefined
        },
        include: { domains: true }
    });
    
    return {
        id: user.id,
        username: user.username,
        passwordHash: user.passwordHash,
        role: user.role as 'admin' | 'user',
        allowedDomains: user.domains.map(d => d.domain),
        apiKey: user.apiKey,
        resetToken: user.resetToken || undefined,
        resetTokenExpiry: user.resetTokenExpiry ? user.resetTokenExpiry.getTime() : undefined
    };
}

export async function deleteUser(userId: string): Promise<boolean> {
    try {
        await prisma.user.delete({ where: { id: userId } });
        return true;
    } catch {
        return false;
    }
}

// Invite functions
export async function createInvite(inviteData: Omit<Invite, 'code'> & { code: string }): Promise<Invite> {
    const invite = await prisma.invite.create({
        data: {
            code: inviteData.code,
            role: inviteData.role,
            used: inviteData.used,
            expiresAt: new Date(inviteData.expiresAt),
            domains: {
                create: inviteData.allowedDomains.map(d => ({ domain: d }))
            }
        },
        include: { domains: true }
    });
    
    return {
        code: invite.code,
        role: invite.role as 'admin' | 'user',
        allowedDomains: invite.domains.map(d => d.domain),
        used: invite.used,
        expiresAt: invite.expiresAt.getTime()
    };
}

export async function updateInvite(code: string, updates: Partial<Invite>): Promise<Invite | null> {
    const existing = await prisma.invite.findUnique({
        where: { code },
        include: { domains: true }
    });
    
    if (!existing) return null;
    
    // Handle domain updates
    if (updates.allowedDomains) {
        await prisma.inviteDomain.deleteMany({ where: { inviteId: existing.id } });
        await prisma.inviteDomain.createMany({
            data: updates.allowedDomains.map(d => ({ domain: d, inviteId: existing.id }))
        });
    }
    
    const invite = await prisma.invite.update({
        where: { code },
        data: {
            role: updates.role,
            used: updates.used,
            expiresAt: updates.expiresAt ? new Date(updates.expiresAt) : undefined
        },
        include: { domains: true }
    });
    
    return {
        code: invite.code,
        role: invite.role as 'admin' | 'user',
        allowedDomains: invite.domains.map(d => d.domain),
        used: invite.used,
        expiresAt: invite.expiresAt.getTime()
    };
}

export async function deleteInvite(code: string): Promise<boolean> {
    try {
        await prisma.invite.delete({ where: { code } });
        return true;
    } catch {
        return false;
    }
}

// SMTP Settings functions
export async function getSMTPSettings(): Promise<SMTPSettings | null> {
    const settings = await prisma.sMTPSettings.findFirst();
    if (!settings) return null;
    
    return {
        host: settings.host,
        port: settings.port,
        user: settings.user,
        pass: settings.pass,
        secure: settings.secure,
        from: settings.from,
        enabled: settings.enabled
    };
}

export async function saveSMTPSettings(settings: SMTPSettings) {
    const existing = await prisma.sMTPSettings.findFirst();
    
    if (existing) {
        await prisma.sMTPSettings.update({
            where: { id: existing.id },
            data: settings
        });
    } else {
        await prisma.sMTPSettings.create({
            data: settings
        });
    }
}

// Session functions
export async function getSessions(): Promise<Session[]> {
    const sessions = await prisma.session.findMany({
        where: { expiresAt: { gt: new Date() } }
    });
    
    return sessions.map(s => ({
        token: s.token,
        userId: s.userId,
        expiresAt: s.expiresAt.getTime()
    }));
}

export async function saveSession(session: Session) {
    await prisma.session.create({
        data: {
            token: session.token,
            userId: session.userId,
            expiresAt: new Date(session.expiresAt)
        }
    });
    
    // Cleanup expired sessions
    await prisma.session.deleteMany({
        where: { expiresAt: { lte: new Date() } }
    });
}

export async function deleteSession(token: string) {
    await prisma.session.deleteMany({
        where: { token }
    });
}

// Cleanup function for graceful shutdown
export async function disconnectPrisma() {
    await prisma.$disconnect();
}
