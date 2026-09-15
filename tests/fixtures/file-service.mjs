// Contract fixture only. Never used by development or production Compose.
import { createServer } from 'node:http';
let nextId = 100;
createServer(async (request, response) => {
  if (request.url === '/health') {
    response.end('ok');
    return;
  }
  if (request.method === 'POST' && request.url === '/files/upload') {
    if (request.headers.authorization !== 'Bearer isolated-file-test') {
      response.writeHead(401).end();
      return;
    }
    try {
      const form = await new Request('http://file-service/files/upload', {
        method: 'POST',
        headers: request.headers,
        body: request,
        duplex: 'half',
      }).formData();
      const file = form.get('file');
      if (!file || form.get('files')) {
        response.writeHead(400).end();
        return;
      }
      response.writeHead(201, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ files: [{ fileId: ++nextId }] }));
    } catch {
      response.writeHead(400).end();
    }
    return;
  }
  if (request.url.startsWith('/files/preview/')) {
    response.writeHead(202).end();
    return;
  }
  if (request.url.startsWith('/files/download/')) {
    response.writeHead(200, { 'Content-Type': 'text/plain' }).end('fixture');
    return;
  }
  response.writeHead(404).end();
}).listen(8080, '0.0.0.0');
