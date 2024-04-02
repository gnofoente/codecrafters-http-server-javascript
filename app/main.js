const net = require("net");
const CRLF = '\r\n\r\n';

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const dataStr = data.toString('utf-8');
    const dataStrLines = dataStr.split('\r\n');
    const requestStr = dataStrLines[0];
    const [verb, path, version] = requestStr.split(' ');

    let status;

    if (path === '/') {
      status = `200 OK`;
    } else {
      status = `404 NOT FOUND`;
    }
    setTimeout(() => {
      socket.write(`HTTP/1.1 ${status} ${CRLF}`);
      socket.end();
    }, 1000);
  });

  socket.on("close", () => {
    console.log("socket closed");
    socket.end();
  });
});

server.listen(4221, "localhost");