import Rand from 'rand-seed';


export interface Point {
  flowPerDay: number,
  dollarsPerDay: number,
}

export function linearFunction(water: number, seedTs: number) {
  const rand = new Rand(String(seedTs));
  const points: Point[] = [];
  const slope = 0.8 + rand.next() * 0.4;
  for (let n = 0; n <= 200000; n += 10000) {
    if (n < water) {
      points.push({
        flowPerDay: n,
        dollarsPerDay: slope * n * (0.9 + rand.next() * 0.2),
      });
    } else {
      points.push({
        flowPerDay: n,
        dollarsPerDay: -0.1 * n * (0.9 + rand.next() * 0.2),
      });
    }
  }
  return points;
}

export function cycleFunction(water: number, seedTs: number) {
  const rand = new Rand(String(seedTs));
  const points: Point[] = [];
  const max = 80000 + rand.next() * 40000;
  for (let n = 0; n <= 200000; n += 10000) {
    const val = Math.sin(n * 4 * Math.PI / water) * max * (0.9 + rand.next() * 0.2);
    points.push({
      flowPerDay: n,
      dollarsPerDay: val,
    });
  }
  return points;
}

export function spikeFunction(water: number, seedTs: number) {
  const rand = new Rand(String(seedTs));
  const points: Point[] = [];
  for (let n = 0; n <= 200000; n += 10000) {
    if (n < water) {
      points.push({
        flowPerDay: n,
        dollarsPerDay: (n * n / 100000) * (0.9 + rand.next() * 0.2),
      });
    } else {
      points.push({
        flowPerDay: n,
        dollarsPerDay: -0.1 * n * (0.9 + rand.next() * 0.2),
      });
    }
  }
  return points;
}

export const funcs = [spikeFunction, cycleFunction, linearFunction];