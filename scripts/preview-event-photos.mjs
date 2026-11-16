import { createServer } from 'node:http';
import handler from '../server/api/event-photos.js';

const port = Number(process.env.EVENT_PHOTOS_PORT || 3009);
createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname !== '/api/event-photos') return response.writeHead(404).end();
  request.query = Object.fromEntries(url.searchParams);
  response.status = code => {
    response.statusCode = code;
    return response;
  };
  response.json = value => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(value));
  };
  void handler(request, response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Event Photos API listening on http://127.0.0.1:${port}`);
});
