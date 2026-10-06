/**
 * Runs a local MongoDB for development (no installation needed).
 * Data is kept in <project>/.data/db between runs.
 * Skip this if you use MongoDB Atlas or a locally installed MongoDB.
 */
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const port = Number(process.env.LOCAL_DB_PORT || 27017);
const dbPath = fileURLToPath(new URL('../../../.data/db', import.meta.url));

function isPortFree(p) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen(p, '127.0.0.1');
  });
}

if (!(await isPortFree(port))) {
  console.log(`[local-db] port ${port} is already in use; assuming MongoDB is already running there.`);
  process.exit(0);
}

fs.mkdirSync(dbPath, { recursive: true });
console.log('[local-db] starting MongoDB (the first run downloads the MongoDB binary, please wait)...');

const mongod = await MongoMemoryServer.create({
  instance: { port, ip: '127.0.0.1', dbPath, storageEngine: 'wiredTiger' },
});

console.log(`[local-db] MongoDB ready at mongodb://127.0.0.1:${port} (data folder: ${dbPath})`);

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  console.log('[local-db] stopping MongoDB...');
  await mongod.stop({ doCleanup: false });
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
