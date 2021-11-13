import {
  Card, CardHeader, Divider,
} from '@material-ui/core';
import { makeStyles, Theme } from '@material-ui/core/styles';
import React from 'react';
import { AutoSizer } from 'react-virtualized';
import {
  CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis,
} from 'recharts';
import { SalesPoint } from '../optimization';
import { moneyNumber, numberWithCommas } from './utils';

const useStyles = makeStyles((theme: Theme) => ({
  container: {
    width: 400,
    height: 400,
    margin: theme.spacing(2),
    display: 'grid',
    gridAutoRows: 'min-content auto',
    gridAutoColumns: '100%',
  },
  chartContainer: {
    margin: theme.spacing(1),
  },
}));

interface Props {
  salesPoint: SalesPoint,
  distribution: number,
}

export const SalesPointCard = React.memo(({ salesPoint, distribution }: Props) => {
  const classes = useStyles();
  const trend = salesPoint.prices;
  return (
    <Card raised className={classes.container}>
      <div>
        <CardHeader
          title={salesPoint.name}
          subheader={`Last Distributed: ${numberWithCommas(distribution)} MCF`}
        />
        <Divider />
      </div>
      <div className={classes.chartContainer}>
        <AutoSizer>
          {(dims) => (
            <ComposedChart width={dims.width - 10} height={dims.height} data={trend}>
              <XAxis
                dataKey="amount"
                tickFormatter={(s) => String(numberWithCommas(Number(s)))}
                label={{
                  offset: 5, value: 'Gas Willing to Purchace (MCF)', angle: 0, position: 'insideBottom',
                }}
                height={50}
              />
              <YAxis
                tickFormatter={(s) => String(moneyNumber(Number(s)))}
                width={80}
                label={{
                  offset: 10, value: 'Price ($/MCF)', angle: -90, position: 'insideLeft',
                }}
                yAxisId="0"
                orientation="left"
                dataKey="price"
              />
              <Tooltip
                formatter={(value: any, name: any) => {
                  if (name === 'amount') {
                    return [`$${numberWithCommas(value)}`, 'Amount of Gas'];
                  } if (name === 'price') {
                    return [`$${moneyNumber(value)}`, 'Price Willing to Pay'];
                  }
                  throw Error('unexpected');
                }}
                labelFormatter={(n) => `Purchase Amount: ${numberWithCommas(n)} MF`}
              />
              <CartesianGrid stroke="#f5f5f5" />
              <Line dot={false} yAxisId="0" type="monotone" dataKey="price" stroke="#ff7300" />
            </ComposedChart>
          )}
        </AutoSizer>
      </div>
    </Card>
  );
});
