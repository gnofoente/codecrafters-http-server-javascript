const net = require("net");
const CRLF = '\r\n\r\n';

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

  return {
    verb,
    path,
    version,
    headers
  };
}

const Response = function (statusCode, headers, body) {
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
  socket.on('data', (data) => {
    const { path } = new Request(data);
    const [none, randomStr] = path.split('/echo/');
    let res;

    if (path == '/') {
      res = new Response(200, {}, '');
    } else if (randomStr) {
      const headers = {
        'Content-Type': 'text/plain',
        'Content-Length': randomStr.length,
      };
      res = new Response(200, headers, randomStr);
    } else {
      res = new Response(404, {}, '');
    }
    socket.write(res.toString());
    socket.end();
  });

  socket.on("close", () => {
    console.log("* socket closed");
    socket.end();
  });
});

server.listen(4221, "localhost");