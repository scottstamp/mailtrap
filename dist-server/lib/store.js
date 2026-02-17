"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmails = getEmails;
exports.saveEmail = saveEmail;
exports.getSettings = getSettings;
exports.saveSettings = saveSettings;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.createInvite = createInvite;
exports.updateInvite = updateInvite;
exports.deleteInvite = deleteInvite;
exports.getSMTPSettings = getSMTPSettings;
exports.saveSMTPSettings = saveSMTPSettings;
exports.getSessions = getSessions;
exports.saveSession = saveSession;
exports.deleteSession = deleteSession;
exports.disconnectPrisma = disconnectPrisma;
const crypto_1 = require("crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("./generated/prisma");
const prisma = new prisma_1.PrismaClient();
// Initialize default admin user if no users exist
async function initializeSettings() {
    try {
        // Try to create default admin user, ignore if already exists
        await prisma.user.create({
            data: {
                username: 'admin',
                passwordHash: bcryptjs_1.default.hashSync('password', 10),
                role: 'admin',
                apiKey: (0, crypto_1.randomUUID)(),
                domains: {
                    create: {
                        domain: '*'
                    }
                }
            }
        });
        console.log('Created default admin user: admin');
    }
    catch (error) {
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
async function getEmails() {
    const emails = await prisma.email.findMany({
        orderBy: { date: 'desc' },
        take: 300,
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
async function saveEmail(email) {
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
async function getSettings() {
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
            role: u.role,
            allowedDomains: u.domains.map(d => d.domain),
            apiKey: u.apiKey,
            resetToken: u.resetToken || undefined,
            resetTokenExpiry: u.resetTokenExpiry ? u.resetTokenExpiry.getTime() : undefined
        })),
        invites: invites.map(i => ({
            code: i.code,
            role: i.role,
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
async function saveSettings(settings) {
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
async function createUser(userData) {
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
        role: user.role,
        allowedDomains: user.domains.map(d => d.domain),
        apiKey: user.apiKey,
        resetToken: user.resetToken || undefined,
        resetTokenExpiry: user.resetTokenExpiry ? user.resetTokenExpiry.getTime() : undefined
    };
}
async function updateUser(userId, updates) {
    const existing = await prisma.user.findUnique({
        where: { id: userId },
        include: { domains: true }
    });
    if (!existing)
        return null;
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
        role: user.role,
        allowedDomains: user.domains.map(d => d.domain),
        apiKey: user.apiKey,
        resetToken: user.resetToken || undefined,
        resetTokenExpiry: user.resetTokenExpiry ? user.resetTokenExpiry.getTime() : undefined
    };
}
async function deleteUser(userId) {
    try {
        await prisma.user.delete({ where: { id: userId } });
        return true;
    }
    catch (_a) {
        return false;
    }
}
// Invite functions
async function createInvite(inviteData) {
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
        role: invite.role,
        allowedDomains: invite.domains.map(d => d.domain),
        used: invite.used,
        expiresAt: invite.expiresAt.getTime()
    };
}
async function updateInvite(code, updates) {
    const existing = await prisma.invite.findUnique({
        where: { code },
        include: { domains: true }
    });
    if (!existing)
        return null;
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
        role: invite.role,
        allowedDomains: invite.domains.map(d => d.domain),
        used: invite.used,
        expiresAt: invite.expiresAt.getTime()
    };
}
async function deleteInvite(code) {
    try {
        await prisma.invite.delete({ where: { code } });
        return true;
    }
    catch (_a) {
        return false;
    }
}
// SMTP Settings functions
async function getSMTPSettings() {
    const settings = await prisma.sMTPSettings.findFirst();
    if (!settings)
        return null;
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
async function saveSMTPSettings(settings) {
    const existing = await prisma.sMTPSettings.findFirst();
    if (existing) {
        await prisma.sMTPSettings.update({
            where: { id: existing.id },
            data: settings
        });
    }
    else {
        await prisma.sMTPSettings.create({
            data: settings
        });
    }
}
// Session functions
async function getSessions() {
    const sessions = await prisma.session.findMany({
        where: { expiresAt: { gt: new Date() } }
    });
    return sessions.map(s => ({
        token: s.token,
        userId: s.userId,
        expiresAt: s.expiresAt.getTime()
    }));
}
async function saveSession(session) {
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
async function deleteSession(token) {
    await prisma.session.deleteMany({
        where: { token }
    });
}
// Cleanup function for graceful shutdown
async function disconnectPrisma() {
    await prisma.$disconnect();
}
