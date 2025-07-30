// Jentle Bot - WhatsApp Bot
const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState } = require('@whiskeysockets/baileys')
const fs = require('fs')
const path = require('path')
const qrcode = require('qrcode-terminal')

async function startBot() {
    console.log("🚀 Jentle Bot is starting...")

    // Ensure auth folder exists
    const authDir = path.join(__dirname, 'auth')
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir)
        console.log("📂 Auth folder created!")
    }

    // Load auth state
    const { state, saveCreds } = await useMultiFileAuthState(authDir)

    // Create socket
    const sock = makeWASocket({
        printQRInTerminal: true, // Show QR directly in terminal
        auth: state
    })

    // Save session when updated
    sock.ev.on('creds.update', saveCreds)

    // Connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
            console.log("📸 Scan this QR code to log in:")
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'open') {
            console.log("✅ Jentle Bot connected successfully!")
        } else if (connection === 'close') {
            console.log("⚠️ Connection closed. Reconnecting...")
            startBot()
        }
    })

    // Listen for messages
    sock.ev.on('messages.upsert', async (msg) => {
        const message = msg.messages[0]
        if (!message.message || message.key.fromMe) return

        const sender = message.key.remoteJid
        const text = message.message.conversation || message.message.extendedTextMessage?.text || ''

        if (text.toLowerCase() === '.menu') {
            await sock.sendMessage(sender, { text: "✅ Jentle Bot is active and running!" })
        }
    })
}

startBot()
