import defaults from 'lodash/defaults';

import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';

const { FormField, Switch } = LegacyForms;

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {
  onAccountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, accountId: event.target.value });
  };

  onCalculateBalanceChange = (event: React.SyntheticEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, calculateBalance: event.currentTarget.checked });
  };

  onFakeDataChange = (event: React.SyntheticEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, fakeData: event.currentTarget.checked });
  };

  onStatusChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    let value = event.target.value;
    if (value === 'HELD' || value === 'SETTLED') {
      onChange({ ...query, filterStatus: value });
    }
  };

  onCategoryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, filterCategory: event.target.value });
  };

  onTagChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, filterTag: event.target.value });
  };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { accountId, filterStatus, filterCategory, filterTag, calculateBalance, fakeData } = query;

    return (
      <div className="gf-form">
        <FormField labelWidth={8} value={accountId || ''} onChange={this.onAccountChange} label="Account id" />
        <Switch
          label={'Calculate account balance'}
          checked={calculateBalance ?? false}
          onChange={this.onCalculateBalanceChange}
        />
        <Switch label={'Fake data'} checked={fakeData ?? false} onChange={this.onFakeDataChange} />
        <FormField labelWidth={8} value={filterStatus || ''} onChange={this.onStatusChange} label="Status" />
        <FormField labelWidth={8} value={filterCategory || ''} onChange={this.onCategoryChange} label="Category" />
        <FormField labelWidth={8} value={filterTag || ''} onChange={this.onTagChange} label="Tag" />
      </div>
    );
  }
}
