import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgres://pci_dev:pci_dev_password@localhost:5432/pci_dev';

/**
 * Crea un esquema Postgres aislado y devuelve un Client cuyo search_path
 * apunta únicamente a ese esquema. Permite correr tests de integración reales
 * contra Postgres sin necesitar una base de datos separada por test.
 */
export async function createIsolatedSchemaClient(): Promise<{
  client: Client;
  schema: string;
  cleanup: () => Promise<void>;
}> {
  const schema = `pci_test_${randomUUID().replace(/-/g, '')}`;
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  await client.query(`CREATE SCHEMA "${schema}";`);
  await client.query(`SET search_path TO "${schema}", public;`);

  const cleanup = async () => {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
    await client.end();
  };

  return { client, schema, cleanup };
}
