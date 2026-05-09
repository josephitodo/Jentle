const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require("@whiskeysockets/baileys")

const pino = require("pino")

const {
  getText,
  isOwner,
  isLink,
  isSpam,
  isBadWord
} = require("./utils/helpers")

const {
  getGroup,
  getWarnings,
  setWarnings
} = require("./utils/db")

const { showMenu } = require("./commands/menu")
const { showSettings } = require("./commands/settings")
const { handleModeration } = require("./commands/moderation")
const { handleAdmin } = require("./commands/admin")
const { handleGroup } = require("./commands/group")

const processedMessages = new Set()

console.log = (...args) => {
  const text = args.join(" ")

  if (
    text.includes("Bad MAC") ||
    text.includes("Closing session") ||
    text.includes("Failed to decrypt")
  ) return

  process.stdout.write(text + "\n")
}

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth")
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "20.0.04"]
    })

    sock.ev.on("creds.update", saveCreds)

    if (!sock.authState.creds.registered) {
      const phoneNumber = "2348106184386".replace(/[^0-9]/g, "")

      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phoneNumber)
          console.log(`🔑 Pairing Code: ${code}`)
        } catch (err) {
          console.log("Pairing failed:", err.message)
        }
      }, 8000)
    }

    sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
      if (connection === "open") {
        console.log("✅ Connected successfully!")
      }

      if (connection === "close") {
        const reason = lastDisconnect?.error?.output?.statusCode

        if (reason === DisconnectReason.loggedOut) {
          console.log("❌ Logged out.")
          return
        }

        console.log("🔄 Reconnecting...")
        startBot()
      }
    })

    sock.ev.on("group-participants.update", async update => {
      try {
        const settings = getGroup(update.id)
        if (!settings.welcome) return

        for (const participant of update.participants) {
          if (update.action === "add") {
            await sock.sendMessage(update.id, {
              text: `👋 Welcome @${participant.split("@")[0]}`,
              mentions: [participant]
            })
          }

          if (update.action === "remove") {
            await sock.sendMessage(update.id, {
              text: `👋 Goodbye @${participant.split("@")[0]}`,
              mentions: [participant]
            })
          }
        }
      } catch {}
    })

    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        const msg = messages[0]
        if (!msg?.message) return
        if (msg.key.remoteJid === "status@broadcast") return

        if (processedMessages.has(msg.key.id)) return
        processedMessages.add(msg.key.id)

        const jid = msg.key.remoteJid
        const sender = msg.key.participant || jid
        const text = getText(msg)

        if (!text) return

        const lower = text.trim().toLowerCase()

        console.log("Incoming:", lower)

        if (lower === ".menu") {
          await showMenu(sock, jid)
          return
        }

        if (lower === ".ping") {
          await sock.sendMessage(jid, {
            text: "🏓 Pong! Jentle is online."
          })
          return
        }

        if (isOwner(sender)) {
          if (lower === ".settings") {
            await showSettings(sock, jid)
            return
          }

          if (await handleModeration(sock, jid, lower)) return
          if (await handleAdmin(sock, jid, msg, lower)) return
          if (await handleGroup(sock, jid, text)) return
        }

        if (!jid.endsWith("@g.us")) return
        if (msg.key.fromMe) return

        const metadata = await sock.groupMetadata(jid)

        const admins = metadata.participants
          .filter(p => p.admin)
          .map(p => p.id)

        if (isOwner(sender)) return
        if (admins.includes(sender)) return

        const settings = getGroup(jid)

        let violation = false

        if (settings.antilink && isLink(text)) violation = true
        if (settings.antispam && isSpam(text)) violation = true
        if (settings.antibadword && isBadWord(text)) violation = true

        if (!violation) return

        let warns = getWarnings(jid, sender) + 1
        setWarnings(jid, sender, warns)

        await sock.sendMessage(jid, {
          delete: {
            remoteJid: jid,
            fromMe: false,
            id: msg.key.id,
            participant: sender
          }
        })

        if (settings.autokick && warns >= 3) {
          await sock.groupParticipantsUpdate(jid, [sender], "remove")

          await sock.sendMessage(jid, {
            text: `🚫 @${sender.split("@")[0]} removed after 3 warnings.`,
            mentions: [sender]
          })
        } else {
          await sock.sendMessage(jid, {
            text: `⚠️ Warning ${warns}/3`,
            mentions: [sender]
          })
        }

      } catch (err) {
        console.log("Message error:", err.message)
      }
    })

  } catch (err) {
    console.log("Startup error:", err.message)
  }
}

startBot()
