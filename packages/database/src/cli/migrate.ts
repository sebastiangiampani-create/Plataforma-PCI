import { loadDatabaseConfig } from '@pci/config';
import { createPool } from '../pool.js';
import { getMigrationStatus, runMigrationsDown, runMigrationsUp } from '../migration-runner.js';

async function main() {
  const command = process.argv[2] ?? 'up';
  const config = loadDatabaseConfig(process.env);
  const pool = createPool(config);
  const client = await pool.connect();

  try {
    if (command === 'up') {
      const result = await runMigrationsUp(client);
      console.info(`Migraciones aplicadas: ${result.applied.length}`);
      for (const name of result.applied) console.info(`  + ${name}`);
      console.info(`Migraciones ya aplicadas (sin cambios): ${result.skipped.length}`);
    } else if (command === 'down') {
      const stepsArg = process.argv.find((arg) => arg.startsWith('--steps='));
      const steps = stepsArg ? Number(stepsArg.split('=')[1]) : 1;
      const result = await runMigrationsDown(client, undefined, steps);
      console.info(`Migraciones revertidas: ${result.rolledBack.length}`);
      for (const name of result.rolledBack) console.info(`  - ${name}`);
    } else if (command === 'status') {
      const status = await getMigrationStatus(client);
      for (const item of status) {
        const flag = item.applied ? (item.drifted ? 'DRIFT' : 'OK') : 'PENDIENTE';
        console.info(`[${flag}] ${item.name}`);
      }
    } else {
      console.error(`Comando desconocido: "${command}". Use: up | down | status`);
      process.exitCode = 1;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
