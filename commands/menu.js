async function showMenu(sock, jid) {
  const text = `
╔══════════════════╗
   🤖 JENTLE BOT V2
╚══════════════════╝

👑 OWNER COMMANDS

⚙ MODERATION
.antilink on/off
.antispam on/off
.antibadword on/off
.autokick on/off
.welcome on/off

👮 ADMIN TOOLS
.tagall
.warn @user
.resetwarn @user
.remove @user
.promote @user
.demote @user

🏠 GROUP CONTROL
.group open
.group close
.setrules your rules
.rules

📊 INFO
.menu
.settings
.ping
`

  await sock.sendMessage(jid, { text })
}

module.exports = { showMenu }
