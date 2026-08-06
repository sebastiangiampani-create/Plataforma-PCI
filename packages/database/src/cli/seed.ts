import { loadDatabaseConfig } from '@pci/config';
import { createPool } from '../pool.js';
import { runSeeds } from '../seed-runner.js';

async function main() {
  const config = loadDatabaseConfig(process.env);
  const pool = createPool(config);
  const client = await pool.connect();

  try {
    const result = await runSeeds(client);
    console.info(`Seeds ejecutados: ${result.executed.length}`);
    for (const name of result.executed) console.info(`  * ${name}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
