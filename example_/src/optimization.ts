import { scaleLinear } from 'd3';

/* eslint-disable no-param-reassign */
interface Price {
  price: number,
  amount: number,
}
export interface SalesPoint {
  id: string,
  name: string,
  prices: Price[],
}
export interface RequestFromServer {
  salesPoints: SalesPoint[],
  gasToSell: number,
  totalSales: number,
  timestamp: number,
}

export type ResponseFromClient = Array<{
  salesPointId: string,
  percent: number
}>

export function solve(
  resources: number,
  resourceCosts: number[][],
  profits: number[][],
  MAX_CACHE_SIZE = 5e5,
) {
  // memoizing naively may result in too much memory/time use.
  // Scale everything down to aproximate an answer while being efficient
  const totalArraysToBuild = profits.map((a) => a.length).reduce((a, b) => a + b, 0);
  const arraySize = Math.floor(MAX_CACHE_SIZE / totalArraysToBuild);
  (function applyScaleFactor() {
    const scale = arraySize / (resources + 1.01);
    resources *= scale;
    resourceCosts = resourceCosts.map((row) => row.map((c) => c * scale));
    resources = Math.floor(resources);
    resourceCosts = resourceCosts.map((row) => row.map((c) => Math.ceil(c)));
  }());

  interface Result {
    i: number,
    j: number,
    profit: number,
    next: Result | null,
  }

  // Recursively try every possible i, j combination. Memoize for performance.
  const cache = profits.map((row) => row.map(() => Array(arraySize).fill(null)));
  function dp(resourceLeft: number, i: number, j: number): Result {
    if (i >= profits.length) {
      return {
        i, j, profit: 0, next: null,
      };
    }
    if (j >= profits[i].length) {
      return {
        i, j, profit: -Infinity, next: null,
      };
    }
    // apply memoization
    if (cache[i][j][resourceLeft] !== null) {
      return cache[i][j][resourceLeft];
    }

    const pickJ = dp(resourceLeft - resourceCosts[i][j], i + 1, 0);
    const wait = dp(resourceLeft, i, j + 1);
    // console.log({ pickJ, wait });
    let result: Result;
    if (

      (resourceLeft - resourceCosts[i][j] >= 0 && pickJ.profit + profits[i][j] >= wait.profit)
    ) {
      result = {
        i, j, profit: pickJ.profit + profits[i][j], next: pickJ,
      };
    } else {
      result = {
        i, j, profit: wait.profit, next: wait,
      };
    }
    cache[i][j][resourceLeft] = result;
    return result;
  }

  // Extract the actual indices from the result graph
  const indices: number[] = [];
  let data = dp(resources, 0, 0);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { next } = data;
    if (!next) break;
    if (next.i > data.i) {
      indices.push(data.j);
    }
    data = next;
  }

  return indices;
}

function optimalSolution(request: RequestFromServer): ResponseFromClient {
  const resources = request.gasToSell;

  function calcOptimal(starts: number[], ends: number[], iter = 100) {
    const costsMatrix: number[][] = [];
    const profitsMatrix: number[][] = [];

    request.salesPoints.forEach((salespoint, index) => {
      const scale = scaleLinear()
        .domain(salespoint.prices.map((d) => d.amount))
        .range(salespoint.prices.map((d) => d.price))
        .clamp(true);

      const costs: number[] = [];
      const profits: number[] = [];

      for (let n = starts[index]; n <= ends[index]; n += (ends[index] - starts[index]) / iter) {
        costs.push(n);
        profits.push(n * scale(n));
      }
      costsMatrix.push(costs);
      profitsMatrix.push(profits);
    });

    // console.log({ resources, costsMatrix, profitsMatrix });
    const indices = solve(resources, costsMatrix, profitsMatrix);
    const values = costsMatrix.map((costs, i) => costs[indices[i]]);
    return values;
  }

  const starts = request.salesPoints.map(() => 0);
  const ends = request.salesPoints.map(() => resources);
  let values = request.salesPoints.map(() => 0);
  for (let i = 0; i < 3; i += 1) { // Zoom in on the optimal for several iterations
    const ITER = Math.floor(50 / (i + 1));
    values = calcOptimal(starts, ends, ITER);
    for (let j = 0; j < starts.length; j += 1) {
      const extent = ends[j] - starts[j];
      starts[j] = Math.max(0, values[j] - extent / ITER);
      ends[j] = Math.max(0, values[j] + extent / ITER);
    }
  }

  const percentages = values.map((val) => (val / resources) * 100);
  const totalPercent = percentages.reduce((a, b) => a + b, 0);

  // make sure they add to 100%
  const maxIndex = percentages.indexOf(Math.max(...percentages));
  percentages[maxIndex] += (100 - totalPercent);

  return request.salesPoints.map((salesPoint, index) => ({
    salesPointId: salesPoint.id,
    percent: percentages[index],
  }));
}

// This just evenly distributes the gas regardless of the prices
function naiveSolution(request: RequestFromServer): ResponseFromClient {
  const count = request.salesPoints.length;
  return request.salesPoints.map((salesPoint) => ({
    salesPointId: salesPoint.id,
    percent: 100 / count,
  }));
}

export function processRequest(request: RequestFromServer, optimal = true): ResponseFromClient {
  if (optimal) {
    const result = optimalSolution(request);
    return result;
  }
  return naiveSolution(request);
}
