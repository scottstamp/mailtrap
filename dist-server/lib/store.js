"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmails = getEmails;
exports.saveEmail = saveEmail;
exports.getSettings = getSettings;
exports.saveSettings = saveSettings;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const STORAGE_FILE = path_1.default.join(process.cwd(), 'emails.json');
const SETTINGS_FILE = path_1.default.join(process.cwd(), 'settings.json');
// Initialize files if not exist
if (!fs_1.default.existsSync(STORAGE_FILE)) {
    fs_1.default.writeFileSync(STORAGE_FILE, JSON.stringify([]));
}
if (!fs_1.default.existsSync(SETTINGS_FILE)) {
    const adminUser = {
        id: (0, crypto_1.randomUUID)(),
        username: 'admin',
        passwordHash: bcryptjs_1.default.hashSync('password', 10),
        role: 'admin',
        allowedDomains: ['*'],
        apiKey: (0, crypto_1.randomUUID)()
    };
    const defaultSettings = {
        allowedDomains: [],
        users: [adminUser],
        invites: []
    };
    fs_1.default.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
}
else {
    // Migration for existing settings file
    try {
        const current = JSON.parse(fs_1.default.readFileSync(SETTINGS_FILE, 'utf-8'));
        let changed = false;
        // Migrate legacy auth to users array if users doesn't exist
        if (!current.users || current.users.length === 0) {
            if (current.auth) {
                const adminUser = {
                    id: (0, crypto_1.randomUUID)(),
                    username: current.auth.username || 'admin',
                    passwordHash: current.auth.passwordHash || bcryptjs_1.default.hashSync('password', 10),
                    role: 'admin',
                    allowedDomains: ['*'],
                    apiKey: current.auth.apiKey || (0, crypto_1.randomUUID)()
                };
                current.users = [adminUser];
                // Keep auth for safety or remove it? Let's keep it but users array takes precedence in logic
                changed = true;
            }
            else {
                // Fallback if completely broken
                const adminUser = {
                    id: (0, crypto_1.randomUUID)(),
                    username: 'admin',
                    passwordHash: bcryptjs_1.default.hashSync('password', 10),
                    role: 'admin',
                    allowedDomains: ['*'],
                    apiKey: (0, crypto_1.randomUUID)()
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
            fs_1.default.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
        }
    }
    catch (_a) {
        // failed to read, overwrite or ignore
    }
}
function getEmails() {
    try {
        const data = fs_1.default.readFileSync(STORAGE_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        return [];
    }
}
function saveEmail(email) {
    const emails = getEmails();
    emails.unshift(email);
    const trimmed = emails.slice(0, 300);
    fs_1.default.writeFileSync(STORAGE_FILE, JSON.stringify(trimmed, null, 2));
}
function getSettings() {
    try {
        const data = fs_1.default.readFileSync(SETTINGS_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error("Failed to load settings from " + SETTINGS_FILE, error);
        return {
            allowedDomains: [],
            users: [],
            invites: []
        };
    }
}
function saveSettings(settings) {
    fs_1.default.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
