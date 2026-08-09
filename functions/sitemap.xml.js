import {
    gameCanonicalPath,
    gameDisplayTitle,
    getPublishedGameCatalog
} from "./_lib/game-catalog.js";
import { securityHeaders } from "./_lib/http.js";

const SITE_ORIGIN = "https://vietpatch.online";

function xmlEscape(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function lastmod(value, fallback) {
    const date = new Date(value || fallback);
    return Number.isNaN(date.getTime()) ? "2026-08-09" : date.toISOString().slice(0, 10);
}

function absoluteUrl(value) {
    try {
        return new URL(String(value || ""), SITE_ORIGIN).href;
    } catch {
        return "";
    }
}

export async function onRequestGet(context) {
    const catalog = await getPublishedGameCatalog(context.env);
    const publishedDate = lastmod(catalog.publishedAt);
    const gameEntries = catalog.games.map(game => {
        const image = absoluteUrl(game.imageUrl);
        const imageEntry = image
            ? `<image:image><image:loc>${xmlEscape(image)}</image:loc><image:title>${xmlEscape(gameDisplayTitle(game))}</image:title></image:image>`
            : "";
        return `<url><loc>${xmlEscape(`${SITE_ORIGIN}${gameCanonicalPath(game)}`)}</loc><lastmod>${lastmod(game.date, catalog.publishedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority>${imageEntry}</url>`;
    }).join("");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>${SITE_ORIGIN}/</loc><lastmod>${publishedDate}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url><url><loc>${SITE_ORIGIN}/game</loc><lastmod>${publishedDate}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url><url><loc>${SITE_ORIGIN}/privacy.html</loc><lastmod>2026-07-24</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>${gameEntries}</urlset>`;
    const headers = securityHeaders(new Headers({
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=900"
    }));
    return new Response(xml, { status: 200, headers });
}
