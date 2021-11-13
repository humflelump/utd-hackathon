import { atom, selector } from 'recoil';
import { RequestFromServer, ResponseFromClient } from './optimization';

export const useOptimization = atom({
  key: 'optimizedAlgo',
  default: true,
});

export const allRequestsAndResponses = atom({
  key: 'allRequests',
  default: [] as {
    request: RequestFromServer,
    response: ResponseFromClient,
  }[],
});

export const currentSalesPoints = selector({
  key: 'currentSalesPoints',
  get: ({ get }) => {
    const allData = get(allRequestsAndResponses);
    if (allData.length === 0) return null;
    const responses = allData.map((d) => d.response);
    const requests = allData.map((d) => d.request);
    const recentRequest = requests[requests.length - 1];
    const recentResponse = responses[responses.length - 1];

    return recentRequest.salesPoints.map((salespoint) => {
      const sale = recentResponse.find((d) => d.salesPointId === salespoint.id);
      if (sale === undefined) return { salespoint, distribution: 0 };
      const distribution = (recentRequest.gasToSell * sale.percent) / 100;
      return { salespoint, distribution };
    });
  },
});

export const currentGasAvailable = selector({
  key: 'currentGasAvailable',
  get: ({ get }) => {
    const allData = get(allRequestsAndResponses);
    if (allData.length === 0) return null;
    const requests = allData.map((d) => d.request);
    const recentRequest = requests[requests.length - 1];
    return recentRequest.gasToSell;
  },
});

export const lastUpdate = selector({
  key: 'lastUpdate',
  get: ({ get }) => {
    const allData = get(allRequestsAndResponses);
    if (allData.length === 0) return null;
    const timestamps = allData.map((d) => d.request.timestamp);
    return Math.max(...timestamps);
  },
});

export const revenueTrend = selector({
  key: 'revenue',
  get: ({ get }) => {
    const allData = get(allRequestsAndResponses);
    const trend = allData.map((data, index) => {
      const date = new Date(data.request.timestamp);
      const seconds = date.getSeconds();
      return {
        dateString: `${date.getMinutes()}:${seconds < 10 ? '0' : ''}${seconds}`,
        timestamp: date.getTime(),
        accumRevenue: data.request.totalSales,
        instantRevenue: index === 0
          ? 0
          : allData[index].request.totalSales - allData[index - 1].request.totalSales,
      };
    });
    return trend;
  },
});
