import http from 'node:http';
import { URL } from 'node:url';
import { ChatGPTQubitBridge } from './ChatGPTQubitBridge.js';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';

const bridge = new ChatGPTQubitBridge();

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });

    req.on('error', reject);
  });
}

async function route(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const path = url.pathname;

  if (req.method === 'GET' && path === '/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'chatgpt-qubit-bridge',
      architecture: bridge.inspect().architecture
    });
  }

  if (req.method === 'GET' && path === '/inspect') {
    const includeQubits = url.searchParams.get('includeQubits') === 'true';
    return sendJson(res, 200, bridge.inspect({ includeQubits }));
  }

  if (req.method !== 'POST') {
    return sendJson(res, 404, { error: 'Route not found.' });
  }

  const body = await readJson(req);

  switch (path) {
    case '/process':
      return sendJson(
        res,
        200,
        bridge.process(body.inputs, {
          evolveCycles: body.evolveCycles ?? 0,
          target: body.target ?? null
        })
      );

    case '/evolve':
      return sendJson(res, 200, {
        metrics: bridge.evolve(body.cycles ?? 1),
        state: bridge.inspect()
      });

    case '/recall':
      return sendJson(res, 200, bridge.recall({
        mode: body.mode ?? 'global',
        depth: body.depth ?? 0,
        strength: body.strength ?? bridge.feedbackStrength,
        layer: body.layer ?? 1
      }));

    case '/measure':
      return sendJson(res, 200, {
        layer: body.layer ?? 'output',
        measurements: bridge.measure(body.layer ?? 'output')
      });

    case '/reward':
      return sendJson(res, 200, bridge.reward({
        amount: body.amount ?? 1,
        target: body.target ?? null
      }));

    default:
      return sendJson(res, 404, { error: 'Route not found.' });
  }
}

const server = http.createServer((req, res) => {
  route(req, res).catch(error => {
    sendJson(res, 400, {
      error: error?.message || 'Unknown error.'
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`ChatGPT DigitalQubit bridge listening on http://${HOST}:${PORT}`);
});
