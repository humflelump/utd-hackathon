import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import {
  RecoilRoot,
} from 'recoil';
import App from './App';

function friendlyMessage() {
  const styles = [
    'background: radial-gradient(#D33106, #571402)',
    'border: 1px solid #3E0E02',
    'color: white',
    'display: block',
    'text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3)',
    'box-shadow: 0 1px 0 rgba(255, 255, 255, 0.4) inset, 0 5px 3px -5px rgba(0, 0, 0, 0.5), 0 -13px 5px -10px rgba(255, 255, 255, 0.4) inset',
    'line-height: 40px',
    'text-align: center',
    'font-weight: bold',
    'padding: 5px',
  ].join(';');

  // eslint-disable-next-line no-console
  console.log('%c Thanks for applying to EOG!', styles);
}
friendlyMessage();

ReactDOM.render(
  <RecoilRoot>
    <App />
  </RecoilRoot>,
  document.getElementById('root'),
);
