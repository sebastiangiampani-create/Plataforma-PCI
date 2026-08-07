export interface QueryResultLike<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number | null;
}

/**
 * Contrato mínimo compartido por pg.Pool, pg.Client y pg.PoolClient.
 * Permite testear el runner con cualquiera de los tres sin acoplarse a Pool.
 */
export interface Queryable {
  query<T extends object = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResultLike<T>>;
}
