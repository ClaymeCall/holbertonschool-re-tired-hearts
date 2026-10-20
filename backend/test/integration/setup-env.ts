// Runs before every integration test file, before the application code is loaded: the app is
// pointed at a SEPARATE database (`<DB_NAME>_test`), so the tests can empty their tables
// without ever touching the development data.
const databaseName = process.env.DB_NAME ?? 'retired_hearts';
process.env.DB_NAME = databaseName.endsWith('_test') ? databaseName : `${databaseName}_test`;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'integration-test-secret';

export {};
