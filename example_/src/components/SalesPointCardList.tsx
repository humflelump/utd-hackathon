import { makeStyles } from '@material-ui/core/styles';
import React from 'react';
import { useRecoilValue } from 'recoil';
import { currentSalesPoints } from '../recoil-state';
import { SalesPointCard } from './SalesPointCard';
import { SalesPointsHeader } from './SalesPointsHeader';

const useStyles = makeStyles(() => ({
  container: {
    width: '100%',
    display: 'flex',
    flexWrap: 'wrap',
  },
}));

export const SalesPointCardList = React.memo(() => {
  const classes = useStyles();
  const salesPointsData = useRecoilValue(currentSalesPoints);
  if (!salesPointsData) return null;
  return (
    <div className={classes.container}>
      <SalesPointsHeader />
      {
        salesPointsData
          .map((data) => (
            <SalesPointCard
              distribution={data.distribution}
              salesPoint={data.salespoint}
              key={data.salespoint.id}
            />
          ))
      }
    </div>
  );
});
