const http = require('http');
const fs = require('fs');
const path = require('path');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, decodeURIComponent(req.url === '/' ? '/index.html' : req.url));
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
});
const port = process.env.PORT || 8080;
server.listen(port, () => console.log(`Server running on http://localhost:${port}`));
