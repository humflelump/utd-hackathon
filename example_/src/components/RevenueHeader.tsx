import {
  CardHeader, Checkbox, Divider, FormControlLabel,
} from '@material-ui/core';
import { makeStyles, Theme } from '@material-ui/core/styles';
import React from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { lastUpdate, useOptimization } from '../recoil-state';

const useStyles = makeStyles((theme: Theme) => ({
  container: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  flex: {
    display: 'flex',
    justifyContent: 'space-between',
  },
}));

export const RevenueHeader = React.memo(() => {
  const classes = useStyles();
  const [now, setNow] = React.useState(Date.now);
  const [isOptimized, setIsOptimized] = useRecoilState(useOptimization);

  const updateTs = useRecoilValue(lastUpdate);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return function cleanup() {
      clearInterval(interval);
    };
  });

  const ago = (function formatTs() {
    if (updateTs === null) return 'Never';
    const seconds = Math.max(0, Math.floor((now - updateTs) / 1000));
    return `${seconds} Second${seconds === 1 ? '' : 's'} Ago`;
  }());

  return (
    <div className={classes.container}>
      <div className={classes.flex}>
        <CardHeader title="Revenue" subheader={`Last Optimization: ${ago}`} />
        <FormControlLabel
          control={(
            <Checkbox
              checked={isOptimized}
              onChange={() => setIsOptimized(!isOptimized)}
              name="checkedB"
              color="primary"
            />
        )}
          label="Distribute Gas Optimally"
        />
      </div>
      <Divider />
    </div>
  );
});
