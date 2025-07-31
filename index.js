const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");

// Load feature modules
const autoDelete = require("./lib/autoDelete");
const menu = require("./lib/menu");

async function startBot() {
    console.log("🚀 Jentle is starting...");

    const { state, saveCreds } = await useMultiFileAuthState("auth");
    console.log("✅ Auth folder loaded successfully!");

    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: true
    });

    // Save credentials
    sock.ev.on("creds.update", saveCreds);

    // Connection updates
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log("❌ Logged out! Please delete auth folder and scan QR again.");
            } else {
                console.log("⚠️ Connection closed. Reconnecting...");
                startBot();
            }
        }

        if (connection === "open") {
            console.log("✅ Jentle connected successfully and session is stable!");
        }
    });

    // Handle messages
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        if (msg.key.remoteJid === "status@broadcast") return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // Run all modules
        await autoDelete(sock, msg, text); // auto-delete links
        await menu(sock, msg, text); // .menu command
    });
}

startBot();
