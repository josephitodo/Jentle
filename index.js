const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const AdmZip = require("adm-zip");
const path = require("path");

// Backup function
async function backupAuth() {
    if (!fs.existsSync("auth")) return;

    const zip = new AdmZip();
    zip.addLocalFolder("auth");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join("backups", `auth-backup-${timestamp}.zip`);

    // Create backups folder if it doesn't exist
    if (!fs.existsSync("backups")) fs.mkdirSync("backups");

    zip.writeZip(backupFile);
    console.log(`📦 Auth folder backed up at: ${backupFile}`);
}

// Start bot
async function startBot() {
    console.log("🚀 Jentle is starting...");

    const { state, saveCreds } = await useMultiFileAuthState("auth");
    console.log("✅ Auth folder loaded successfully!");

    const sock = makeWASocket({
        logger: pino({ level: "silent" }), // silence all Baileys logs
        auth: state,
        printQRInTerminal: false
    });

    // Auto-save and backup session
    sock.ev.on("creds.update", async () => {
        await saveCreds();
        console.log("💾 Session saved!");
        await backupAuth();
    });

    // Connection updates
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !fs.existsSync("auth/creds.json")) {
            console.log("📸 Scan this QR code to log in:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log("❌ Logged out! Delete auth folder and re-scan QR.");
            } else {
                console.log("⚠️ Connection lost. Reconnecting...");
                startBot();
            }
        }

        if (connection === "open") {
            console.log("✅ Jentle connected and session is stable!");
        }
    });

    // Message listener
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        if (msg.key.remoteJid === "status@broadcast") return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // Auto-delete links in groups (if sender not admin)
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
