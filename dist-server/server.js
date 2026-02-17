"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
const smtp_server_1 = require("smtp-server");
const mailparser_1 = require("mailparser");
const html_to_text_1 = require("html-to-text");
const store_1 = require("./lib/store");
const crypto_1 = require("crypto");
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const smtpPort = 25;
const app = (0, next_1.default)({ dev, hostname, port });
const handle = app.getRequestHandler();
app.prepare().then(() => {
    // HTTP Server for Next.js
    (0, http_1.createServer)(async (req, res) => {
        try {
            const parsedUrl = (0, url_1.parse)(req.url, true);
            await handle(req, res, parsedUrl);
        }
        catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    }).listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
    // SMTP Server
    const server = new smtp_server_1.SMTPServer({
        authOptional: true, // Allow without auth
        async onRcptTo(address, session, callback) {
            const settings = await (0, store_1.getSettings)();
            if (settings.allowedDomains && settings.allowedDomains.length > 0) {
                const email = address.address;
                const domain = email.split('@')[1];
                if (!domain || !settings.allowedDomains.includes(domain.toLowerCase())) {
                    return callback(new Error('Domain not allowed'));
                }
            }
            callback(); // Accept
        },
        onData(stream, session, callback) {
            (0, mailparser_1.simpleParser)(stream, async (err, parsed) => {
                var _a, _b, _c, _d, _e, _f;
                if (err) {
                    console.error('Failed to parse email', err);
                    return callback(new Error('Failed to parse email'));
                }
                var subject = parsed.subject || '';
                if (subject !== 'You have a friend request in Habbo') {
                    const email = {
                        id: (0, crypto_1.randomUUID)(),
                        from: {
                            address: ((_b = (_a = parsed.from) === null || _a === void 0 ? void 0 : _a.value[0]) === null || _b === void 0 ? void 0 : _b.address) || '',
                            name: ((_d = (_c = parsed.from) === null || _c === void 0 ? void 0 : _c.value[0]) === null || _d === void 0 ? void 0 : _d.name) || '',
                        },
                        to: Array.isArray(parsed.to)
                            ? parsed.to.map((addr) => {
                                var _a, _b;
                                return ({
                                    address: ((_a = addr.value[0]) === null || _a === void 0 ? void 0 : _a.address) || '',
                                    name: ((_b = addr.value[0]) === null || _b === void 0 ? void 0 : _b.name) || ''
                                });
                            })
                            : parsed.to
                                ? [{ address: ((_e = parsed.to.value[0]) === null || _e === void 0 ? void 0 : _e.address) || '', name: ((_f = parsed.to.value[0]) === null || _f === void 0 ? void 0 : _f.name) || '' }]
                                : [],
                        subject: parsed.subject || '(No Subject)',
                        text: (parsed.html ? (0, html_to_text_1.htmlToText)(parsed.html) : parsed.text) || '',
                        html: parsed.html || parsed.textAsHtml || '',
                        date: new Date().toISOString(),
                    };
                    await (0, store_1.saveEmail)(email);
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
        if (err.code === 'EACCES') {
            console.error("Port 25 requires admin privileges. Please run as Administrator or change the port.");
        }
    });
});
