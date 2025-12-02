/**
 * PostgreSQL Query Builder
 *
 * Provides a Supabase-like chainable API for PostgreSQL queries.
 * Supports: select, insert, update, upsert, delete operations.
 */

import { Pool, QueryResult } from 'pg';

// Types for query results
export interface PostgresError {
  message: string;
  code: string;
  details?: string;
  hint?: string;
}

export interface QueryResponse<T> {
  data: T | null;
  error: PostgresError | null;
  count?: number | null;
}

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in';

interface Filter {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

interface OrderSpec {
  column: string;
  ascending: boolean;
  nullsFirst: boolean;
}

interface RangeSpec {
  from: number;
  to: number;
}

type QueryOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

/**
 * QueryBuilder - Chainable query builder for PostgreSQL
 */
export class QueryBuilder<T = unknown> {
  private pool: Pool;
  private tableName: string;
  private operation: QueryOperation = 'select';
  private selectColumns: string = '*';
  private countOption: 'exact' | null = null;
  private filters: Filter[] = [];
  private orFilters: string[] = [];
  private orderSpecs: OrderSpec[] = [];
  private rangeSpec: RangeSpec | null = null;
  private insertData: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private updateData: Record<string, unknown> | null = null;
  private upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private returningSingle: boolean = false;
  private returningData: boolean = false;

  constructor(pool: Pool, tableName: string) {
    this.pool = pool;
    this.tableName = tableName;
  }

  /**
   * SELECT operation
   */
  select(columns: string = '*', options?: { count?: 'exact' }): this {
    this.operation = 'select';
    this.selectColumns = columns;
    if (options?.count) {
      this.countOption = options.count;
    }
    return this;
  }

  /**
   * INSERT operation
   */
  insert(data: Record<string, unknown> | Record<string, unknown>[]): this {
    this.operation = 'insert';
    this.insertData = data;
    return this;
  }

  /**
   * UPDATE operation
   */
  update(data: Record<string, unknown>): this {
    this.operation = 'update';
    this.updateData = data;
    return this;
  }

  /**
   * DELETE operation
   */
  delete(): this {
    this.operation = 'delete';
    return this;
  }

  /**
   * UPSERT operation (INSERT ... ON CONFLICT)
   */
  upsert(
    data: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean }
  ): this {
    this.operation = 'upsert';
    this.insertData = data;
    this.upsertOptions = options || {};
    return this;
  }

  /**
   * Filter: equals
   */
  eq(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  /**
   * Filter: not equals
   */
  neq(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  /**
   * Filter: greater than
   */
  gt(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'gt', value });
    return this;
  }

  /**
   * Filter: greater than or equal
   */
  gte(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  /**
   * Filter: less than
   */
  lt(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'lt', value });
    return this;
  }

  /**
   * Filter: less than or equal
   */
  lte(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  /**
   * Filter: LIKE pattern match
   */
  like(column: string, pattern: string): this {
    this.filters.push({ column, operator: 'like', value: pattern });
    return this;
  }

  /**
   * Filter: ILIKE pattern match (case insensitive)
   */
  ilike(column: string, pattern: string): this {
    this.filters.push({ column, operator: 'ilike', value: pattern });
    return this;
  }

  /**
   * Filter: IS NULL / IS NOT NULL
   */
  is(column: string, value: null | boolean): this {
    this.filters.push({ column, operator: 'is', value });
    return this;
  }

  /**
   * Filter: IN array
   */
  in(column: string, values: unknown[]): this {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  /**
   * OR filter with Supabase-style syntax
   * Example: .or('ticker.ilike.%search%,name.ilike.%search%')
   */
  or(filterString: string): this {
    this.orFilters.push(filterString);
    return this;
  }

  /**
   * ORDER BY clause
   */
  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean }
  ): this {
    this.orderSpecs.push({
      column,
      ascending: options?.ascending ?? true,
      nullsFirst: options?.nullsFirst ?? false,
    });
    return this;
  }

  /**
   * LIMIT/OFFSET via range
   */
  range(from: number, to: number): this {
    this.rangeSpec = { from, to };
    return this;
  }

  /**
   * LIMIT shorthand
   */
  limit(count: number): this {
    this.rangeSpec = { from: 0, to: count - 1 };
    return this;
  }

  /**
   * Return single row (will error if not exactly 1)
   */
  single(): this {
    this.returningSingle = true;
    return this;
  }

  /**
   * Return data after INSERT/UPDATE/DELETE
   */
  returning(columns: string = '*'): this {
    this.returningData = true;
    this.selectColumns = columns;
    return this;
  }

  /**
   * Build WHERE clause from filters
   */
  private buildWhereClause(params: unknown[]): string {
    const conditions: string[] = [];

    // Regular filters
    for (const filter of this.filters) {
      const paramIndex = params.length + 1;
      switch (filter.operator) {
        case 'eq':
          conditions.push(`"${filter.column}" = $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'neq':
          conditions.push(`"${filter.column}" != $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'gt':
          conditions.push(`"${filter.column}" > $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'gte':
          conditions.push(`"${filter.column}" >= $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'lt':
          conditions.push(`"${filter.column}" < $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'lte':
          conditions.push(`"${filter.column}" <= $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'like':
          conditions.push(`"${filter.column}" LIKE $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'ilike':
          conditions.push(`"${filter.column}" ILIKE $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'is':
          if (filter.value === null) {
            conditions.push(`"${filter.column}" IS NULL`);
          } else if (filter.value === true) {
            conditions.push(`"${filter.column}" IS TRUE`);
          } else if (filter.value === false) {
            conditions.push(`"${filter.column}" IS FALSE`);
          }
          break;
        case 'in':
          const values = filter.value as unknown[];
          const placeholders = values.map((_, i) => `$${params.length + i + 1}`);
          conditions.push(`"${filter.column}" IN (${placeholders.join(', ')})`);
          params.push(...values);
          break;
      }
    }

    // OR filters (Supabase-style syntax)
    for (const orFilter of this.orFilters) {
      const orConditions: string[] = [];
      const parts = orFilter.split(',');
      for (const part of parts) {
        const [column, op, ...valueParts] = part.split('.');
        const value = valueParts.join('.');
        const paramIndex = params.length + 1;
        switch (op) {
          case 'eq':
            orConditions.push(`"${column}" = $${paramIndex}`);
            params.push(value);
            break;
          case 'ilike':
            orConditions.push(`"${column}" ILIKE $${paramIndex}`);
            params.push(value);
            break;
          case 'like':
            orConditions.push(`"${column}" LIKE $${paramIndex}`);
            params.push(value);
            break;
          default:
            console.warn(`Unknown OR filter operator: ${op}`);
        }
      }
      if (orConditions.length > 0) {
        conditions.push(`(${orConditions.join(' OR ')})`);
      }
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  /**
   * Build ORDER BY clause
   */
  private buildOrderClause(): string {
    if (this.orderSpecs.length === 0) return '';
    const orders = this.orderSpecs.map((spec) => {
      const dir = spec.ascending ? 'ASC' : 'DESC';
      const nulls = spec.nullsFirst ? 'NULLS FIRST' : 'NULLS LAST';
      return `"${spec.column}" ${dir} ${nulls}`;
    });
    return `ORDER BY ${orders.join(', ')}`;
  }

  /**
   * Build LIMIT/OFFSET clause
   */
  private buildLimitClause(): string {
    if (!this.rangeSpec) return '';
    const limit = this.rangeSpec.to - this.rangeSpec.from + 1;
    const offset = this.rangeSpec.from;
    return `LIMIT ${limit} OFFSET ${offset}`;
  }

  /**
   * Execute the query
   */
  async then<TResult1 = QueryResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse<T>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    try {
      const result = await this.execute();
      return onfulfilled ? onfulfilled(result) : (result as unknown as TResult1);
    } catch (error) {
      if (onrejected) {
        return onrejected(error);
      }
      throw error;
    }
  }

  /**
   * Execute the built query
   */
  private async execute(): Promise<QueryResponse<T>> {
    const params: unknown[] = [];
    let sql: string;
    let countSql: string | null = null;

    switch (this.operation) {
      case 'select':
        sql = this.buildSelectQuery(params);
        if (this.countOption === 'exact') {
          countSql = this.buildCountQuery(params.slice());
        }
        break;
      case 'insert':
        sql = this.buildInsertQuery(params);
        break;
      case 'update':
        sql = this.buildUpdateQuery(params);
        break;
      case 'delete':
        sql = this.buildDeleteQuery(params);
        break;
      case 'upsert':
        sql = this.buildUpsertQuery(params);
        break;
      default:
        throw new Error(`Unknown operation: ${this.operation}`);
    }

    console.log('[QueryBuilder] SQL:', sql);
    console.log('[QueryBuilder] Params:', params);

    try {
      let result: QueryResult;
      let count: number | null = null;

      // Execute count query first if needed
      if (countSql) {
        const countParams = params.slice(0, this.filters.length + this.orFilters.length);
        const countResult = await this.pool.query(countSql, countParams);
        count = parseInt(countResult.rows[0]?.count || '0', 10);
      }

      // Execute main query
      result = await this.pool.query(sql, params);

      // Handle single row expectation
      if (this.returningSingle) {
        if (result.rows.length === 0) {
          return {
            data: null,
            error: { message: 'No rows returned', code: 'PGRST116' },
            count: count,
          };
        }
        if (result.rows.length > 1) {
          return {
            data: null,
            error: { message: 'Multiple rows returned', code: 'PGRST200' },
            count: count,
          };
        }
        return {
          data: result.rows[0] as T,
          error: null,
          count: count,
        };
      }

      return {
        data: result.rows as T,
        error: null,
        count: count ?? result.rowCount,
      };
    } catch (error) {
      const pgError = error as { message: string; code?: string; detail?: string; hint?: string };
      console.error('[QueryBuilder] Error:', pgError);
      return {
        data: null,
        error: {
          message: pgError.message,
          code: pgError.code || 'UNKNOWN',
          details: pgError.detail,
          hint: pgError.hint,
        },
        count: null,
      };
    }
  }

  private buildSelectQuery(params: unknown[]): string {
    const where = this.buildWhereClause(params);
    const order = this.buildOrderClause();
    const limit = this.buildLimitClause();
    return `SELECT ${this.selectColumns} FROM "${this.tableName}" ${where} ${order} ${limit}`.trim();
  }

  private buildCountQuery(params: unknown[]): string {
    const where = this.buildWhereClause(params);
    return `SELECT COUNT(*) as count FROM "${this.tableName}" ${where}`.trim();
  }

  private buildInsertQuery(params: unknown[]): string {
    if (!this.insertData) throw new Error('No data to insert');

    const rows = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
    if (rows.length === 0) throw new Error('No data to insert');

    const firstRow = rows[0] as Record<string, unknown>;
    const columns = Object.keys(firstRow);
    const columnList = columns.map((c) => `"${c}"`).join(', ');

    const valueLists: string[] = [];
    for (const row of rows) {
      const values: string[] = [];
      for (const col of columns) {
        params.push(row[col]);
        values.push(`$${params.length}`);
      }
      valueLists.push(`(${values.join(', ')})`);
    }

    let sql = `INSERT INTO "${this.tableName}" (${columnList}) VALUES ${valueLists.join(', ')}`;
    if (this.returningData || this.returningSingle) {
      sql += ` RETURNING ${this.selectColumns}`;
    }
    return sql;
  }

  private buildUpdateQuery(params: unknown[]): string {
    if (!this.updateData) throw new Error('No data to update');

    const setClauses: string[] = [];
    for (const [col, val] of Object.entries(this.updateData)) {
      params.push(val);
      setClauses.push(`"${col}" = $${params.length}`);
    }

    const where = this.buildWhereClause(params);
    let sql = `UPDATE "${this.tableName}" SET ${setClauses.join(', ')} ${where}`;
    if (this.returningData || this.returningSingle) {
      sql += ` RETURNING ${this.selectColumns}`;
    }
    return sql;
  }

  private buildDeleteQuery(params: unknown[]): string {
    const where = this.buildWhereClause(params);
    let sql = `DELETE FROM "${this.tableName}" ${where}`;
    if (this.returningData || this.returningSingle) {
      sql += ` RETURNING ${this.selectColumns}`;
    }
    return sql;
  }

  private buildUpsertQuery(params: unknown[]): string {
    if (!this.insertData) throw new Error('No data to upsert');

    const rows = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
    if (rows.length === 0) throw new Error('No data to upsert');

    const firstRow = rows[0] as Record<string, unknown>;
    const columns = Object.keys(firstRow);
    const columnList = columns.map((c) => `"${c}"`).join(', ');

    const valueLists: string[] = [];
    for (const row of rows) {
      const values: string[] = [];
      for (const col of columns) {
        params.push(row[col]);
        values.push(`$${params.length}`);
      }
      valueLists.push(`(${values.join(', ')})`);
    }

    const conflictColumn = this.upsertOptions.onConflict || 'id';
    const updateClauses = columns
      .filter((c) => c !== conflictColumn)
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(', ');

    let sql = `INSERT INTO "${this.tableName}" (${columnList}) VALUES ${valueLists.join(', ')}`;

    if (this.upsertOptions.ignoreDuplicates) {
      sql += ` ON CONFLICT ("${conflictColumn}") DO NOTHING`;
    } else {
      sql += ` ON CONFLICT ("${conflictColumn}") DO UPDATE SET ${updateClauses}`;
    }

    if (this.returningData || this.returningSingle) {
      sql += ` RETURNING ${this.selectColumns}`;
    }
    return sql;
  }
}
