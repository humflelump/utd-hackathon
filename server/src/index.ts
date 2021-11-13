import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import * as d3 from 'd3';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import Rand from 'rand-seed';
import ws from 'ws';
import { names } from './names';
import { funcs, Point } from './price-functions';
import { createServer } from "http";
import path from "path";

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

const pathToAppDirectory = path.resolve(__dirname, "dist");
app.use(express.static(pathToAppDirectory));
// CLIENT SIDE ROUTING
app.get("/*", function (req, res) {
  res.sendFile(path.join(pathToAppDirectory, "index.html"));
});

const PORT = process.env.PORT || 9375;

const server = createServer(app);
server.listen(PORT, () => {
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
  revenueStructure: Point[],
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
      revenueStructure: values,
    });
  }
  return operations;
}

class State {
  flowRateIn: number;
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
    this.flowRateIn = getWaterFlowRate(this.currentTime());
    this.operations = makeWaterOperations(this.currentTime(), this.flowRateIn);
  }

  public calculateValue(request: ClientResponse): ServerResponse {
    // probably shouldn't happen
    if (!request) {
      throw Error(`Invalid Request ${request}`);
    }
    if (request.length !== this.operations.length) {
      throw Error(`length of flow rate allocations must match number of operations`);
    }


    const functions = this.operations.reduce((acc, operation) => {
      const domain = operation.revenueStructure.map(d => d.flowPerDay);
      const range = operation.revenueStructure.map(d => d.dollarsPerDay);
      acc[operation.id] = d3.scaleLinear()
        .domain(domain)
        .range(range)
        .clamp(true);
      return acc;
    }, {} as Record<string, (n: number) => number>)


    let revenuePerDay = 0;
    let flowRateToOperations = 0;
    for (const operation of request) {
      if (!functions[operation.operationId]) {
        throw Error(`"${operation.operationId}" does not exist`);
      }
      if (operation.flowRate < 0) {
        throw Error('Flow rates must be greater than zero.')
      }
      flowRateToOperations += operation.flowRate;
      revenuePerDay += functions[operation.operationId](operation.flowRate);
    }

    return {
      incrementalRevenue: revenuePerDay * PING_INTERVAL / (24 * 3600 * 1000),
      revenuePerDay,
      flowRateIn: this.flowRateIn,
      flowRateToOperations,
      type: "OPTIMATION_RESULT",
    }
  }
}
const state = new State();

setInterval(() => {
  state.update();
}, 500);

type ClientResponse = {
  operationId: string,
  flowRate: number,
}[];

type ServerResponse = {
  incrementalRevenue: number,
  revenuePerDay: number,
  flowRateIn: number,
  flowRateToOperations: number,
  type: "OPTIMATION_RESULT",
  currentPitVolume?: number,
  maximumPitVolume?: number,
}

class Pit {
  current = 0
  capacity = 0;

  setCapacity(n: number) {
    this.capacity = n;
  }

  updateWaterVolume(result: ServerResponse) {
    let n = (result.flowRateIn - result.flowRateToOperations) * (PING_INTERVAL / 24 / 3600 / 1000)
    if (Math.abs(n) < 1e-5) {
      n = 0;
    }
    const nextValue = this.current + n;
    if (nextValue < 0 || nextValue > this.capacity) {
      if (this.capacity === 0) {
        throw Error(`Total flow in (${result.flowRateIn} bbls/day) must match the flow to operations (${result.flowRateToOperations} bbls/day)`);
      } else {
        throw Error(`The current volume in the pit (${nextValue} bbls) is not possible for the size of the pit (${this.capacity} bbls)`);
      }
    }
    this.current = nextValue;
  }
}

const wsServer = new ws.Server({ server });

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
      const resp: ClientResponse = JSON.parse(String(message));
      const result = state.calculateValue(resp);
      pit.updateWaterVolume(result)
      if (pit.capacity !== 0) {
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
