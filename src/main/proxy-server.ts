import http from 'http';
import https from 'https';
import { URL } from 'url';
import { IncomingMessage } from 'http';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

interface ProxySession {
  url: string;
  headers: Record<string, string>;
}

const sessions = new Map<string, ProxySession>();
let server: http.Server | null = null;
let port = 0;

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function createProxySession(targetUrl: string, headers: Record<string, string>): string {
  const id = generateSessionId();
  sessions.set(id, { url: targetUrl, headers });
  return `http://127.0.0.1:${port}/proxy/${id}`;
}

export function startProxyServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    if (server) {
      resolve(port);
      return;
    }

    server = http.createServer((req, res) => {
      const match = req.url?.match(/^\/proxy\/([^/?]+)/);
      if (!match) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const sessionId = match[1];
      const session = sessions.get(sessionId);
      if (!session) {
        res.writeHead(404);
        res.end('Session expired');
        return;
      }

      const targetUrl = new URL(session.url);
      const isHttps = targetUrl.protocol === 'https:';

      const forwardHeaders: Record<string, string> = {
        ...session.headers,
        'User-Agent': session.headers['User-Agent'] || UA,
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      };

      if (session.headers['Referer']) {
        forwardHeaders['Referer'] = session.headers['Referer'];
      }

      const options: https.RequestOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: 'GET',
        headers: forwardHeaders,
      };

      const proxyReq = isHttps
        ? https.request(options, (proxyRes: IncomingMessage) => {
            handleProxyResponse(proxyRes, res);
          })
        : http.request(options, (proxyRes: IncomingMessage) => {
            handleProxyResponse(proxyRes, res);
          });

      proxyReq.on('error', (err: Error) => {
        console.error('[Proxy] Error:', err.message);
        if (!res.headersSent) {
          res.writeHead(502);
          res.end('Bad Gateway');
        }
      });

      req.on('close', () => {
        proxyReq.destroy();
      });

      proxyReq.end();
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server!.address();
      if (addr && typeof addr === 'object') {
        port = addr.port;
        console.log(`[Proxy] Server started on port ${port}`);
        resolve(port);
      } else {
        reject(new Error('Failed to get proxy port'));
      }
    });

    server.on('error', (err: Error) => {
      console.error('[Proxy] Server error:', err);
      server = null;
      reject(err);
    });
  });
}

function handleProxyResponse(proxyRes: IncomingMessage, res: http.ServerResponse) {
  const skipHeaders = new Set(['transfer-encoding', 'connection', 'keep-alive']);
  const responseHeaders: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(proxyRes.headers)) {
    if (!skipHeaders.has(key.toLowerCase()) && value) {
      responseHeaders[key] = value as string | string[];
    }
  }

  responseHeaders['Access-Control-Allow-Origin'] = '*';
  responseHeaders['Access-Control-Allow-Headers'] = '*';

  res.writeHead(proxyRes.statusCode || 200, responseHeaders);
  proxyRes.pipe(res);
}

export function stopProxyServer() {
  if (server) {
    server.close();
    server = null;
    port = 0;
    sessions.clear();
  }
}
