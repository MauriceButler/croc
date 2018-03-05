const http = require('http');
const serveStatic = require('serve-static');

function middleware(baseDirectory) {
    const respond = serveStatic(baseDirectory, {
        index: false,
    });

    return function(request, response, next) {
        function sendIndex() {
            request.url = '/index.html';
            respond(request, response, send404);
        }

        function send404() {
            if (next) {
                return next();
            }

            response.writeHead(404);
            response.end();
        }

        console.log(request.url);
        if (!request.url.startsWith('/dist')) {
            return sendIndex();
        }

        request.url = request.url.slice('/dist'.length);
        return respond(request, response, send404);
    };
}

function serve(baseDirectory, port) {
    const server = http.createServer(middleware(baseDirectory));

    server.listen(port, error => console.log(error || `listening on http://localhost:${port}`));
}

exports.serve = serve;
