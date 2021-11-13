import React from 'react';
import { toast } from 'react-toastify';
import { useRecoilState } from 'recoil';
import { processRequest, RequestFromServer } from './optimization';
import { allRequestsAndResponses, useOptimization } from './recoil-state';

export function useServerConnection() {
  const [, setConnectionData] = useRecoilState(allRequestsAndResponses);
  const [isOptimized] = useRecoilState(useOptimization);
  const isOptimizedRef = React.useRef({ isOptimized });
  isOptimizedRef.current.isOptimized = isOptimized;

  React.useEffect(() => {
    const ws = new WebSocket('wss://eog-assessment-server.azurewebsites.net');

    // When the server sends new data, we send how to optimally allocate the gas
    ws.addEventListener('message', (message) => {
      if (message.data.startsWith('Error')) {
        toast(message.data);
        return;
      }

      const request: RequestFromServer = JSON.parse(message.data);
      const response = processRequest(request, isOptimizedRef.current.isOptimized);
      setConnectionData((old) => {
        const newData = [...old, { request, response }];
        const newDataNoMemoryLeak = newData.slice(newData.length - 1e5);
        return newDataNoMemoryLeak;
      });

      ws.send(JSON.stringify(response));
    });

    // Oh no! Something unexpected happened.
    ws.addEventListener('error', (event) => {
      toast(JSON.stringify(event));
    });

    return function cleanup() {
      setConnectionData([]);
      ws.close();
    };
  }, [setConnectionData]);
}
