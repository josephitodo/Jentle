const { getGroup } = require("../utils/db")

async function showSettings(sock, jid) {
  const g = getGroup(jid)

  const text = `
⚙ GROUP SETTINGS

Anti-link: ${g.antilink ? "ON" : "OFF"}
Anti-spam: ${g.antispam ? "ON" : "OFF"}
Anti-badword: ${g.antibadword ? "ON" : "OFF"}
Auto-kick: ${g.autokick ? "ON" : "OFF"}
Welcome: ${g.welcome ? "ON" : "OFF"}
`

  await sock.sendMessage(jid, { text })
}

module.exports = { showSettings }
