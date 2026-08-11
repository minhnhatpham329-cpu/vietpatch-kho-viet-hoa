import { getGameStats } from "../_lib/community.js";
import {
    gameCanonicalPath,
    gameDisplayTitle,
    getPublishedGameCatalog
} from "../_lib/game-catalog.js";
import { securityHeaders } from "../_lib/http.js";

const SITE_ORIGIN = "https://vietpatch.online";
const SITE_NAME = "VietPatch";
const BRAND_IMAGE = `${SITE_ORIGIN}/assets/brand/vietpatch-social-card.png`;

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJson(value) {
    return JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");
}

function absoluteUrl(value) {
    try {
        return new URL(String(value || ""), SITE_ORIGIN).href;
    } catch {
        return BRAND_IMAGE;
    }
}

function summarize(value, maxLength = 158) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(1, maxLength - 1)).replace(/\s+\S*$/, "")}…`;
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Đang cập nhật";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function formatCount(value) {
    return Math.max(0, Math.round(Number(value) || 0)).toLocaleString("vi-VN");
}

function formatPrice(game) {
    const price = Math.max(0, Math.round(Number(game?.price) || 0));
    return price > 0 ? `${price.toLocaleString("vi-VN")}đ` : "Miễn phí";
}

function statusFor(game) {
    const progress = Math.max(0, Math.min(100, Number(game?.progress) || 0));
    return progress >= 100
        ? { label: "Sẵn sàng", detail: "Đã phát hành", className: "is-ready" }
        : { label: `${progress}%`, detail: "Đang thực hiện", className: "is-progress" };
}

function paragraphs(value) {
    const blocks = String(value || "")
        .split(/\n\s*\n/g)
        .map(item => item.trim())
        .filter(Boolean);
    return blocks.map(item => `<p>${escapeHtml(item).replace(/\n/g, "<br>")}</p>`).join("");
}

function validCredits(game) {
    const labels = {
        translator: "Biên dịch",
        editor: "Hiệu đính",
        technical: "Kỹ thuật",
        qa: "Kiểm thử"
    };
    return Object.entries(labels)
        .map(([key, label]) => ({ label, value: String(game?.credits?.[key] || "").trim() }))
        .filter(item => item.value);
}

function shell({ title, description, canonical, image, body, jsonLd, robots = "index, follow" }) {
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeCanonical = escapeHtml(canonical);
    const safeImage = escapeHtml(image);
    return `<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${safeDescription}">
    <meta name="robots" content="${escapeHtml(robots)}, max-image-preview:large, max-snippet:-1">
    <meta name="theme-color" content="#11110f">
    <meta property="og:locale" content="vi_VN">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:url" content="${safeCanonical}">
    <meta property="og:image" content="${safeImage}">
    <meta property="og:image:alt" content="${safeTitle}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    <meta name="twitter:image" content="${safeImage}">
    <title>${safeTitle}</title>
    <link rel="canonical" href="${safeCanonical}">
    <link rel="alternate" hreflang="vi-VN" href="${safeCanonical}">
    <link rel="icon" type="image/png" sizes="192x192" href="/assets/brand/icon-192.png">
    <link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap">
    <link rel="stylesheet" href="/game-page.css?v=20260811-v3-video">
    <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
    <a class="skip-link" href="#noi-dung">Đi tới nội dung</a>
    <header class="site-head">
        <a class="brand" href="/" aria-label="Về trang chủ VietPatch">
            <img src="/assets/brand/favicon-48x48.png" width="38" height="38" alt="">
            <span><strong>VIETPATCH</strong><small>HỒ SƠ VIỆT HÓA GAME</small></span>
        </a>
        <nav aria-label="Điều hướng chính">
            <a href="/#catalog">Kho sưu tập</a>
            <a class="is-active" href="/game">Chỉ mục game</a>
            <a href="/?tab=progress">Tiến độ</a>
            <a href="/?tab=requests">Đề xuất</a>
        </nav>
    </header>
    ${body}
    <footer class="site-foot">
        <a class="brand foot-brand" href="/"><img src="/assets/brand/favicon-48x48.png" width="32" height="32" alt=""><span><strong>VIETPATCH</strong><small>THƯ VIỆN VIỆT HÓA GAME PC</small></span></a>
        <p>Thông tin phiên bản, tiến độ và trạng thái kiểm thử được công bố theo từng hồ sơ.</p>
        <div><a href="mailto:dungsieuviet347@gmail.com">dungsieuviet347@gmail.com</a><span>YouTube · Sẽ cập nhật sau</span><a href="/privacy.html">Quyền riêng tư</a><span>© 2026 VietPatch</span></div>
    </footer>
</body>
</html>`;
}

async function htmlResponse(markup, status, jsonLd, cacheControl = "public, max-age=60, s-maxage=180, stale-while-revalidate=600") {
    const headers = securityHeaders(new Headers({
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": cacheControl
    }));
    if (jsonLd) {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(jsonLd));
        const hash = btoa(String.fromCharCode(...new Uint8Array(digest)));
        headers.set(
            "Content-Security-Policy",
            String(headers.get("Content-Security-Policy") || "")
                .replace("script-src 'self'", `script-src 'self' 'sha256-${hash}'`)
        );
    }
    return new Response(markup, { status, headers });
}

function gameIndexBody(games, publishedAt) {
    const cards = games.map(game => {
        const path = gameCanonicalPath(game);
        const status = statusFor(game);
        return `<article class="index-card">
            <a class="index-cover" href="${escapeHtml(path)}" aria-label="Xem ${escapeHtml(gameDisplayTitle(game))}">
                <img class="index-cover-backdrop" src="${escapeHtml(absoluteUrl(game.imageUrl))}" alt="" aria-hidden="true" loading="lazy">
                <img class="index-cover-art" src="${escapeHtml(absoluteUrl(game.imageUrl))}" alt="Ảnh ${escapeHtml(gameDisplayTitle(game))}" loading="lazy">
                <span class="status-chip ${status.className}">${escapeHtml(status.label)}</span>
            </a>
            <div class="index-card-copy">
                <p class="index-meta">${escapeHtml(game.engine)} · ${escapeHtml(game.developer)}</p>
                <h2><a href="${escapeHtml(path)}">${escapeHtml(gameDisplayTitle(game))}</a></h2>
                <p>${escapeHtml(summarize(game.description, 135))}</p>
                <dl><div><dt>Patch</dt><dd>${escapeHtml(game.version)}</dd></div><div><dt>Cập nhật</dt><dd>${escapeHtml(formatDate(game.date))}</dd></div></dl>
                <a class="index-card-action" href="${escapeHtml(path)}">Xem hồ sơ <span>→</span></a>
            </div>
        </article>`;
    }).join("");

    return `<main id="noi-dung" class="index-main">
        <nav class="breadcrumbs" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span>/</span><span>Chỉ mục game</span></nav>
        <header class="index-intro">
            <div class="index-intro-copy">
                <p class="eyebrow">CHỈ MỤC VIETPATCH / HỒ SƠ ĐÃ XUẤT BẢN</p>
                <h1>Kho game<br>Việt hóa.</h1>
                <p>Tra cứu đúng game, phiên bản và trạng thái trong một danh mục được đồng bộ trực tiếp từ Content Studio.</p>
            </div>
            <div class="index-ledger" aria-label="Tổng quan chỉ mục">
                <span>ĐANG LƯU TRỮ</span>
                <strong>${String(games.length).padStart(2, "0")}</strong>
                <p>hồ sơ game</p>
                <small>Cập nhật ${escapeHtml(formatDate(publishedAt))}</small>
            </div>
        </header>
        <section class="index-grid" aria-label="Danh sách game Việt hóa">${cards}</section>
    </main>`;
}

function gameBody(game, stats) {
    const canonicalPath = gameCanonicalPath(game);
    const displayTitle = gameDisplayTitle(game);
    const status = statusFor(game);
    const screenshots = game.screenshots.length
        ? `<section class="content-section"><div class="section-heading"><p class="eyebrow">HÌNH ẢNH</p><h2>Ảnh trong hồ sơ</h2></div><div class="shot-grid">${game.screenshots.map((source, index) => `<img src="${escapeHtml(absoluteUrl(source))}" alt="${escapeHtml(displayTitle)} - ảnh ${index + 1}" loading="lazy">`).join("")}</div></section>`
        : "";
    const credits = validCredits(game);
    const creditsSection = credits.length
        ? `<section class="content-section credits-section"><div class="section-heading"><p class="eyebrow">GHI CÔNG</p><h2>Nhóm thực hiện</h2></div><dl class="credit-grid">${credits.map(item => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join("")}</dl></section>`
        : "";
    const notes = game.notes
        ? `<section class="content-section note-section"><div class="section-heading"><p class="eyebrow">LƯU Ý</p><h2>Cài đặt và tương thích</h2></div><div class="prose">${paragraphs(game.notes)}</div></section>`
        : "";
    const videoSection = game.videoEnabled !== false && game.videoId
        ? `<section class="content-section video-section">
            <div class="video-copy">
                <div class="video-kicker"><span>VP / SCREENING</span><b>01</b></div>
                <p class="eyebrow">SUẤT CHIẾU BẢN VIỆT HÓA</p>
                <h2>${escapeHtml(game.videoTitle || `Trải nghiệm ${displayTitle}`)}</h2>
                <p>${escapeHtml(game.videoSummary || "Xem trực tiếp giao diện, phụ đề và chất lượng hiển thị của bản Việt hóa trong game.")}</p>
                <div class="video-proof"><span><i></i> Đúng hồ sơ game</span><span>YOUTUBE / 16:9</span></div>
                <a href="https://www.youtube.com/watch?v=${encodeURIComponent(game.videoId)}" target="_blank" rel="noopener noreferrer">Xem trên YouTube <span>↗</span></a>
            </div>
            <div class="video-stage">
                <span class="video-stage-code">VIETPATCH / IN-GAME FOOTAGE</span>
                <div class="video-frame">
                    <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(game.videoId)}?rel=0&amp;modestbranding=1" title="${escapeHtml(game.videoTitle || `Video Việt hóa ${displayTitle}`)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                </div>
            </div>
        </section>`
        : "";

    return `<main id="noi-dung" class="game-main">
        <nav class="breadcrumbs" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span>/</span><a href="/game">Game</a><span>/</span><span>${escapeHtml(displayTitle)}</span></nav>
        <article>
            <header class="game-hero">
                <div class="game-summary">
                    <div class="summary-code"><span>VP / PATCH ARCHIVE</span><b>${escapeHtml(game.id.toUpperCase())}</b></div>
                    <p class="eyebrow"><span class="signal"></span> HỒ SƠ VIỆT HÓA · ${escapeHtml(status.detail.toUpperCase())}</p>
                    <h1>${escapeHtml(displayTitle)}</h1>
                    <p class="lead">${escapeHtml(summarize(game.description, 320))}</p>
                    <div class="quick-facts">
                        <div><span>Phiên bản</span><strong>${escapeHtml(game.version)}</strong></div>
                        <div><span>Dung lượng</span><strong>${escapeHtml(game.size)}</strong></div>
                        <div><span>Trạng thái</span><strong class="${status.className}">${escapeHtml(status.label)}</strong></div>
                        <div><span>Phát hành</span><strong>${escapeHtml(formatPrice(game))}</strong></div>
                    </div>
                    <div class="hero-actions">
                        <a class="primary-action" href="/?game=${encodeURIComponent(game.id)}">Mở hồ sơ tương tác <span>→</span></a>
                        <a class="text-action" href="/game">Xem toàn bộ game</a>
                    </div>
                </div>
                <div class="game-cover">
                    <img class="cover-backdrop" src="${escapeHtml(absoluteUrl(game.imageUrl))}" alt="" aria-hidden="true">
                    <img class="cover-art" src="${escapeHtml(absoluteUrl(game.imageUrl))}" alt="Ảnh đại diện ${escapeHtml(displayTitle)}">
                    <span class="cover-code">CẬP NHẬT / ${escapeHtml(formatDate(game.date))}</span>
                </div>
            </header>

            <section class="proof-strip" aria-label="Thông tin cộng đồng">
                <div><span>Lượt xem</span><strong>${escapeHtml(formatCount(stats.views))}</strong></div>
                <div><span>Lượt tải</span><strong>${escapeHtml(formatCount(stats.downloads))}</strong></div>
                <div><span>Đánh giá</span><strong>${stats.reviewCount > 0 ? `${escapeHtml(Number(stats.ratingAverage).toFixed(1))}/5` : "Chưa có"}</strong><small>${stats.reviewCount > 0 ? `${escapeHtml(formatCount(stats.reviewCount))} lượt` : "Hãy là người đầu tiên"}</small></div>
                <div><span>Cập nhật</span><strong>${escapeHtml(formatDate(game.date))}</strong></div>
            </section>

            <section class="content-layout">
                <div class="content-section description-section">
                    <div class="section-heading"><p class="eyebrow">TỔNG QUAN</p><h2>Thông tin bản Việt hóa</h2></div>
                    <div class="prose">${paragraphs(game.description)}</div>
                </div>
                <aside class="technical-card">
                    <p class="eyebrow">THÔNG SỐ HỒ SƠ</p>
                    <dl>
                        <div><dt>Game</dt><dd>${escapeHtml(game.title)}</dd></div>
                        <div><dt>Nhà phát triển</dt><dd>${escapeHtml(game.developer)}</dd></div>
                        <div><dt>Engine</dt><dd>${escapeHtml(game.engine)}</dd></div>
                        <div><dt>Patch</dt><dd>${escapeHtml(game.version)}</dd></div>
                        <div><dt>Tiến độ</dt><dd>${escapeHtml(String(game.progress))}%</dd></div>
                    </dl>
                    <a href="/?game=${encodeURIComponent(game.id)}">Kiểm tra tải và tương thích →</a>
                </aside>
            </section>
            ${videoSection}
            ${screenshots}
            ${notes}
            ${creditsSection}
            <section class="final-cta">
                <div><p class="eyebrow">VIETPATCH / ${escapeHtml(game.id.toUpperCase())}</p><h2>Đúng game. Đúng phiên bản.</h2><p>Mở hồ sơ tương tác để xem quyền tải, đánh giá cộng đồng và báo cáo phiên bản mới.</p></div>
                <a class="primary-action" href="/?game=${encodeURIComponent(game.id)}">Mở hồ sơ <span>→</span></a>
            </section>
        </article>
    </main>`;
}

function notFoundBody() {
    return `<main id="noi-dung" class="not-found-main"><p class="eyebrow">404 / KHÔNG TÌM THẤY</p><h1>Hồ sơ game không tồn tại.</h1><p>Game có thể đã được ẩn, đổi mã hoặc chưa được xuất bản.</p><a class="primary-action" href="/game">Mở chỉ mục game <span>→</span></a></main>`;
}

export async function onRequestGet(context) {
    const requestUrl = new URL(context.request.url);
    const segments = requestUrl.pathname.split("/").filter(Boolean);
    const catalog = await getPublishedGameCatalog(context.env);

    if (segments.length === 1) {
        const canonical = `${SITE_ORIGIN}/game`;
        const title = "Chỉ mục game Việt hóa PC | VietPatch";
        const description = `Khám phá ${catalog.games.length} hồ sơ Việt hóa game PC đã xuất bản tại VietPatch, tự động cập nhật theo Content Studio.`;
        const graph = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "CollectionPage",
                    "@id": `${canonical}#webpage`,
                    url: canonical,
                    name: title,
                    description,
                    inLanguage: "vi-VN",
                    isPartOf: { "@id": `${SITE_ORIGIN}/#website` }
                },
                {
                    "@type": "ItemList",
                    itemListElement: catalog.games.map((game, index) => ({
                        "@type": "ListItem",
                        position: index + 1,
                        name: gameDisplayTitle(game),
                        url: `${SITE_ORIGIN}${gameCanonicalPath(game)}`
                    }))
                }
            ]
        };
        const jsonLd = escapeJson(graph);
        const markup = shell({
            title,
            description,
            canonical,
            image: BRAND_IMAGE,
            body: gameIndexBody(catalog.games, catalog.publishedAt),
            jsonLd
        });
        return htmlResponse(markup, 200, jsonLd);
    }

    let requestedId = "";
    let requestedSlug = "";
    try {
        requestedId = decodeURIComponent(segments[1] || "").toLocaleLowerCase("en");
        requestedSlug = decodeURIComponent(segments[2] || "");
    } catch {
        requestedId = "";
    }
    const game = catalog.games.find(item => item.id === requestedId);
    if (!game) {
        const title = "Không tìm thấy hồ sơ | VietPatch";
        const description = "Hồ sơ game này không tồn tại hoặc chưa được xuất bản tại VietPatch.";
        const canonical = `${SITE_ORIGIN}/game`;
        const jsonLd = escapeJson({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: title,
            url: canonical
        });
        const markup = shell({ title, description, canonical, image: BRAND_IMAGE, body: notFoundBody(), jsonLd, robots: "noindex, follow" });
        return htmlResponse(markup, 404, jsonLd, "no-store");
    }

    const canonicalPath = gameCanonicalPath(game);
    const canonical = `${SITE_ORIGIN}${canonicalPath}`;
    if (segments.length !== 3 || requestUrl.pathname !== canonicalPath || requestedSlug !== canonicalPath.split("/").at(-1)) {
        return Response.redirect(canonical, 308);
    }

    const stats = await getGameStats(context.env, game.id).catch(() => ({
        views: 0,
        downloads: 0,
        reviewCount: 0,
        ratingAverage: 0
    }));
    const displayTitle = gameDisplayTitle(game);
    const title = `${displayTitle} – phiên bản, tải và đánh giá | VietPatch`;
    const description = summarize(`${game.description} Patch ${game.version}, ${game.size}, ${statusFor(game).detail.toLocaleLowerCase("vi")}.`, 158);
    const image = absoluteUrl(game.imageUrl);
    const graph = [
        {
            "@type": "WebPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: title,
            description,
            inLanguage: "vi-VN",
            primaryImageOfPage: { "@type": "ImageObject", url: image },
            isPartOf: { "@id": `${SITE_ORIGIN}/#website` }
        },
        {
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "Trang chủ", item: `${SITE_ORIGIN}/` },
                { "@type": "ListItem", position: 2, name: "Chỉ mục game", item: `${SITE_ORIGIN}/game` },
                { "@type": "ListItem", position: 3, name: displayTitle, item: canonical }
            ]
        }
    ];
    if (stats.reviewCount > 0 && stats.ratingAverage > 0) {
        graph.push({
            "@type": "SoftwareApplication",
            name: displayTitle,
            url: canonical,
            image,
            operatingSystem: "Windows",
            applicationCategory: "GameApplication",
            offers: {
                "@type": "Offer",
                price: String(Math.max(0, Number(game.price) || 0)),
                priceCurrency: "VND",
                availability: game.progress >= 100 ? "https://schema.org/InStock" : "https://schema.org/PreOrder"
            },
            aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: Number(stats.ratingAverage),
                ratingCount: Number(stats.reviewCount),
                bestRating: 5,
                worstRating: 1
            }
        });
    }
    if (game.videoEnabled !== false && game.videoId) {
        graph.push({
            "@type": "VideoObject",
            name: game.videoTitle || `Video Việt hóa ${displayTitle}`,
            description: summarize(game.videoSummary || game.description, 158),
            thumbnailUrl: `https://i.ytimg.com/vi/${game.videoId}/maxresdefault.jpg`,
            embedUrl: `https://www.youtube-nocookie.com/embed/${game.videoId}`,
            contentUrl: `https://www.youtube.com/watch?v=${game.videoId}`,
            uploadDate: game.date || catalog.publishedAt || new Date().toISOString()
        });
    }
    const jsonLd = escapeJson({ "@context": "https://schema.org", "@graph": graph });
    const markup = shell({
        title,
        description,
        canonical,
        image,
        body: gameBody(game, stats),
        jsonLd
    });
    return htmlResponse(markup, 200, jsonLd);
}
