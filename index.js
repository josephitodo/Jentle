import baileys from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = baileys;

console.log("🚀 Jentle Bot is starting...");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '22.04.4'],
    });

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("📸 Scan this QR to login:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect =
                (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Connection closed.', shouldReconnect ? 'Reconnecting...' : '');
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Jentle Bot connected successfully!');
        }
    });

    // Save creds
    sock.ev.on('creds.update', saveCreds);

    // Improved message handler
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;

            // Extract text from various message types
            const type = Object.keys(msg.message)[0];
            let textMsg = '';
            if (type === 'conversation') textMsg = msg.message.conversation;
            else if (type === 'extendedTextMessage') textMsg = msg.message.extendedTextMessage.text;
            else if (type === 'imageMessage' && msg.message.imageMessage.caption)
                textMsg = msg.message.imageMessage.caption;
            else if (type === 'videoMessage' && msg.message.videoMessage.caption)
                textMsg = msg.message.videoMessage.caption;

            if (textMsg.trim().toLowerCase() === '.menu') {
                await sock.sendMessage(from, { text: '✅ Jentle Bot is active and running!' });
            }
        } catch (err) {
            console.error('Message handler error:', err);
        }
    });
}

startBot();
