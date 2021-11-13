
export interface Point {
  flowPerDay: number,
  dollarsPerDay: number,
}
interface WaterOperation {
  name: string,
  id: string,
  valueStructure: Point[],
}

export type ServerRequest = {
  flowRate: number;
  operations: WaterOperation[];
  type: "CURRENT_STATE";
};

export type ServerResponse = {
  incrementalValue: number,
  valuePerDay: number,
  flowRateIn: number,
  flowRateToOperations: number,
  type: "OPTIMATION_RESULT",
  currentPitVolume: number | null,
  maximumPitVolume: number | null,
}

export type ClientRequest = {
  operationId: string,
  flowRate: number,
}[];

// You should do better!
export function processRequest(request: ServerRequest): ClientRequest {
  const evenDistribution = request.flowRate / request.operations.length;

  return request.operations.map(operation => {
    return {
      operationId: operation.id,
      flowRate: evenDistribution - 10,
    }
  })
}