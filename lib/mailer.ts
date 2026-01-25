import nodemailer from 'nodemailer';
import { getSettings } from './store';

export async function sendEmail(to: string, subject: string, text: string) {
    const settings = getSettings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("SMTP not configured or enabled. Skipping email.");
        console.log(`To: ${to}\nSubject: ${subject}\nText: ${text}`);
        return false;
    }

    const transporter = nodemailer.createTransport({
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
    } catch (error) {
        console.error("Failed to send email via external SMTP", error);
        return false;
    }
}
