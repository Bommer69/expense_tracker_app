const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');
const fs = require('fs');

const TEMP_URI_FILE = path.join(__dirname, '__mongo_uri__.tmp');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Ghi URI ra file tạm để các Jest worker đọc được
  // (globalSetup chạy process riêng, process.env không truyền sang worker)
  fs.writeFileSync(TEMP_URI_FILE, uri, 'utf8');

  process.env.JWT_SECRET = 'test-secret-key-for-jest';
  process.env.GEMINI_API_KEY = '';

  global.__MONGOD__ = mongod;
};
