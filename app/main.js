const net = require("net");
const process = require("node:process");
const fs = require("node:fs");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const Request = function (data) {
  const dataStr = data.toString('utf-8');
  const [main, body] = dataStr.split('\r\n\r\n');
  const lines = main.split('\r\n');
  
  const requestStr = lines.shift();
  const [verb, path, version] = requestStr.split(' ');

  const headers = {};

  lines.forEach((line) => {
    const [key, value] = line.split(/:(.*)/s);
    if (!key) return;
    headers[key] = value.trim();
  });

  this.verb = verb;
  this.path = path;
  this.version = version;
  this.headers = headers;
  this.body = body;

  return this;
}

const Response = function (statusCode, headers = {}, body = '') {
  if (body.length > 0) {
    headers['Content-Length'] = body.length;
  }

  if (body.length > 0 && !headers.hasOwnProperty('Content-Type')) {
    headers['Content-Type'] = 'text/plain';
  }

  const status = {
    '200': '200 OK',
    '404': '404 NOT FOUND',
    '201': '201 CREATED'
  };

  function getHeadersAsString() {
    let str = '';
    for (key in headers) {
      const value = headers[key];
      str += `${key}: ${value}\r\n`;
    }
    return str;
  }

  function toString() {
    const code = typeof statusCode !== 'string' && statusCode.toString();
    const headers = getHeadersAsString();
    return `HTTP/1.1 ${status[code]}\r\n${headers}\r\n${body}`
  }

  return {
    toString
  };
}

const Router = function () {
  const registeredRequests = new Map();

  this.register = ([verb, path], callback) => {
    const formattedPath = path
      .replace('*', '(.*)');
    const regExpStr = `^${verb}__${formattedPath}$`;
    const key = new RegExp(regExpStr);
    registeredRequests.set(key, callback);
  }

  this.handle = (request) => {
    const verbAndPath = `${request.verb}__${request.path}`;
    let output;

    registeredRequests.forEach((callback, key) => {
      if (key.test(verbAndPath)) {
        output = callback(request);
        return;
      }
    });

    return output || new Response(404);
  }

  this.getRegisteredRequests = () => registeredRequests;
}

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
  const router = new Router();

  router.register(['GET', '/'], () => {
    return new Response(200);
  });

  router.register(['GET', '/echo/*'], (req) => {
    const [none, echo] = req.path.split('/echo/');
    return new Response(200, {}, echo);
  });

  router.register(['GET', '/user-agent'], (req) => {
    const userAgent = req.headers['User-Agent'];
    return new Response(200, {}, userAgent);
  });

  router.register(['GET', '/files/*'], (req) => {
    const [none, fileName] = req.path.split('/files/');
    const indexOfDirectory = process.argv.indexOf('--directory');
    const dir = process.argv[indexOfDirectory + 1];

    let res;
    try {
      const contents = fs.readFileSync(dir + fileName, { encoding: 'utf-8' });
      res = new Response(200, { 'Content-Type': 'application/octet-stream' }, contents);
    } catch {
      res = new Response(404);
    } finally {
      return res;
    }
  });

  router.register(['POST', '/files/*'], (req) => {
    const [none, fileName] = req.path.split('/files/');
    const indexOfDirectory = process.argv.indexOf('--directory');
    const dir = process.argv[indexOfDirectory + 1];
    fs.writeFileSync(dir + fileName, req.body);
    return new Response(201);
  });

  socket.on('data', async (data) => {
    const req = new Request(data);
    const res = router.handle(req);
    socket.write(res.toString());
    socket.end();
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");