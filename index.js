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

    // Listen for messages
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const textMsg = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // Respond to ".menu"
        if (textMsg.toLowerCase() === '.menu') {
            await sock.sendMessage(from, { text: '✅ Jentle Bot is active and running!' });
        }
    });
}

startBot();
