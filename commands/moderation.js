const { updateGroup } = require("../utils/db")

async function handleModeration(sock, jid, text) {
  const cmd = text.toLowerCase()

  const actions = {
    ".antilink on": ["antilink", true, "Anti-link enabled"],
    ".antilink off": ["antilink", false, "Anti-link disabled"],
    ".antispam on": ["antispam", true, "Anti-spam enabled"],
    ".antispam off": ["antispam", false, "Anti-spam disabled"],
    ".antibadword on": ["antibadword", true, "Anti-badword enabled"],
    ".antibadword off": ["antibadword", false, "Anti-badword disabled"],
    ".autokick on": ["autokick", true, "Auto-kick enabled"],
    ".autokick off": ["autokick", false, "Auto-kick disabled"],
    ".welcome on": ["welcome", true, "Welcome enabled"],
    ".welcome off": ["welcome", false, "Welcome disabled"]
  }

  if (actions[cmd]) {
    const [key, value, msg] = actions[cmd]
    updateGroup(jid, key, value)
    await sock.sendMessage(jid, { text: `✅ ${msg}` })
    return true
  }

  return false
}

module.exports = { handleModeration }
