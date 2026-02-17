import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { SMTPServer, SMTPServerSession, SMTPServerDataStream } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { htmlToText } from 'html-to-text';
import { saveEmail, getSettings } from './lib/store';
import { randomUUID } from 'crypto';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const smtpPort = 25;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    // HTTP Server for Next.js
    createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    }).listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });

    // SMTP Server
    const server = new SMTPServer({
        authOptional: true, // Allow without auth
        async onRcptTo(address, session: SMTPServerSession, callback) {
            const settings = await getSettings();
            if (settings.allowedDomains && settings.allowedDomains.length > 0) {
                const email = address.address;
                const domain = email.split('@')[1];
                if (!domain || !settings.allowedDomains.includes(domain.toLowerCase())) {
                    return callback(new Error('Domain not allowed'));
                }
            }
            callback(); // Accept
        },
        onData(stream: SMTPServerDataStream, session: SMTPServerSession, callback) {
            simpleParser(stream, async (err, parsed) => {
                if (err) {
                    console.error('Failed to parse email', err);
                    return callback(new Error('Failed to parse email'));
                }

                var subject = parsed.subject || '';
                if (subject !== 'You have a friend request in Habbo') {
                    const email = {
                        id: randomUUID(),
                        from: {
                            address: parsed.from?.value[0]?.address || '',
                            name: parsed.from?.value[0]?.name || '',
                        },
                        to: Array.isArray(parsed.to)
                            ? parsed.to.map((addr: any) => ({
                                address: addr.value[0]?.address || '',
                                name: addr.value[0]?.name || ''
                            }))
                            : parsed.to
                                ? [{ address: (parsed.to as any).value[0]?.address || '', name: (parsed.to as any).value[0]?.name || '' }]
                                : [],
                        subject: parsed.subject || '(No Subject)',
                        text: (parsed.html ? htmlToText(parsed.html) : parsed.text) || '',
                        html: parsed.html || parsed.textAsHtml || '',
                        date: new Date().toISOString(),
                    };

                    await saveEmail(email);
                }

                callback();
            });
        }
    });

    server.listen(smtpPort, () => {
        console.log(`> SMTP Server listening on port ${smtpPort}`);
    });

    server.on('error', (err) => {
        console.error(`SMTP Server Error: ${err.message}`);
        if ((err as any).code === 'EACCES') {
            console.error("Port 25 requires admin privileges. Please run as Administrator or change the port.");
        }
    });
});
