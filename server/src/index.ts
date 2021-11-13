import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import ws from 'ws';
import { sortBy } from 'lodash';
import { names } from './names';
import { v4 as uuidv4 } from 'uuid';
import * as d3 from 'd3';
import Rand from 'rand-seed';
import { funcs, Point } from './price-functions';

const app = express();
app.use(helmet()); // set well-known security-related HTTP headers
app.use(compression());
app.use(cors());
app.use((bodyParser as any).json({ limit: '1mb' }));

const now = Date.now();
app.get('/ping', async (req: Request, res: Response) => {
  try {
    res.send({ started: now });
  } catch (e) {
    res.status(500).send({ error: String(e) });
  }
});

const PORT = 9375;
app.listen(PORT, () => {
  console.log(`Starting on Port ${PORT}!`);
});

const PING_INTERVAL = 5000;

function getWaterFlowRate(timestamp: number) {
  const MINUTE = 60 * 1000
  const mainPeriod = 30 * MINUTE
  const subPeriod = 2 * MINUTE
  const noisePeriod = 0.001 * MINUTE

  const a = 200000 * Math.sin(timestamp * 2 * Math.PI / mainPeriod);
  const b = 10000 * Math.sin(timestamp * 2 * Math.PI / subPeriod);
  const c = 5000 * Math.sin(timestamp * 2 * Math.PI / noisePeriod);
  return 600000 + a + b + c;
}

function getProfitabilityScaleFactor(timestamp: number) {
  const MINUTE = 60 * 1000
  const mainPeriod = 30 * MINUTE
  const subPeriod = 2 * MINUTE
  const noisePeriod = 0.001 * MINUTE

  const a = 0.5 * Math.sin(timestamp * 2 * Math.PI / mainPeriod);
  const b = 0.1 * Math.sin(timestamp * 2 * Math.PI / subPeriod);
  const c = 0.01 * Math.sin(timestamp * 2 * Math.PI / noisePeriod);
  return 1 + a + b + c;
}

interface WaterOperation {
  name: string,
  id: string,
  valueStructure: Point[],
}

function makeWaterOperations(timestamp: number, waterFlowRate: number) {
  const nameRand = new Rand(String(Math.floor(timestamp / 15 / 60 / 1000)));
  const pointsRand = new Rand(String(Math.floor(timestamp / 1 / 60 / 1000)));

  const operations: WaterOperation[] = [];
  let totalRate = 0;
  while (totalRate < waterFlowRate) {
    const nameIndex = Math.floor(nameRand.next() * names.length);
    const name = names[nameIndex];
    const funcsIndex = Math.floor(nameRand.next() * funcs.length);
    const water = 70000 + pointsRand.next() * 30000;
    totalRate += water;
    const values = funcs[funcsIndex](water, timestamp);
    const scale = getProfitabilityScaleFactor(timestamp);
    values.forEach(value => {
      value.dollarsPerDay *= scale;
    });
    operations.push({
      name,
      id: name.toLowerCase().split(' ').join('_'),
      valueStructure: values,
    });
  }
  return operations;
}

const wsServer = new ws.Server({ port: 9172 });

class State {
  flowRate: number;
  operations: WaterOperation[];
  type = "CURRENT_STATE";

  constructor() {
    this.update();
  }

  private currentTime() {
    const mod = PING_INTERVAL;
    return Math.floor(Date.now() / mod) * mod;
  }

  public update() {
    this.flowRate = getWaterFlowRate(this.currentTime());
    this.operations = makeWaterOperations(this.currentTime(), this.flowRate);
  }

  public calculateValue(request: ClientRequest): ServerResponse {
    if (request.length !== this.operations.length) {
      throw Error(`length of flow rate allocations must match number of operations`);
    }

    const functions: {
      [operationId: string]: (n: number) => number
    } = {};

    for (const operation of this.operations) {
      functions[operation.id] = d3.scaleLinear()
        .domain(operation.valueStructure.map(d => d.flowPerDay))
        .range(operation.valueStructure.map(d => d.dollarsPerDay))
        .clamp(true);
    }

    let profit = 0;
    let totalOutFlow = 0;
    for (const operation of request) {
      if (!functions[operation.operationId]) {
        throw Error(`"${operation.operationId}" does not exist`);
      }
      if (operation.flowRate < 0) {
        throw Error('Flow rates must be greater than zero.')
      }
      totalOutFlow += operation.flowRate;
      profit += functions[operation.operationId](operation.flowRate);
    }

    return {
      incrementalValue: profit * PING_INTERVAL / (24 * 3600 * 1000),
      valuePerDay: profit,
      flowRateIn: this.flowRate,
      flowRateToOperations: totalOutFlow,
      type: "OPTIMATION_RESULT",
      currentPitVolume: null,
      maximumPitVolume: null,
    }
  }
}
const state = new State();

setInterval(() => {
  state.update();
}, 500);

type ClientRequest = {
  operationId: string,
  flowRate: number,
}[];

type ServerResponse = {
  incrementalValue: number,
  valuePerDay: number,
  flowRateIn: number,
  flowRateToOperations: number,
  type: "OPTIMATION_RESULT",
  currentPitVolume: number | null,
  maximumPitVolume: number | null,
}

class Pit {
  current = 0
  capacity = 0;

  setCapacity(n: number) {
    this.capacity = n;
  }

  updateWaterVolume(n: number) {
    if (Math.abs(n) < 1e-5) {
      n = 0;
    }

    this.current += n;

    if (this.current < 0 || this.current > this.capacity) {
      if (this.capacity === 0) {
        throw Error('Total flow to operations must match the flow in from the wells');
      } else {
        throw Error(`The current volume in the pit (${this.current}) is not possible for the size of the pit (${this.capacity})`);
      }
    }
  }
}

wsServer.on('connection', socket => {

  const pit = new Pit();

  let gotResponse = false;
  socket.send(JSON.stringify(state));

  socket.on('message', message => {
    try {
      const capacity = JSON.parse(String(message))?.setPitCapacity;
      if (typeof capacity === 'number') {
        pit.setCapacity(capacity);
        return;
      }

      if (gotResponse === true) {
        throw Error('Got multiple responses');
      }
      gotResponse = true;
      const resp: ClientRequest = JSON.parse(String(message));
      const result: ServerResponse = state.calculateValue(resp);
      pit.updateWaterVolume((result.flowRateIn - result.flowRateToOperations) * (PING_INTERVAL / 24 / 3600 / 1000))
      if (pit.capacity > 0) {
        result.currentPitVolume = pit.current;
        result.maximumPitVolume = pit.capacity;
      }
      socket.send(JSON.stringify(result));
    } catch (e) {
      socket.send(String(e));
    }
  })

  const interval = setInterval(() => {
    try {
      if (gotResponse === false) {
        throw Error('Did not get a response in time.');
      }
      gotResponse = false;
      socket.send(JSON.stringify(state));
    } catch (e) {
      socket.send(String(e));
    }
  }, PING_INTERVAL)

  socket.on('close', () => clearInterval(interval));
});
