const {
  getWarnings,
  setWarnings,
  resetWarnings,
  getGroup
} = require("../utils/db")

async function handleAdmin(sock, jid, msg, text) {
  const mentioned =
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

  const target = mentioned[0]

  if (text === ".tagall") {
    const metadata = await sock.groupMetadata(jid)
    const mentions = metadata.participants.map(p => p.id)

    const textMsg = mentions.map(m => `@${m.split("@")[0]}`).join("\n")

    await sock.sendMessage(jid, {
      text: textMsg,
      mentions
    })

    return true
  }

  if (!target) return false

  if (text === ".warn") {
    let count = getWarnings(jid, target) + 1
    setWarnings(jid, target, count)

    await sock.sendMessage(jid, {
      text: `⚠️ Warning ${count}/3`,
      mentions: [target]
    })

    const settings = getGroup(jid)

    if (count >= 3 && settings.autokick) {
      await sock.groupParticipantsUpdate(jid, [target], "remove")
    }

    return true
  }

  if (text === ".resetwarn") {
    resetWarnings(jid, target)

    await sock.sendMessage(jid, {
      text: "✅ Warnings reset.",
      mentions: [target]
    })

    return true
  }

  if (text === ".remove") {
    await sock.groupParticipantsUpdate(jid, [target], "remove")
    return true
  }

  if (text === ".promote") {
    await sock.groupParticipantsUpdate(jid, [target], "promote")
    return true
  }

  if (text === ".demote") {
    await sock.groupParticipantsUpdate(jid, [target], "demote")
    return true
  }

  return false
}

module.exports = { handleAdmin }
