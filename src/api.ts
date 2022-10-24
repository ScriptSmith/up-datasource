import {
  AccountsApi,
  Configuration,
  TransactionResource,
  TransactionsApi,
  TransactionsGetRequest,
  UtilityEndpointsApi,
} from './up-api';
import { FetchFn } from './types';
import _ from 'lodash';
import { faker } from '@faker-js/faker';

const PAGE_SIZE = 100;

interface TransactionInput {
  accountId?: string;
  calculateBalance?: boolean;
  fakeSeed?: number;
  params: TransactionsGetRequest;
}

interface Account {
  name: string;
  balance: number;
}

export const ping = (fetchApi: FetchFn) => () => new UtilityEndpointsApi(new Configuration({ fetchApi })).utilPingGet();

export type Ping = ReturnType<typeof ping>;

export type Transactions = ReturnType<typeof transactions>;

const parseNumber = (n: string | undefined): number | undefined => (n !== undefined ? Number(n) : undefined);

const roundMinute = (d?: Date): Date | undefined => {
  if (d === undefined) {
    return d;
  }
  const coefficient = 1000 * 60;
  return new Date(Math.round(d.getTime() / coefficient) * coefficient);
};

const strToNumber = (s: string): number => [...s].reduce((acc, char) => char.charCodeAt(0) + acc, 0);

const fakeTransaction = (seed: number, transaction: TransactionResource): TransactionResource => {
  const isSpending = transaction.relationships.transferAccount.data?.id === undefined;
  const merchantSeed = seed * (37 + strToNumber(transaction.attributes.description));
  const amountSeed = merchantSeed * (37 + transaction.attributes.amount.valueInBaseUnits);

  faker.seed(merchantSeed);
  const newTransaction: TransactionResource = {
    ...transaction,
    attributes: {
      ...transaction.attributes,
      rawText: isSpending ? faker.company.name() : 'Transfer',
      description: isSpending ? faker.company.name() : 'Transfer',
      message: null,
      foreignAmount: null,
    },
  };

  faker.seed(amountSeed);
  const amount = transaction.attributes.amount.valueInBaseUnits;
  const sign = Math.sign(amount);
  const absAmount = Math.abs(amount);
  const fakeAmount = faker.datatype.number({ min: absAmount * 0.25, max: absAmount * 1.75 }) * sign;
  newTransaction.attributes.amount = {
    currencyCode: 'AUD',
    value: (fakeAmount / 100).toString(),
    valueInBaseUnits: fakeAmount,
  };

  return newTransaction;
};

const fakeAccount = (seed: number, account: Account): Account => {
  const accountSeed = seed * (37 + strToNumber(account.name));

  faker.seed(accountSeed);
  return {
    name: faker.finance.accountName(),
    balance: faker.datatype.number({ min: 100, max: 1000 }),
  };
};

export const transactions = (fetchApi: FetchFn) =>
  _.memoize(
    async ({ accountId, calculateBalance, fakeSeed, params }: TransactionInput) => {
      const configuration = new Configuration({ fetchApi });
      const transactionsApi = new TransactionsApi(configuration);
      const accountsApi = new AccountsApi(configuration);

      const data = [];

      const accounts = new Map<string, Account>();
      const getAccount = async (transaction: TransactionResource) => {
        if (!calculateBalance) {
          return;
        }
        const amount = transaction.attributes.amount.valueInBaseUnits;
        let accountId = transaction.relationships.account.data.id;

        let storedAccount = accounts.get(accountId);
        let account;
        if (storedAccount !== undefined) {
          account = {
            name: storedAccount.name,
            balance: storedAccount.balance,
          };
          storedAccount.balance -= amount;
        } else {
          account = await accountsApi.accountsIdGet({ id: accountId }).then((a) => ({
            name: a.data.attributes.displayName,
            balance: a.data.attributes.balance.valueInBaseUnits,
          }));
          accounts.set(accountId, {
            name: account.name,
            balance: account.balance - amount,
          });
        }

        return { name: account.name, balance: account.balance / 100 };
      };

      while (true) {
        const response = accountId
          ? await transactionsApi.accountsAccountIdTransactionsGet({ accountId, pageSize: PAGE_SIZE, ...params })
          : await transactionsApi.transactionsGet({ pageSize: PAGE_SIZE, ...params }, {});

        for (let transaction of response.data) {
          if (fakeSeed) {
            transaction = fakeTransaction(fakeSeed, transaction);
          }
          let account = await getAccount(transaction);
          if (account && fakeSeed) {
            account = fakeAccount(fakeSeed, account);
          }
          data.push({ transaction, account });
        }
        if (response.links.next === null) {
          break;
        }

        let pageAfter = new URL(response.links.next).searchParams.get('page[after]');
        if (pageAfter === null) {
          throw new Error('page[after] param missing from query string');
        }

        params = {
          ...params,
          pageAfter,
        };
      }

      return data.reduce(
        (acc, { transaction, account }) => {
          acc.status.push(transaction.attributes.status);
          acc.rawText.push(transaction.attributes.rawText ?? undefined);
          acc.description.push(transaction.attributes.description);
          acc.message.push(transaction.attributes.message ?? undefined);
          acc.isCategorizable.push(transaction.attributes.isCategorizable);
          acc.holdInfoAmountValue.push(parseNumber(transaction.attributes.holdInfo?.amount.value));
          acc.holdInfoForeignAmountCode.push(transaction.attributes.holdInfo?.foreignAmount?.currencyCode);
          acc.holdInfoForeignAmountValue.push(parseNumber(transaction.attributes.holdInfo?.foreignAmount?.value));
          acc.roundUpAmountValue.push(parseNumber(transaction.attributes.roundUp?.amount.value));
          acc.roundUpBoostPortionValue.push(parseNumber(transaction.attributes.roundUp?.boostPortion?.value));
          acc.cashbackDescription.push(transaction.attributes.cashback?.description);
          acc.cashbackAmountValue.push(parseNumber(transaction.attributes.cashback?.amount.value));
          acc.amountValue.push(parseNumber(transaction.attributes.amount.value));
          acc.foreignAmountCode.push(transaction.attributes.foreignAmount?.currencyCode);
          acc.foreignAmountValue.push(parseNumber(transaction.attributes.foreignAmount?.value));
          acc.createdAt.push(transaction.attributes.createdAt.getTime());
          acc.settledAt.push(transaction.attributes.settledAt?.getTime());
          acc.accountType.push(transaction.relationships.account.data.type);
          acc.accountId.push(transaction.relationships.account.data.id);
          acc.transferAccountType.push(transaction.relationships.transferAccount.data?.type);
          acc.transferAccountId.push(transaction.relationships.transferAccount.data?.id);
          acc.categoryType.push(transaction.relationships.category.data?.type);
          acc.categoryId.push(transaction.relationships.category.data?.id);
          acc.parentCategoryType.push(transaction.relationships.parentCategory.data?.type);
          acc.parentCategoryId.push(transaction.relationships.parentCategory.data?.id);
          acc.accountName.push(account?.name);
          acc.accountBalance.push(account?.balance);
          return acc;
        },
        {
          status: [] as Array<'HELD' | 'SETTLED'>,
          rawText: [] as Array<string | undefined>,
          description: [] as string[],
          message: [] as Array<string | undefined>,
          isCategorizable: [] as boolean[],
          holdInfoAmountValue: [] as Array<number | undefined>,
          holdInfoForeignAmountCode: [] as Array<string | undefined>,
          holdInfoForeignAmountValue: [] as Array<number | undefined>,
          roundUpAmountValue: [] as Array<number | undefined>,
          roundUpBoostPortionValue: [] as Array<number | undefined>,
          cashbackDescription: [] as Array<string | undefined>,
          cashbackAmountValue: [] as Array<number | undefined>,
          amountValue: [] as Array<number | undefined>,
          foreignAmountCode: [] as Array<string | undefined>,
          foreignAmountValue: [] as Array<number | undefined>,
          createdAt: [] as number[],
          settledAt: [] as Array<number | undefined>,
          accountType: [] as string[],
          accountId: [] as string[],
          transferAccountType: [] as Array<string | undefined>,
          transferAccountId: [] as Array<string | undefined>,
          categoryType: [] as Array<string | undefined>,
          categoryId: [] as Array<string | undefined>,
          parentCategoryType: [] as Array<string | undefined>,
          parentCategoryId: [] as Array<string | undefined>,
          accountName: [] as Array<string | undefined>,
          accountBalance: [] as Array<number | undefined>,
        }
      );
    },
    (input) => {
      const roundedInput: TransactionInput = {
        ...input,
        params: {
          ...input.params,
          filterSince: roundMinute(input.params.filterSince),
          filterUntil: roundMinute(input.params.filterUntil),
        },
      };
      return JSON.stringify(roundedInput);
    }
  );
