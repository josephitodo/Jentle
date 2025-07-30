import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import fs from 'fs'
import path from 'path'
import cron from 'node-cron'

async function startBot() {
    console.log("🚀 Jentle Bot is starting...")

    // Load auth state
    const authPath = './auth'
    const { state, saveCreds } = await useMultiFileAuthState(authPath)

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false // we handle QR manually
    })

    // Show QR code only once
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            console.log("📸 QR Code received! Scan it with WhatsApp:")
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'open') {
            console.log("✅ Jentle Bot connected successfully!")
        }

        if (connection === 'close') {
            const shouldReconnect = 
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

            console.log(`⚠️ Connection closed. Reconnect: ${shouldReconnect}`)
            if (shouldReconnect) {
                startBot()
            } else {
                console.log("❌ Logged out. Please scan the QR again.")
            }
        }
    })

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds)

    // Basic test command
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if (!msg.message) return

        const from = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

        if (text.toLowerCase() === ".menu") {
            await sock.sendMessage(from, { text: "✅ Jentle Bot is active and running!" })
        }
    })

    // ---- Auto backup ----
    cron.schedule('0 */6 * * *', () => {
        const backupFile = `auth-backup-${Date.now()}.zip`
        const { exec } = require('child_process')

        exec(`zip -r ${backupFile} auth`, (err) => {
            if (err) {
                console.error("❌ Backup failed:", err)
            } else {
                console.log(`💾 Backup saved as ${backupFile}`)
            }
        })
    })
}

startBot()
