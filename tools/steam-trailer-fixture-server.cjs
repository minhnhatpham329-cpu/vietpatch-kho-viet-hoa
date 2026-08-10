const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = 4178;
const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json"
};

async function main() {
    const seed = JSON.parse(fs.readFileSync(path.join(root, "cms-server-seed.json"), "utf8"));
    const response = await fetch("https://store.steampowered.com/api/appdetails?appids=1091500&cc=us&l=english");
    const store = await response.json();
    const data = store["1091500"].data;
    const movie = data.movies.find(item => item.highlight && item.hls_h264)
        || data.movies.find(item => item.hls_h264);
    seed.trailers = [{
        id: "steam-1091500",
        source: "steam",
        videoUrl: movie.hls_h264,
        posterUrl: movie.thumbnail,
        externalUrl: "https://store.steampowered.com/app/1091500/",
        steamAppId: "1091500",
        title: data.name,
        category: "Action RPG / Cyberpunk",
        description: "Trailer Steam chính chủ được dùng để kiểm thử luồng tự động của VietPatch.",
        enabled: true,
        automated: true,
        generatedAt: new Date().toISOString()
    }];

    const server = http.createServer((request, responseStream) => {
        const url = new URL(request.url, `http://127.0.0.1:${port}`);
        if (url.pathname === "/api/vietpatch/cms") {
            responseStream.writeHead(200, {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store"
            });
            responseStream.end(JSON.stringify({
                state: seed,
                meta: { publishedVersion: 1, publishedAt: new Date().toISOString() },
                mode: "steam-trailer-fixture"
            }));
            return;
        }
        if (url.pathname.startsWith("/api/")) {
            responseStream.writeHead(404, { "Content-Type": "application/json" });
            responseStream.end("{}");
            return;
        }

        const relative = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)
            .replace(/^\/+/, "");
        const target = path.resolve(root, relative);
        if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
            responseStream.writeHead(404);
            responseStream.end("Not found");
            return;
        }
        responseStream.writeHead(200, {
            "Content-Type": types[path.extname(target).toLowerCase()] || "application/octet-stream",
            "Cache-Control": "no-store"
        });
        fs.createReadStream(target).pipe(responseStream);
    });

    server.listen(port, "127.0.0.1", () => {
        console.log(`Steam fixture on http://127.0.0.1:${port}/`);
    });
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
