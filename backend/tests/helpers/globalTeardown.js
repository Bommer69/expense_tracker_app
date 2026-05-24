const path = require('path');
const fs = require('fs');

const TEMP_URI_FILE = path.join(__dirname, '__mongo_uri__.tmp');

module.exports = async () => {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }
  try { fs.unlinkSync(TEMP_URI_FILE); } catch {}
};
