const fs = require("fs")

const DB_FILE = "./database.json"

function ensureDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({
        groups: {},
        warnings: {},
        rules: {}
      }, null, 2)
    )
  }
}

function loadDB() {
  ensureDB()
  return JSON.parse(fs.readFileSync(DB_FILE))
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
}

function getGroup(groupId) {
  const db = loadDB()

  if (!db.groups[groupId]) {
    db.groups[groupId] = {
      antilink: true,
      antispam: true,
      antibadword: false,
      autokick: true,
      welcome: true
    }
    saveDB(db)
  }

  return db.groups[groupId]
}

function updateGroup(groupId, key, value) {
  const db = loadDB()
  if (!db.groups[groupId]) db.groups[groupId] = {}
  db.groups[groupId][key] = value
  saveDB(db)
}

function getWarnings(groupId, user) {
  const db = loadDB()
  if (!db.warnings[groupId]) db.warnings[groupId] = {}
  return db.warnings[groupId][user] || 0
}

function setWarnings(groupId, user, count) {
  const db = loadDB()
  if (!db.warnings[groupId]) db.warnings[groupId] = {}
  db.warnings[groupId][user] = count
  saveDB(db)
}

function resetWarnings(groupId, user) {
  const db = loadDB()
  if (!db.warnings[groupId]) return
  delete db.warnings[groupId][user]
  saveDB(db)
}

function setRules(groupId, text) {
  const db = loadDB()
  db.rules[groupId] = text
  saveDB(db)
}

function getRules(groupId) {
  const db = loadDB()
  return db.rules[groupId] || "No rules set."
}

module.exports = {
  loadDB,
  saveDB,
  getGroup,
  updateGroup,
  getWarnings,
  setWarnings,
  resetWarnings,
  setRules,
  getRules
}
