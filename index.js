const makeWASocket = require("@whiskeysockets/baileys").default
const { useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const pino = require("pino")
const fs = require("fs")
const qrcode = require("qrcode-terminal")
const AdmZip = require("adm-zip")

// --- Filter noisy Baileys logs ---
const originalLog = console.log
console.log = (...args) => {
    if (args.some(a => typeof a === "string" && a.includes("Closing stale open session"))) return
    if (args.some(a => typeof a === "string" && a.includes("Closing session:"))) return
    originalLog(...args)
}

// --- Auto-backup auth folder ---
async function backupAuth() {
    if (!fs.existsSync("auth")) return
    const zip = new AdmZip()
    zip.addLocalFolder("auth")
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupFile = `backup-auth-${timestamp}.zip`
    zip.writeZip(backupFile)
    console.log(`📦 Auth folder backed up as: ${backupFile}`)
}

// --- Start the bot ---
async function startBot() {
    console.log("🚀 Jentle is starting...")

    const { state, saveCreds } = await useMultiFileAuthState("auth")
    console.log("✅ Auth folder loaded successfully!")

    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: false
    })

    // Save session and auto-backup
    sock.ev.on("creds.update", async () => {
        await saveCreds()
        console.log("💾 Session saved!")
        await backupAuth()
    })

    // Connection updates (handle QR codes, reconnects, etc.)
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr && !fs.existsSync("auth/creds.json")) {
            console.log("📸 Scan this QR to login:")
            qrcode.generate(qr, { small: true })
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode
            if (reason === DisconnectReason.loggedOut) {
                console.log("❌ Logged out! Delete auth folder and scan QR again.")
            } else {
                console.log("⚠️ Connection closed. Reconnecting...")
                startBot()
            }
        }

        if (connection === "open") {
            console.log("✅ Jentle connected successfully and session is stable!")
        }
    })

    // Message handler (basic commands, AFK ready)
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0]
        if (!msg.message) return
        if (msg.key.remoteJid === "status@broadcast") return

        const sender = msg.key.participant || msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

        // Example: simple test command
        if (text.trim().toLowerCase() === ".menu") {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "✅ Jentle is active and running!"
            })
        }

        // More features will be added here (AFK, mute, etc.)
    })
}

startBot()
