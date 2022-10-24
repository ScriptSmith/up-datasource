import { DataQuery, DataSourceJsonData } from '@grafana/data';

export type FetchFn = typeof fetch;

export interface MyQuery extends DataQuery {
  accountId?: string;
  calculateBalance?: boolean;
  fakeData?: boolean;
  parseValues?: boolean;
  filterStatus?: 'HELD' | 'SETTLED';
  filterCategory?: string;
  filterTag?: string;
}

export const defaultQuery: Partial<MyQuery> = {};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  accessToken: string;
}
