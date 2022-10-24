import defaults from 'lodash/defaults';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MutableDataFrame,
} from '@grafana/data';

import { defaultQuery, FetchFn, MyDataSourceOptions, MyQuery } from './types';
import { ping, Ping, transactions, Transactions } from './api';
import { getBackendSrv } from '@grafana/runtime';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  private readonly transactions: Transactions;
  private readonly ping: Ping;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);

    const fetchApi: FetchFn = async (input) => {
      const inputUrl = input instanceof Request ? new URL(input.url) : input instanceof URL ? input : new URL(input);
      const url = `${instanceSettings.url}/up${inputUrl.pathname}${inputUrl.search}`;
      const response = await getBackendSrv().get(url);
      return new Response(JSON.stringify(response));
    };

    this.transactions = transactions(fetchApi);
    this.ping = ping(fetchApi);
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range, targets } = options;

    const data = await Promise.all(
      targets.map(async (target) => {
        const query = defaults(target, defaultQuery);

        const results = await this.transactions({
          accountId: query.accountId,
          calculateBalance: query.calculateBalance && range.raw.to === 'now',
          fakeSeed: query.fakeData ? Math.random() : undefined,
          params: {
            filterCategory: query.filterCategory,
            filterSince: range.from.toDate(),
            filterUntil: range.to.toDate(),
          },
        });

        return new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: 'CreatedAt', values: results.createdAt, type: FieldType.time },
            { name: 'AmountValue', values: results.amountValue, type: FieldType.number },
            { name: 'AccountName', values: results.accountName, type: FieldType.string },
            { name: 'AccountBalance', values: results.accountBalance, type: FieldType.number },
            { name: 'Status', values: results.status, type: FieldType.string },
            { name: 'RawText', values: results.rawText, type: FieldType.string },
            { name: 'Description', values: results.description, type: FieldType.string },
            { name: 'Message', values: results.message, type: FieldType.string },
            { name: 'IsCategorizable', values: results.isCategorizable, type: FieldType.boolean },
            { name: 'HoldInfoAmountValue', values: results.holdInfoAmountValue, type: FieldType.number },
            { name: 'HoldInfoForeignAmountCode', values: results.holdInfoForeignAmountCode, type: FieldType.string },
            { name: 'HoldInfoForeignAmountValue', values: results.holdInfoForeignAmountValue, type: FieldType.number },
            { name: 'RoundUpAmountValue', values: results.roundUpAmountValue, type: FieldType.number },
            { name: 'RoundUpBoostPortionValue', values: results.roundUpBoostPortionValue, type: FieldType.number },
            { name: 'CashbackDescription', values: results.cashbackDescription, type: FieldType.string },
            { name: 'CashbackAmountValue', values: results.cashbackAmountValue, type: FieldType.number },
            { name: 'ForeignAmountCode', values: results.foreignAmountCode, type: FieldType.string },
            { name: 'ForeignAmountValue', values: results.foreignAmountValue, type: FieldType.number },
            { name: 'SettledAt', values: results.settledAt, type: FieldType.time },
            { name: 'AccountType', values: results.accountType, type: FieldType.string },
            { name: 'AccountId', values: results.accountId, type: FieldType.string },
            { name: 'TransferAccountType', values: results.transferAccountType, type: FieldType.string },
            { name: 'TransferAccountId', values: results.transferAccountId, type: FieldType.string },
            { name: 'CategoryType', values: results.categoryType, type: FieldType.string },
            { name: 'CategoryId', values: results.categoryId, type: FieldType.string },
            { name: 'ParentCategoryType', values: results.parentCategoryType, type: FieldType.string },
            { name: 'ParentCategoryId', values: results.parentCategoryId, type: FieldType.string },
          ],
        });
      })
    );

    return { data };
  }

  async testDatasource() {
    await this.ping();
    return {
      status: 'success',
      message: 'Success',
    };
  }
}
