const makeWASocket = require("@whiskeysockets/baileys").default
const { useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const pino = require("pino")
const fs = require("fs")
const qrcode = require("qrcode-terminal")
const AdmZip = require("adm-zip")
require('events').setMaxListeners(0) // Avoid listener memory warnings

// Auto-backup function
async function backupAuth() {
    if (!fs.existsSync("auth")) return
    const zip = new AdmZip()
    zip.addLocalFolder("auth")
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupFile = `backup-auth-${timestamp}.zip`
    zip.writeZip(backupFile)
    console.log(`📦 Auth folder backed up as: ${backupFile}`)
}

async function startJentle() {
    console.log("🚀 Jentle is starting...")

    const { state, saveCreds } = await useMultiFileAuthState("auth")
    console.log("✅ Auth folder loaded successfully!")

    const sock = makeWASocket({
        logger: pino({ level: "silent" }), // Silence Baileys internal logs
        auth: state,
        printQRInTerminal: false
    })

    // Session save & auto-backup
    sock.ev.on("creds.update", async () => {
        await saveCreds()
        console.log("💾 Session saved!")
        await backupAuth()
    })

    // Connection update handler
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
                startJentle()
            }
        }

        if (connection === "open") {
            console.log("✅ Jentle connected successfully and session is stable!")
        }
    })

    // Message handler
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0]
        if (!msg.message) return
        if (msg.key.remoteJid === "status@broadcast") return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

        // Auto-delete links in groups
        if (msg.key.remoteJid.endsWith("@g.us")) {
            const hasLink = /(https?:\/\/|www\.)/i.test(text)
            if (hasLink) {
                const groupMeta = await sock.groupMetadata(msg.key.remoteJid)
                const admins = groupMeta.participants.filter(p => p.admin).map(p => p.id)
                const sender = msg.key.participant

                if (!admins.includes(sender)) {
                    await sock.sendMessage(msg.key.remoteJid, { delete: msg.key })
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `⚠️ @${sender.split("@")[0]} Links are not allowed!`,
                        mentions: [sender]
                    })
                    return
                }
            }
        }

        // Test command
        if (text.trim().toLowerCase() === ".menu") {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "✅ Jentle is active and running!"
            })
        }
    })
}

startJentle()
