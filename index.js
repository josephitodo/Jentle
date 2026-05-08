const makeWASocket = require("@whiskeysockets/baileys").default
const {
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys")

const pino = require("pino")
const fs = require("fs")
const qrcode = require("qrcode-terminal")

// --- Filter noisy Baileys logs ---
const filterLogs = (method) => (...args) => {
    if (args.some(a => typeof a === "string" && a.includes("Closing stale open session"))) return
    if (args.some(a => typeof a === "string" && a.includes("Closing session:"))) return
    method(...args)
}

console.log = filterLogs(console.log)
console.error = filterLogs(console.error)

let reconnecting = false

async function startBot() {
    try {
        console.log("🚀 Jentle is starting...")

        const { state, saveCreds } = await useMultiFileAuthState("auth")

        const sock = makeWASocket({
            logger: pino({ level: "fatal" }),
            auth: state,
            printQRInTerminal: false,
            browser: ["Jentle Bot", "Chrome", "1.0.0"]
        })

        // Pairing code login (best for hosting)
        if (!state.creds.registered) {
            const phoneNumber = "234XXXXXXXXXX" // CHANGE THIS
            const code = await sock.requestPairingCode(phoneNumber)
            console.log(`🔑 Pairing Code: ${code}`)
        }

        // Save session
        sock.ev.on("creds.update", async () => {
            await saveCreds()
            console.log("💾 Session saved!")
        })

        // Connection handling
        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update

            // QR fallback
            if (qr && !state.creds.registered) {
                console.log("📸 Scan QR if pairing code fails:")
                qrcode.generate(qr, { small: true })
            }

            if (connection === "open") {
                reconnecting = false
                console.log("✅ Jentle connected successfully!")
            }

            if (connection === "close") {
                const reason = lastDisconnect?.error?.output?.statusCode

                if (reason === DisconnectReason.loggedOut) {
                    console.log("❌ Logged out! Delete auth folder and login again.")
                    return
                }

                if (!reconnecting) {
                    reconnecting = true
                    console.log("⚠️ Connection lost. Reconnecting in 5 seconds...")
                    setTimeout(() => {
                        startBot()
                    }, 5000)
                }
            }
        })

        // Blocked ad keywords
        const blockedWords = [
            "bet now",
            "loan offer",
            "crypto",
            "airdrop",
            "dm for business",
            "click here",
            "investment",
            "earn money fast",
            "promo",
            "casino",
            "giveaway",
            "forex"
        ]

        // Incoming messages
        sock.ev.on("messages.upsert", async (m) => {
            try {
                const msg = m.messages[0]
                if (!msg?.message) return
                if (msg.key.remoteJid === "status@broadcast") return

                const jid = msg.key.remoteJid
                const sender = msg.key.participant || msg.key.remoteJid

                const text =
                    msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    msg.message.imageMessage?.caption ||
                    msg.message.videoMessage?.caption ||
                    ""

                if (!text) return

                // Menu command
                if (text.trim().toLowerCase() === ".menu") {
                    await sock.sendMessage(jid, {
                        text: "✅ Jentle Bot is active and protecting this group."
                    })
                    return
                }

                // Group moderation
                if (jid.endsWith("@g.us")) {
                    const groupMeta = await sock.groupMetadata(jid)

                    const admins = groupMeta.participants
                        .filter(p => p.admin)
                        .map(p => p.id)

                    const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net"
                    const botIsAdmin = admins.includes(botId)

                    if (!botIsAdmin) {
                        console.log("⚠️ Bot is not admin in this group.")
                        return
                    }

                    // Skip admin messages
                    if (admins.includes(sender)) return

                    const hasLink = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|net|org|ng|io|me|xyz|ly|app|co))/i.test(text)

                    const hasAd = blockedWords.some(word =>
                        text.toLowerCase().includes(word)
                    )

                    if (hasLink || hasAd) {
                        await sock.sendMessage(jid, {
                            delete: msg.key
                        })

                        await sock.sendMessage(jid, {
                            text: `⚠️ @${sender.split("@")[0]} Ads and links are not allowed here.`,
                            mentions: [sender]
                        })

                        console.log(`🗑 Deleted spam from ${sender}`)
                        return
                    }
                }

            } catch (err) {
                console.log("Message handling error:", err.message)
            }
        })

    } catch (err) {
        console.log("Startup error:", err.message)

        if (!reconnecting) {
            reconnecting = true
            setTimeout(() => {
                startBot()
            }, 5000)
        }
    }
}

startBot()
