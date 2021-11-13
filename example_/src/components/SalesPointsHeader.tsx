import { CardHeader, Divider } from '@material-ui/core';
import { makeStyles, Theme } from '@material-ui/core/styles';
import React from 'react';
import { useRecoilValue } from 'recoil';
import { currentGasAvailable, currentSalesPoints } from '../recoil-state';
import { numberWithCommas } from './utils';

const useStyles = makeStyles((theme: Theme) => ({
  container: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
}));

export const SalesPointsHeader = React.memo(() => {
  const classes = useStyles();
  const salespoints = useRecoilValue(currentSalesPoints);
  const gasToSell = useRecoilValue(currentGasAvailable);

  return (
    <div className={classes.container}>
      <CardHeader
        title="Sales Points"
        subheader={`${(salespoints || []).length} Sales Points | ${numberWithCommas(gasToSell || 0)} MCF to Sell`}
      />
      <Divider />
    </div>
  );
});
