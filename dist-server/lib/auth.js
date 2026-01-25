"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_COOKIE_NAME = void 0;
exports.getCurrentUser = getCurrentUser;
exports.isAuthenticated = isAuthenticated;
exports.verifyPassword = verifyPassword;
const store_1 = require("./store");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const headers_1 = require("next/headers");
const constants_1 = require("./constants");
Object.defineProperty(exports, "SESSION_COOKIE_NAME", { enumerable: true, get: function () { return constants_1.SESSION_COOKIE_NAME; } });
async function getCurrentUser(req) {
    const settings = (0, store_1.getSettings)();
    if (!settings.users)
        return null;
    // 1. Check API Key Header
    const apiKeyHeader = req.headers.get('x-api-key');
    if (apiKeyHeader) {
        const user = settings.users.find(u => u.apiKey === apiKeyHeader);
        if (user)
            return user;
    }
    // 2. Check Session Cookie
    const cookieStore = await (0, headers_1.cookies)();
    const sessionCookie = cookieStore.get(constants_1.SESSION_COOKIE_NAME);
    if (sessionCookie && sessionCookie.value) {
        const sessions = (0, store_1.getSessions)();
        const activeSession = sessions.find(s => s.token === sessionCookie.value && s.expiresAt > Date.now());
        if (activeSession) {
            const user = settings.users.find(u => u.id === activeSession.userId);
            if (user)
                return user;
        }
    }
    return null;
}
async function isAuthenticated(req) {
    const user = await getCurrentUser(req);
    return !!user;
}
function verifyPassword(username, password) {
    const settings = (0, store_1.getSettings)();
    const user = settings.users.find(u => u.username === username);
    if (!user)
        return false;
    return bcryptjs_1.default.compareSync(password, user.passwordHash);
}
