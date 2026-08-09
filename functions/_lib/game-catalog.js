import cmsSeed from "../../cms-server-seed.json";
import { getCmsDocument, sanitizeGameId } from "./cms.js";

const BASE_GAME_DEFAULTS = {
    wukong: { title: "Black Myth: Wukong", engine: "Unreal Engine 5", developer: "Game Science", version: "v1.0.4", size: "1.2 GB", appid: 2358720, price: 0, type: "Free", progress: 100, date: "2026-06-15" },
    eldenring: { title: "Elden Ring: Shadow of the Erdtree", engine: "PhyreEngine (Custom)", developer: "FromSoftware", version: "v1.12.2", size: "650 MB", appid: 1245620, price: 0, type: "Free", progress: 100, date: "2026-06-20" },
    cyberpunk: { title: "Cyberpunk 2077: Phantom Liberty", engine: "REDengine", developer: "CD Projekt RED", version: "v2.12", size: "950 MB", appid: 1091500, price: 90000, type: "Premium", progress: 100, date: "2026-05-10" },
    residentevil4: { title: "Resident Evil 4 Remake", engine: "RE Engine", developer: "Capcom", version: "v1.0.6", size: "350 MB", appid: 2050650, price: 80000, type: "Premium", progress: 100, date: "2026-04-05" },
    liesofp: { title: "Lies of P", engine: "Unreal Engine 4", developer: "NEOWIZ", version: "v1.4.0", size: "420 MB", appid: 1627720, price: 0, type: "Free", progress: 100, date: "2026-06-01" },
    hogwarts: { title: "Hogwarts Legacy", engine: "Unreal Engine 4", developer: "Avalanche Software", version: "v1.1.2", size: "820 MB", appid: 990080, price: 0, type: "Free", progress: 100, date: "2026-03-25" },
    stray: { title: "Stray", engine: "Unreal Engine 4", developer: "BlueTwelve Studio", version: "v1.0.3", size: "120 MB", appid: 1332010, price: 0, type: "Free", progress: 100, date: "2026-02-15" },
    witcher3: { title: "The Witcher 3: Wild Hunt (Next-Gen)", engine: "REDengine 3", developer: "CD Projekt RED", version: "v4.04", size: "780 MB", appid: 292030, price: 0, type: "Free", progress: 100, date: "2026-06-25" },
    baldursgate3: { title: "Baldur's Gate 3", engine: "Larian Divinity Engine 4.0", developer: "Larian Studios", version: "v4.1.1", size: "2.1 GB", appid: 1086940, price: 120000, type: "Premium", progress: 100, date: "2026-06-10" },
    subnautica: { title: "Subnautica", engine: "Unity", developer: "Unknown Worlds", version: "v2.0.4", size: "80 MB", appid: 264710, price: 0, type: "Free", progress: 100, date: "2026-03-01" },
    rust: { title: "Rust", engine: "Unity", developer: "Facepunch Studios", version: "v1.2.9", size: "150 MB", appid: 252490, price: 0, type: "Free", progress: 100, date: "2026-02-28" },
    sekiro: { title: "Sekiro: Shadows Die Twice", engine: "PhyreEngine (Custom)", developer: "FromSoftware", version: "v1.06", size: "180 MB", appid: 814380, price: 0, type: "Free", progress: 100, date: "2026-05-20" },
    rdr2: { title: "Red Dead Redemption 2", engine: "RAGE", developer: "Rockstar Games", version: "v1.0.1491", size: "1.8 GB", appid: 1174180, price: 100000, type: "Premium", progress: 100, date: "2026-06-05" },
    ghost: { title: "Ghost of Tsushima: Director's Cut", engine: "Sucker Punch Engine", developer: "Sucker Punch Productions", version: "v1.0.5", size: "920 MB", appid: 2215430, price: 110000, type: "Premium", progress: 100, date: "2026-06-18" }
};

function plainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function meaningful(value) {
    if (value == null || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
}

function mergeMeaningful(...sources) {
    const output = {};
    for (const sourceValue of sources) {
        const source = plainObject(sourceValue);
        for (const [key, value] of Object.entries(source)) {
            if (!meaningful(value)) continue;
            if (["credits"].includes(key)) {
                output[key] = { ...plainObject(output[key]), ...plainObject(value) };
            } else {
                output[key] = value;
            }
        }
    }
    return output;
}

function cleanText(value, fallback = "") {
    return String(value ?? fallback).replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanLongText(value, fallback = "") {
    return String(value ?? fallback).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

function publicImage(value) {
    const source = String(value || "").trim();
    if (source.startsWith("/assets/")) return source;
    try {
        const url = new URL(source);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function normalizeScreenshots(value) {
    return (Array.isArray(value) ? value : [])
        .map(publicImage)
        .filter(Boolean)
        .slice(0, 8);
}

function normalizeGame(gameIdValue, rawValue) {
    const id = sanitizeGameId(gameIdValue);
    const raw = plainObject(rawValue);
    if (!id) return null;
    const title = cleanText(raw.title, `Game ${id}`);
    const appid = Math.max(0, Number(raw.appid) || 0);
    const screenshots = normalizeScreenshots(raw.screenshots);
    const fallbackImage = appid
        ? `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`
        : "/assets/brand/vietpatch-social-card.png";
    const type = cleanText(raw.type, Number(raw.price) > 0 ? "Premium" : "Free");
    const price = type.toLocaleLowerCase("en") === "free"
        ? 0
        : Math.max(0, Math.round(Number(raw.price) || 0));
    const progress = Math.max(0, Math.min(100, Number(raw.progress) || 0));
    const imageUrl = publicImage(raw.imageUrl || raw.coverImage)
        || screenshots[0]
        || fallbackImage;
    const description = cleanLongText(
        raw.description ?? raw.desc,
        `Theo dõi thông tin, phiên bản tương thích và tiến độ bản Việt hóa ${title} tại VietPatch.`
    );

    return {
        id,
        title,
        engine: cleanText(raw.engine, "Đang cập nhật"),
        developer: cleanText(raw.developer, "Đang cập nhật"),
        version: cleanText(raw.version, "Đang cập nhật"),
        size: cleanText(raw.size, "Đang cập nhật"),
        type,
        price,
        progress,
        date: cleanText(raw.date),
        description,
        notes: cleanLongText(raw.notes),
        imageUrl,
        screenshots,
        credits: plainObject(raw.credits),
        tags: (Array.isArray(raw.tags) ? raw.tags : []).map(item => cleanText(item)).filter(Boolean).slice(0, 12),
        hasDownload: Boolean(cleanText(raw.downloadUrl)),
        appid
    };
}

export function buildPublishedGames(stateValue) {
    const state = plainObject(stateValue);
    const seedOverrides = plainObject(cmsSeed.gameOverrides);
    const liveOverrides = plainObject(state.gameOverrides);
    const hidden = new Set((Array.isArray(state.hiddenGameIds) ? state.hiddenGameIds : [])
        .map(sanitizeGameId)
        .filter(Boolean));
    const games = [];

    for (const [id, defaults] of Object.entries(BASE_GAME_DEFAULTS)) {
        if (hidden.has(id)) continue;
        const game = normalizeGame(id, mergeMeaningful(defaults, seedOverrides[id], liveOverrides[id]));
        if (game) games.push(game);
    }

    for (const customValue of Array.isArray(state.customGames) ? state.customGames : []) {
        const custom = plainObject(customValue);
        const id = sanitizeGameId(custom.id);
        if (!id || hidden.has(id) || games.some(game => game.id === id)) continue;
        const game = normalizeGame(id, custom);
        if (game) games.push(game);
    }

    return games.sort((left, right) => {
        const dateDifference = (Date.parse(right.date) || 0) - (Date.parse(left.date) || 0);
        return dateDifference || left.title.localeCompare(right.title, "vi", { sensitivity: "base" });
    });
}

export function baseGameTitle(titleValue) {
    const title = cleanText(titleValue, "Game");
    return title.replace(/\s+việt\s*hóa\s*$/iu, "").trim() || title;
}

export function gameDisplayTitle(game) {
    return `${baseGameTitle(game?.title)} Việt hóa`;
}

export function gameSeoSlug(game) {
    const normalized = baseGameTitle(game?.title)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .toLocaleLowerCase("en")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 88);
    return `${normalized || "game"}-viet-hoa`;
}

export function gameCanonicalPath(game) {
    return `/game/${encodeURIComponent(game.id)}/${gameSeoSlug(game)}`;
}

export async function getPublishedGameCatalog(env) {
    const document = await getCmsDocument(env);
    return {
        games: buildPublishedGames(document.published),
        publishedAt: document.publishedAt,
        publishedVersion: document.publishedVersion
    };
}
