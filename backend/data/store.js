const fs = require("fs");
const path = require("path");

const databasePath = path.join(__dirname, "database.json");

function loadPersistedState() {
  if (!fs.existsSync(databasePath)) {
    return { users: [], ambulances: [], emergencies: [] };
  }

  try {
    const data = JSON.parse(fs.readFileSync(databasePath, "utf8"));
    return {
      users: Array.isArray(data.users) ? data.users : [],
      ambulances: Array.isArray(data.ambulances) ? data.ambulances : [],
      emergencies: Array.isArray(data.emergencies) ? data.emergencies : []
    };
  } catch {
    return { users: [], ambulances: [], emergencies: [] };
  }
}

function savePersistedState(state) {
  const data = {
    users: state.users,
    ambulances: state.ambulances,
    emergencies: state.emergencies.slice(0, 50)
  };

  fs.writeFileSync(databasePath, JSON.stringify(data, null, 2));
}

module.exports = { loadPersistedState, savePersistedState };
