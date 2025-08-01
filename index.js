const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const P = require('pino');

// Disable noisy logs (Baileys internal logger)
const silentLogger = P({ level: "silent" });

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: true,
        logger: silentLogger // ✅ This disables Baileys logs
    });

    // ✅ Debug: Only log incoming messages
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        console.log("\n📩 Debug message:", msg.key.remoteJid, msg.message);

        // Respond to .menu command
        if (msg.message.conversation && msg.message.conversation.toLowerCase() === '.menu') {
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Jentle Bot is alive!\n\nHere is your menu...' });
        }
    });

    // Connection updates
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
            console.log("✅ Jentle Bot connected successfully!");
        }
    });

    // Save credentials
    sock.ev.on('creds.update', saveCreds);
}

console.log("🚀 Starting Jentle Bot...");
startBot();
