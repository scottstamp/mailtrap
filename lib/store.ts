import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const STORAGE_FILE = path.join(process.cwd(), 'emails.json');
const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

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

// Initialize files if not exist
if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify([]));
}
if (!fs.existsSync(SETTINGS_FILE)) {
    const adminUser: User = {
        id: randomUUID(),
        username: 'admin',
        passwordHash: bcrypt.hashSync('password', 10),
        role: 'admin',
        allowedDomains: ['*'],
        apiKey: randomUUID()
    };

    const defaultSettings: Settings = {
        allowedDomains: [],
        users: [adminUser],
        invites: []
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
} else {
    // Migration for existing settings file
    try {
        const current = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
        let changed = false;

        // Migrate legacy auth to users array if users doesn't exist
        if (!current.users || current.users.length === 0) {
            if (current.auth) {
                const adminUser: User = {
                    id: randomUUID(),
                    username: current.auth.username || 'admin',
                    passwordHash: current.auth.passwordHash || bcrypt.hashSync('password', 10),
                    role: 'admin',
                    allowedDomains: ['*'],
                    apiKey: current.auth.apiKey || randomUUID()
                };
                current.users = [adminUser];
                // Keep auth for safety or remove it? Let's keep it but users array takes precedence in logic
                changed = true;
            } else {
                // Fallback if completely broken
                const adminUser: User = {
                    id: randomUUID(),
                    username: 'admin',
                    passwordHash: bcrypt.hashSync('password', 10),
                    role: 'admin',
                    allowedDomains: ['*'],
                    apiKey: randomUUID()
                };
                current.users = [adminUser];
                changed = true;
            }
        }

        if (!current.invites) {
            current.invites = [];
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
        }
    } catch {
        // failed to read, overwrite or ignore
    }
}

export function getEmails(): Email[] {
    try {
        const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

export function saveEmail(email: Email) {
    const emails = getEmails();
    emails.unshift(email);
    const trimmed = emails.slice(0, 300);
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(trimmed, null, 2));
}

export function getSettings(): Settings {
    try {
        const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Failed to load settings from " + SETTINGS_FILE, error);
        return {
            allowedDomains: [],
            users: [],
            invites: []
        };
    }
}

export function saveSettings(settings: Settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
