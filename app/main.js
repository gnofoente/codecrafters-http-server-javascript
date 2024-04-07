const net = require("net");
const process = require("node:process");
const { readFile } = require("node:fs/promises");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const Request = function (data) {
  const dataStr = data.toString('utf-8');
  const dataStrLines = dataStr.split('\r\n');
  const requestStr = dataStrLines.shift();
  const [verb, path, version] = requestStr.split(' ');
  const headers = {};

  dataStrLines.forEach((line) => {
    const [key, value] = line.split(/:(.*)/s);
    if (!key) return;
    headers[key] = value.trim();
  });

  this.verb = verb;
  this.path = path;
  this.version = version;
  this.headers = headers;

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
    '404': '404 NOT FOUND'
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

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
  socket.on('data', async (data) => {
    const req = new Request(data);
    let res;

    if (req.path === '/') {
      res = new Response(200);
    } else if (req.path.match(/\/echo\/(.*)/)) {
      const [none, echo] = req.path.split('/echo/');
      res = new Response(200, {}, echo);
    } else if (req.path === '/user-agent') {
      const userAgent = req.headers['User-Agent'];
      res = new Response(200, {}, userAgent);
    } else if (req.path.match(/\/files\/(.*)/)) {
      console.log('files');
      const [none, fileName] = req.path.split('/files/');
      const indexOfDirectory = process.argv.indexOf('--directory');
      const dir = process.argv[indexOfDirectory + 1];
      try {
        const contents = await readFile(dir + fileName, { encoding: 'utf-8' });
        console.log(contents);
        res = new Response(200, { 'Content-Type': 'application/octet-stream' }, contents);
      } catch {
        res = new Response(404);
      }
    } else {
      res = new Response(404);
    }

    socket.write(res.toString());
    socket.end();
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");