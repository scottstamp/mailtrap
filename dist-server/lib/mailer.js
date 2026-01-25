"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const store_1 = require("./store");
async function sendEmail(to, subject, text) {
    const settings = (0, store_1.getSettings)();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("SMTP not configured or enabled. Skipping email.");
        console.log(`To: ${to}\nSubject: ${subject}\nText: ${text}`);
        return false;
    }
    const transporter = nodemailer_1.default.createTransport({
        host: settings.smtp.host,
        port: settings.smtp.port,
        secure: settings.smtp.secure,
        auth: {
            user: settings.smtp.user,
            pass: settings.smtp.pass
        }
    });
    try {
        await transporter.sendMail({
            from: settings.smtp.from,
            to,
            subject,
            text
        });
        return true;
    }
    catch (error) {
        console.error("Failed to send email via external SMTP", error);
        return false;
    }
}
