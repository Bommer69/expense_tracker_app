const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const TEMP_URI_FILE = path.join(__dirname, '__mongo_uri__.tmp');

function getMongoUri() {
  try {
    return fs.readFileSync(TEMP_URI_FILE, 'utf8').trim();
  } catch {
    return process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-test';
  }
}

async function connect() {
  // Không kết nối lại nếu đã connected
  if (mongoose.connection.readyState === 1) return;
  const uri = getMongoUri();
  await mongoose.connect(uri);
}

async function clearAll() {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map(col => col.deleteMany({}))
  );
}

async function disconnect() {
  await mongoose.disconnect();
}

module.exports = { connect, clearAll, disconnect };
