// Respond to .menu command
module.exports = async function menu(sock, msg, text) {
    if (text.trim().toLowerCase() === ".menu") {
        await sock.sendMessage(msg.key.remoteJid, {
            text: "✅ Jentle is active and running!\n\nFeatures:\n- Auto delete links in groups\n- .menu (show this message)"
        });
    }
};
