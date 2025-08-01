const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');

// Disable noisy logs using pino (Baileys uses it internally)
const logger = pino({ level: 'error' });

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        version,
        logger // Pass the silent logger
    });

    // Debug: Log every incoming message
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        // Show message content in terminal
        console.log("\n📩 Incoming message debug:", JSON.stringify(msg, null, 2));

        // Respond to .menu
        if (msg.message.conversation && msg.message.conversation.toLowerCase() === '.menu') {
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Jentle Bot is active!\n\nHere is your menu...' });
        }
    });

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                console.log("♻️ Reconnecting...");
                startBot();
            } else {
                console.log("❌ Logged out. Delete auth folder and re-scan QR.");
            }
        } else if (connection === 'open') {
            console.log("✅ Jentle Bot is connected and ready!");
        }
    });

    // Save session
    sock.ev.on('creds.update', saveCreds);
}

console.log("🚀 Jentle is starting...");
startBot();
