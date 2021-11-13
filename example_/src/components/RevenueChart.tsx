import { CircularProgress, Typography } from '@material-ui/core';
import { makeStyles, Theme } from '@material-ui/core/styles';
import React from 'react';
import { AutoSizer } from 'react-virtualized';
import {
  Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useRecoilValue } from 'recoil';
import { revenueTrend } from '../recoil-state';
import { RevenueHeader } from './RevenueHeader';
import { numberWithCommas } from './utils';

const useStyles = makeStyles((theme: Theme) => ({
  container: {
    width: '100%',
    height: 400,
    display: 'grid',
    gridAutoRows: 'min-content auto',
    gridAutoColumns: '100%',
    position: 'relative',
  },
  loadingContainer: {
    width: 200,
    height: 100,
    position: 'absolute',
    zIndex: 1,
    left: 'calc(50% - 100px)',
    top: 'calc(50% - 50px)',
  },
  center: {
    display: 'flex',
    justifyContent: 'space-around',
    paddingTop: theme.spacing(1),
  },
}));

export const RevenueChart = React.memo(() => {
  const classes = useStyles();
  const trend = useRecoilValue(revenueTrend).filter((d) => {
    const MINUTE = 60 * 1000;
    const isRecent = d.timestamp > Date.now() - 20 * MINUTE;
    return isRecent;
  });

  const cumulativeExtent = React.useMemo(() => {
    const data = trend.map((d) => d.accumRevenue);
    if (data.length === 0) return [0, 1000];
    return [0, Math.round(Math.max(...data) * 1.05)];
  }, [trend]);

  const instantExtent = React.useMemo(() => {
    const data = trend.map((d) => d.instantRevenue);
    if (data.length === 0) return [0, 100];
    return [0, Math.round(Math.max(...data) * 2)];
  }, [trend]);

  const loading = trend.length <= 1;

  return (
    <div className={classes.container}>
      {
        loading && (
        <div className={classes.loadingContainer}>
          <div className={classes.center}>
            <CircularProgress size={70} />
          </div>
          <div className={classes.center}>
            <Typography>Revenue Chart Loading</Typography>
          </div>
        </div>
        )
      }
      <RevenueHeader />
      <div style={{ opacity: loading ? 0.3 : 1 }}>
        <AutoSizer>
          {(dims) => (
            <ComposedChart width={dims.width} height={dims.height} data={trend}>
              <XAxis dataKey="dateString" />
              <YAxis
                width={120}
                label={{
                  offset: 10, value: 'Cumulative Revenue ($)', angle: -90, position: 'insideBottomLeft',
                }}
                domain={cumulativeExtent}
                yAxisId="0"
                orientation="left"
                dataKey="accumRevenue"
                tickFormatter={(s) => String(numberWithCommas(Number(s)))}
              />
              <YAxis
                width={120}
                domain={instantExtent}
                yAxisId="1"
                orientation="right"
                dataKey="instantRevenue"
                label={{
                  offset: 20, value: 'Instant Revenue ($)', angle: -90, position: 'insideTopRight',
                }}
                tickFormatter={(s) => String(numberWithCommas(Number(s)))}
              />
              <Tooltip formatter={(value: any, name: any) => {
                if (name === 'instantRevenue') {
                  return [`$${numberWithCommas(value)}`, 'Instantaneous Revenue'];
                } if (name === 'accumRevenue') {
                  return [`$${numberWithCommas(value)}`, 'Cumulative Revenue'];
                }
                throw Error('unexpected');
              }}
              />
              <CartesianGrid stroke="#f5f5f5" />
              <Bar yAxisId="1" dataKey="instantRevenue" barSize={20} fill="#413ea0" />
              <Line dot={false} yAxisId="0" type="monotone" dataKey="accumRevenue" stroke="#ff7300" />
            </ComposedChart>
          )}
        </AutoSizer>
      </div>
    </div>
  );
});
