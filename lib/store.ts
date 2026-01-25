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

export interface Settings {
    allowedDomains: string[];
    auth: {
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
    const defaultSettings: Settings = {
        allowedDomains: [],
        auth: {
            username: 'admin',
            passwordHash: bcrypt.hashSync('password', 10),
            apiKey: randomUUID(),
        }
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
} else {
    // Migration for existing settings file
    try {
        const current = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
        if (!current.auth) {
            current.auth = {
                username: 'admin',
                passwordHash: bcrypt.hashSync('password', 10),
                apiKey: randomUUID(),
            };
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
        return {
            allowedDomains: [],
            auth: {
                username: 'admin',
                passwordHash: '', // Should not happen if init worked
                apiKey: ''
            }
        };
    }
}

export function saveSettings(settings: Settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
