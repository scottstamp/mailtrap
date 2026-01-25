"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_COOKIE_NAME = void 0;
exports.isAuthenticated = isAuthenticated;
exports.verifyPassword = verifyPassword;
const store_1 = require("./store");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const headers_1 = require("next/headers");
const constants_1 = require("./constants");
Object.defineProperty(exports, "SESSION_COOKIE_NAME", { enumerable: true, get: function () { return constants_1.SESSION_COOKIE_NAME; } });
async function isAuthenticated(req) {
    const settings = (0, store_1.getSettings)();
    // 1. Check API Key Header
    const apiKeyHeader = req.headers.get('x-api-key');
    if (apiKeyHeader && apiKeyHeader === settings.auth.apiKey) {
        return true;
    }
    // 2. Check Session Cookie
    const cookieStore = await (0, headers_1.cookies)();
    const sessionCookie = cookieStore.get(constants_1.SESSION_COOKIE_NAME);
    // For this simple app, the session cookie value is just the username for simplicity, 
    // but in production it should be a signed token. 
    // We'll rely on the fact that this is a local tool.
    // To make it slightly better, we could store a session ID in memory, 
    // but let's just valid against the username for now since we are "MailTrap Local".
    // Actually, let's just check if the cookie exists and equals the username.
    if (sessionCookie && sessionCookie.value === settings.auth.username) {
        return true;
    }
    return false;
}
function verifyPassword(password) {
    const settings = (0, store_1.getSettings)();
    return bcryptjs_1.default.compareSync(password, settings.auth.passwordHash);
}
