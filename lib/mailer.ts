import nodemailer from 'nodemailer';
import { getSMTPSettings } from './store';

export async function sendEmail(to: string, subject: string, text: string) {
    const smtp = await getSMTPSettings();
    if (!smtp || !smtp.enabled) {
        console.log("SMTP not configured or enabled. Skipping email.");
        console.log(`To: ${to}\nSubject: ${subject}\nText: ${text}`);
        return false;
    }

    const transporter = nodemailer.createTransport({
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
    } catch (error) {
        console.error("Failed to send email via external SMTP", error);
        return false;
    }
}
