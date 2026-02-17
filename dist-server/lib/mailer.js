"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const store_1 = require("./store");
async function sendEmail(to, subject, text) {
    const smtp = await (0, store_1.getSMTPSettings)();
    if (!smtp || !smtp.enabled) {
        console.log("SMTP not configured or enabled. Skipping email.");
        console.log(`To: ${to}\nSubject: ${subject}\nText: ${text}`);
        return false;
    }
    const transporter = nodemailer_1.default.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
            user: smtp.user,
            pass: smtp.pass
        }
    });
    try {
        await transporter.sendMail({
            from: smtp.from,
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
