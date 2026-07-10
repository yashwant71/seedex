import https from 'https';

/**
 * A standard, context-free fetch replacement using Node's native HTTPS module.
 * This is immune to Next.js's request-scoped AbortSignal binding and context-based abortion.
 */
export function safeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const method = options.method || 'GET';
    const headers = {
      'User-Agent': 'Mozilla/5.0 (compatible; SeedexBot/1.0; +https://github.com/yashwant71/seedex)',
      ...options.headers
    };
    const timeout = options.timeout || 90000; // default 90 seconds timeout

    const reqOptions = {
      method,
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      headers,
      timeout
    };

    const req = https.request(reqOptions, (res) => {
      res.setEncoding('utf8');
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: {
            get: (name) => res.headers[name.toLowerCase()]
          },
          json: async () => {
            try {
              return JSON.parse(data);
            } catch (err) {
              throw new Error(`JSON parsing failed: ${err.message}. Raw content was: ${data}`);
            }
          },
          text: async () => data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}
