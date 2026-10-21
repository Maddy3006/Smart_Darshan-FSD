/**
 * Copies every collection (documents and indexes) from one MongoDB database to another,
 * e.g. from the local development database to MongoDB Atlas before deploying.
 *
 *   npm run db:copy -- "<target connection string>"
 *   npm run db:copy -- "<target>" --from "<source>"   (default source: MONGO_URI, i.e. the local database)
 *   npm run db:copy -- "<target>" --replace           (empty the target's collections first)
 *
 * Accounts keep their passwords (only bcrypt hashes are stored), so everyone can log in as before.
 * The source is only read, never changed.
 */
import mongoose from 'mongoose';
import env from '../config/env.js';
import { hasDbName } from '../config/db.js';

const DEFAULT_DB = 'smart_darshan';
const BATCH = 1000;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const sourceUri = option('--from') || env.mongoUri;
const targetUri = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--from');
const replace = flag('--replace');

const redact = (uri) => uri.replace(/\/\/([^:/]+):([^@]+)@/, '//$1:****@');

if (!targetUri) {
  console.log('Usage: npm run db:copy -- "<target connection string>" [--from "<source>"] [--replace]');
  process.exit(1);
}
if (sourceUri === targetUri) {
  console.log('[copy] source and target are the same database; nothing to do.');
  process.exit(1);
}

const { MongoClient } = mongoose.mongo;
const source = new MongoClient(sourceUri, { serverSelectionTimeoutMS: 10_000 });
const target = new MongoClient(targetUri, { serverSelectionTimeoutMS: 15_000 });

try {
  await source.connect();
  await target.connect();
  const from = source.db(hasDbName(sourceUri) ? undefined : DEFAULT_DB);
  const to = target.db(hasDbName(targetUri) ? undefined : DEFAULT_DB);
  console.log(`[copy] ${redact(sourceUri)} (${from.databaseName}) -> ${redact(targetUri)} (${to.databaseName})`);

  const collections = (await from.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.'))
    .sort();
  if (!collections.length) throw new Error(`the source database "${from.databaseName}" has no collections`);

  const existing = [];
  for (const name of collections) {
    const count = await to.collection(name).estimatedDocumentCount();
    if (count) existing.push(`${name} (${count})`);
  }
  if (existing.length && !replace) {
    throw new Error(`the target already has data in: ${existing.join(', ')}. Re-run with --replace to overwrite it.`);
  }

  for (const name of collections) {
    const src = from.collection(name);
    const dst = to.collection(name);
    if (replace) await dst.deleteMany({});

    let copied = 0;
    let batch = [];
    for await (const doc of src.find({})) {
      batch.push(doc);
      if (batch.length === BATCH) {
        await dst.insertMany(batch, { ordered: false });
        copied += batch.length;
        batch = [];
      }
    }
    if (batch.length) {
      await dst.insertMany(batch, { ordered: false });
      copied += batch.length;
    }

    const indexes = (await src.indexes()).filter((ix) => ix.name !== '_id_');
    for (const { key, v: _v, ns: _ns, ...options } of indexes) {
      await dst.createIndex(key, options);
    }
    console.log(`[copy] ${name}: ${copied} documents, ${indexes.length} indexes`);
  }
  console.log('[copy] done.');
} catch (err) {
  console.error(`[copy] failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await source.close().catch(() => {});
  await target.close().catch(() => {});
}
