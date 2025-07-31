const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const qrcode = require("qrcode-terminal");

async function startBot() {
    console.log("🚀 Jentle is starting...");

    const { state, saveCreds } = await useMultiFileAuthState("auth");
    console.log("✅ Auth folder loaded successfully!");

    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: false // we handle QR manually below
    });

    // Save session automatically
    sock.ev.on("creds.update", async () => {
        await saveCreds();
        console.log("💾 Session saved!");
    });

    // Handle connection updates
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Show QR Code manually if not logged in yet
        if (qr && !fs.existsSync("auth/creds.json")) {
            console.log("📸 Scan this QR to login:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log("❌ Logged out! Delete auth folder and scan QR again.");
            } else {
                console.log("⚠️ Connection closed. Reconnecting...");
                startBot();
            }
        }

        if (connection === "open") {
            console.log("✅ Jentle connected successfully and session is stable!");
        }
    });

    // Handle incoming messages
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        if (msg.key.remoteJid === "status@broadcast") return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // Auto-delete links in groups (if sender is not admin)
        if (msg.key.remoteJid.endsWith("@g.us")) {
            const hasLink = /(https?:\/\/|www\.)/i.test(text);
            if (hasLink) {
                const groupMeta = await sock.groupMetadata(msg.key.remoteJid);
                const admins = groupMeta.participants.filter(p => p.admin).map(p => p.id);
                const sender = msg.key.participant;

                if (!admins.includes(sender)) {
                    await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `⚠️ @${sender.split("@")[0]} Links are not allowed!`,
                        mentions: [sender]
                    });
                    return;
                }
            }
        }

        // Test command
        if (text.trim().toLowerCase() === ".menu") {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "✅ Jentle is active and running!"
            });
        }
    });
}

startBot();
