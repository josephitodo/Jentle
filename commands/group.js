const { setRules, getRules } = require("../utils/db")

async function handleGroup(sock, jid, text) {
  const cmd = text.toLowerCase()

  if (cmd === ".group open") {
    await sock.groupSettingUpdate(jid, "not_announcement")
    await sock.sendMessage(jid, { text: "✅ Group opened." })
    return true
  }

  if (cmd === ".group close") {
    await sock.groupSettingUpdate(jid, "announcement")
    await sock.sendMessage(jid, { text: "✅ Group closed." })
    return true
  }

  if (text.startsWith(".setrules ")) {
    const rules = text.replace(".setrules ", "")
    setRules(jid, rules)
    await sock.sendMessage(jid, { text: "✅ Rules updated." })
    return true
  }

  if (cmd === ".rules") {
    await sock.sendMessage(jid, {
      text: `📜 RULES\n\n${getRules(jid)}`
    })
    return true
  }

  return false
}

module.exports = { handleGroup }
