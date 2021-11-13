export function moneyNumber(x: number) {
  // https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  const r = (Math.round(x * 100) / 100).toFixed(2);
  return r.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function numberWithCommas(x: number) {
  // https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  const r = Math.round(x);
  return r.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
