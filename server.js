const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3888;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
    let rawUrl = req.url.split("?")[0].split("#")[0];
    if (rawUrl === "/" || rawUrl === "") {
        rawUrl = "/test_harness.html";
    }

    let decodedPath;
    try {
        decodedPath = decodeURIComponent(rawUrl);
    } catch {
        res.writeHead(400);
        return res.end("Bad Request");
    }

    // Support /v/<hash>/ alias to /game/
    if (decodedPath.startsWith("/v/")) {
        decodedPath = decodedPath.replace(/^\/v\/[^\/]+\//, "/game/");
    }

    // Support SillyTavern extension path prefix alias
    if (decodedPath.startsWith("/scripts/extensions/third-party/sillytavern-shapez/")) {
        decodedPath = decodedPath.replace(/^\/scripts\/extensions\/third-party\/sillytavern-shapez\//, "/");
    }

    let filePath = path.join(ROOT_DIR, decodedPath);

    // Prevent directory traversal
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        return res.end("Forbidden");
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            return res.end(`File not found: ${decodedPath}`);
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        // Support audio Range requests
        const range = req.headers.range;
        if (range && (ext === ".mp3" || ext === ".wav")) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${stats.size}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunksize,
                "Content-Type": contentType
            });
            file.pipe(res);
        } else {
            res.writeHead(200, {
                "Content-Type": contentType,
                "Content-Length": stats.size,
                "Cache-Control": "no-cache"
            });
            fs.createReadStream(filePath).pipe(res);
        }
    });
});

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Local Test Server is running on port ${PORT}:`);
    console.log(`🔷 SillyTavern Floating Window: http://localhost:${PORT}/test_harness.html`);
    console.log(`🎮 Direct Offline Game Web Build: http://localhost:${PORT}/game/index.html`);
    console.log(`====================================================`);
});
