const OWNER = "2348106184386"

const badWords = [
  "fuck",
  "shit",
  "idiot",
  "stupid",
  "bastard"
]

function getText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.ephemeralMessage?.message?.conversation ||
    msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
    ""
  )
}

function isOwner(sender) {
  return sender.includes(OWNER)
}

function isLink(text) {
  return /(https?:\/\/|www\.|chat\.whatsapp\.com|[a-zA-Z0-9-]+\.(com|net|org|ng|io|me|xyz|ly|app|co))/i.test(text)
}

function isSpam(text) {
  const blockedWords = [
    "bet now",
    "loan offer",
    "crypto",
    "airdrop",
    "promo",
    "casino",
    "giveaway",
    "forex"
  ]

  return blockedWords.some(word =>
    text.toLowerCase().includes(word)
  )
}

function isBadWord(text) {
  return badWords.some(word =>
    text.toLowerCase().includes(word)
  )
}

module.exports = {
  OWNER,
  getText,
  isOwner,
  isLink,
  isSpam,
  isBadWord
}
