// Auto delete links in groups
module.exports = async function autoDelete(sock, msg, text) {
    if (!msg.key.remoteJid.endsWith("@g.us")) return;

    const hasLink = /(https?:\/\/|www\.)/i.test(text);
    if (hasLink) {
        const groupMeta = await sock.groupMetadata(msg.key.remoteJid);
        const admins = groupMeta.participants.filter(p => p.admin).map(p => p.id);
        const sender = msg.key.participant;

        if (!admins.includes(sender)) {
            await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
            await sock.sendMessage(msg.key.remoteJid, {
                text: `⚠️ @${sender.split("@")[0]} Links are not allowed!`,
                mentions: [sender]
            });
        }
    }
};
