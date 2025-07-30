import baileys from '@whiskeysockets/baileys';
import pino from 'pino';

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
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '22.04.4'],
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect =
                (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Connection closed.', shouldReconnect ? 'Reconnecting...' : '');
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Jentle Bot connected successfully!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Handle .menu command
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const textMsg = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if (textMsg.toLowerCase() === '.menu') {
            await sock.sendMessage(from, { text: '✅ Jentle Bot is active and running!' });
        }
    });
}

startBot();
