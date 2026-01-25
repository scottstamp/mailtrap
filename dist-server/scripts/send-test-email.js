"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
async function main() {
    const transporter = nodemailer_1.default.createTransport({
        host: 'localhost',
        port: 25,
        secure: false,
        tls: {
            rejectUnauthorized: false
        }
    });
    try {
        const info = await transporter.sendMail({
            from: '"Test User" <test@example.com>',
            to: 'admin@cntct.ca',
            subject: 'Hello from Localhost ✔',
            text: 'Hello world?', // plain text body
            html: '<b>Hello world?</b><br>This is a test email sent to localhost:25.<img src="https://via.placeholder.com/150" alt="Placeholder">', // html body
        });
        console.log('Message sent: %s', info.messageId);
    }
    catch (error) {
        console.error('Error sending email:', error);
    }
}
main();
