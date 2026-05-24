module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  globalSetup: './tests/helpers/globalSetup.js',
  globalTeardown: './tests/helpers/globalTeardown.js',
  testTimeout: 30000,
  verbose: true,
  // Chạy tuần tự để tránh xung đột MongoDB shared instance
  maxWorkers: 1,
};
