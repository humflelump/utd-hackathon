import AppBar from '@material-ui/core/AppBar';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { RevenueChart } from './components/RevenueChart';
import { SalesPointCardList } from './components/SalesPointCardList';
import { useServerConnection } from './useServerConnection';

const useStyles = makeStyles((theme: Theme) => createStyles({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    display: 'grid',
    gridAutoRows: 'min-content auto',
    gridAutoColumns: '100%',
  },
  title: {
    flexGrow: 1,
    textAlign: 'left',
  },
  body: {
    padding: theme.spacing(2),
    overflow: 'auto',
  },
}));

function App() {
  const classes = useStyles();
  useServerConnection();

  return (
    <div className={classes.container}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h5" className={classes.title}>
            EOG Example Assessment
          </Typography>
        </Toolbar>
      </AppBar>
      <div className={classes.body}>
        <ToastContainer />
        <RevenueChart />
        <SalesPointCardList />
      </div>
    </div>
  );
}

export default App;
