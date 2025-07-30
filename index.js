import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import fs from "fs-extra";

async function startJentle() {
    console.log("🚀 Jentle is starting...");

    const { state, saveCreds } = await useMultiFileAuthState("./auth");

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ["Jentle", "Chrome", "1.0.0"]
    });

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("📸 Scan the QR code above to link Jentle!");
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log("⚠️ Logged out. Remove auth folder & restart.");
            } else {
                console.log("⚠️ Connection closed. Reconnecting...");
                startJentle();
            }
        } else if (connection === "open") {
            console.log("✅ Jentle connected successfully!");
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // Listen for messages
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || "";

        if (text === ".menu") {
            await sock.sendMessage(from, {
                text: "✅ Jentle is active and running!"
            });
        }
    });
}

startJentle();
