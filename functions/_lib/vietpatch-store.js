import { ensureSchema } from "./db.js";
import { resolvePublishedOffer, sanitizeGameId } from "./cms.js";
import { httpError } from "./http.js";
import {
    getUserSessionId,
    hashPassword,
    normalizeEmail,
    normalizeUsername,
    validateRegistration,
    verifyPassword
} from "./user-auth.js";

const MIN_DEPOSIT = 10000;
const MAX_DEPOSIT = 10000000;
const ORDER_TTL_MS = 24 * 60 * 60 * 1000;

function nowIso() {
    return new Date().toISOString();
}

function randomHex(bytes = 12) {
    return [...crypto.getRandomValues(new Uint8Array(bytes))]
        .map(value => value.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
}

function randomId(prefix) {
    return `${prefix}_${crypto.randomUUID()}`;
}

function isUniqueError(error) {
    return /unique|constraint/i.test(String(error?.message || ""));
}

function resultChanges(result) {
    return Number(result?.meta?.changes || 0);
}

function transactionFromRow(row) {
    return {
        id: row.id,
        type: row.type,
        title: row.title,
        amount: Number(row.amount) || 0,
        method: row.method,
        status: row.status || "success",
        gameId: row.game_id || null,
        balanceAfter: Number(row.balance_after) || 0,
        createdAt: row.created_at
    };
}

function orderFromRow(row) {
    if (!row) return null;
    return {
        orderId: row.id,
        userId: row.user_id,
        amount: Number(row.amount) || 0,
        memo: row.memo,
        status: row.status,
        itemType: row.item_type,
        gameId: row.game_id || null,
        itemTitle: row.item_title,
        provider: row.provider || "vietqr",
        providerTransactionId: row.provider_transaction_id || null,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        paidAt: row.paid_at || null,
        appliedAt: row.applied_at || null
    };
}

export async function getAccountById(env, userId) {
    await ensureSchema(env);
    const row = await env.DB.prepare(
        `SELECT id, email, username, password_hash, balance, created_at, updated_at
         FROM vietpatch_users WHERE id = ?`
    ).bind(String(userId || "")).first();
    if (!row) return null;

    const [entitlements, transactions] = await env.DB.batch([
        env.DB.prepare(
            `SELECT game_id FROM vietpatch_entitlements
             WHERE user_id = ? ORDER BY created_at DESC`
        ).bind(row.id),
        env.DB.prepare(
            `SELECT id, type, title, amount, method, status, game_id, balance_after, created_at
             FROM vietpatch_transactions
             WHERE user_id = ? AND applied_at IS NOT NULL
             ORDER BY created_at DESC, id DESC
             LIMIT 80`
        ).bind(row.id)
    ]);

    return {
        id: row.id,
        email: row.email,
        username: row.username,
        passwordHash: row.password_hash,
        balance: Math.max(0, Number(row.balance) || 0),
        ownedGames: (entitlements.results || []).map(item => item.game_id),
        transactionHistory: (transactions.results || []).map(transactionFromRow),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export function publicAccount(account) {
    return {
        id: account.id,
        loggedIn: true,
        username: account.username,
        email: account.email,
        balance: account.balance,
        ownedGames: account.ownedGames,
        joinedAt: account.createdAt,
        transactionHistory: account.transactionHistory
    };
}

export async function getRequestAccount(request, env) {
    const userId = await getUserSessionId(request, env);
    return userId ? getAccountById(env, userId) : null;
}

export async function requireAccount(request, env) {
    const account = await getRequestAccount(request, env);
    if (!account) throw httpError(401, "AUTH_REQUIRED");
    return account;
}

export async function createAccount(env, input) {
    await ensureSchema(env);
    const email = normalizeEmail(input?.email);
    const username = normalizeUsername(input?.username || input?.name || email.split("@")[0]);
    const password = String(input?.password || "");
    validateRegistration({ email, username, password });

    const existing = await env.DB.prepare(
        "SELECT id FROM vietpatch_users WHERE email = ? COLLATE NOCASE"
    ).bind(email).first();
    if (existing) throw httpError(409, "EMAIL_EXISTS");

    const userId = randomId("usr");
    const createdAt = nowIso();
    try {
        await env.DB.prepare(
            `INSERT INTO vietpatch_users
                (id, email, username, password_hash, balance, created_at, updated_at)
             VALUES (?, ?, ?, ?, 0, ?, ?)`
        ).bind(
            userId,
            email,
            username,
            await hashPassword(password),
            createdAt,
            createdAt
        ).run();
    } catch (error) {
        if (isUniqueError(error)) throw httpError(409, "EMAIL_EXISTS");
        throw error;
    }
    return getAccountById(env, userId);
}

export async function verifyAccountLogin(env, emailValue, passwordValue) {
    await ensureSchema(env);
    const email = normalizeEmail(emailValue);
    const row = await env.DB.prepare(
        `SELECT id, password_hash FROM vietpatch_users
         WHERE email = ? COLLATE NOCASE`
    ).bind(email).first();
    if (!row || !await verifyPassword(String(passwordValue || ""), row.password_hash)) return null;
    await env.DB.prepare(
        "UPDATE vietpatch_users SET updated_at = ? WHERE id = ?"
    ).bind(nowIso(), row.id).run();
    return getAccountById(env, row.id);
}

export async function getOrCreateGoogleAccount(env, profile) {
    await ensureSchema(env);
    const providerUserId = String(profile?.sub || "").trim();
    const email = normalizeEmail(profile?.email);
    const username = normalizeUsername(profile?.name || email.split("@")[0] || "Gamer");
    if (
        profile?.emailVerified !== true
        || !/^[A-Za-z0-9_-]{3,255}$/.test(providerUserId)
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || email.length > 254
        || username.length < 2
    ) {
        throw httpError(403, "GOOGLE_IDENTITY_NOT_VERIFIED");
    }

    const identity = await env.DB.prepare(
        `SELECT user_id FROM vietpatch_oauth_identities
         WHERE provider = 'google' AND provider_user_id = ?`
    ).bind(providerUserId).first();
    if (identity?.user_id) {
        await env.DB.prepare(
            `UPDATE vietpatch_oauth_identities SET updated_at = ?
             WHERE provider = 'google' AND provider_user_id = ?`
        ).bind(nowIso(), providerUserId).run();
        return getAccountById(env, identity.user_id);
    }

    const existing = await env.DB.prepare(
        "SELECT id FROM vietpatch_users WHERE email = ? COLLATE NOCASE"
    ).bind(email).first();
    const createdAt = nowIso();
    if (existing?.id) {
        try {
            await env.DB.prepare(
                `INSERT INTO vietpatch_oauth_identities
                    (provider, provider_user_id, user_id, created_at, updated_at)
                 VALUES ('google', ?, ?, ?, ?)`
            ).bind(providerUserId, existing.id, createdAt, createdAt).run();
        } catch (error) {
            if (!isUniqueError(error)) throw error;
            const linked = await env.DB.prepare(
                `SELECT user_id FROM vietpatch_oauth_identities
                 WHERE provider = 'google' AND provider_user_id = ?`
            ).bind(providerUserId).first();
            if (linked?.user_id) return getAccountById(env, linked.user_id);
            throw httpError(409, "GOOGLE_ACCOUNT_ALREADY_LINKED");
        }
        return getAccountById(env, existing.id);
    }

    const userId = randomId("usr");
    const disabledPasswordHash = `oauth$google$${randomHex(32)}`;
    try {
        await env.DB.batch([
            env.DB.prepare(
                `INSERT INTO vietpatch_users
                    (id, email, username, password_hash, balance, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 0, ?, ?)`
            ).bind(
                userId,
                email,
                username,
                disabledPasswordHash,
                createdAt,
                createdAt
            ),
            env.DB.prepare(
                `INSERT INTO vietpatch_oauth_identities
                    (provider, provider_user_id, user_id, created_at, updated_at)
                 VALUES ('google', ?, ?, ?, ?)`
            ).bind(providerUserId, userId, createdAt, createdAt)
        ]);
    } catch (error) {
        if (!isUniqueError(error)) throw error;
        const linked = await env.DB.prepare(
            `SELECT user_id FROM vietpatch_oauth_identities
             WHERE provider = 'google' AND provider_user_id = ?`
        ).bind(providerUserId).first();
        if (linked?.user_id) return getAccountById(env, linked.user_id);
        const emailOwner = await env.DB.prepare(
            "SELECT id FROM vietpatch_users WHERE email = ? COLLATE NOCASE"
        ).bind(email).first();
        if (emailOwner?.id) return getAccountById(env, emailOwner.id);
        throw error;
    }
    return getAccountById(env, userId);
}

export async function hasEntitlement(env, userId, gameId) {
    await ensureSchema(env);
    const row = await env.DB.prepare(
        `SELECT 1 AS owned FROM vietpatch_entitlements
         WHERE user_id = ? AND game_id = ?`
    ).bind(userId, sanitizeGameId(gameId)).first();
    return Boolean(row);
}

export async function unlockFreeOffer(env, account, offer) {
    await ensureSchema(env);
    const gameId = sanitizeGameId(offer?.id);
    if (!gameId || Number(offer?.price) !== 0) throw httpError(403, "PAID_PATCH_REQUIRED");
    const createdAt = nowIso();
    const sourceKey = `free:${account.id}:${gameId}`;
    await env.DB.batch([
        env.DB.prepare(
            `INSERT OR IGNORE INTO vietpatch_entitlements
                (user_id, game_id, source, created_at)
             VALUES (?, ?, 'free', ?)`
        ).bind(account.id, gameId, createdAt),
        env.DB.prepare(
            `INSERT OR IGNORE INTO vietpatch_transactions
                (id, user_id, source_key, type, title, amount, method, status,
                 game_id, balance_after, applied_at, created_at)
             SELECT ?, id, ?, 'unlock', ?, 0, 'free', 'success', ?, balance, ?, ?
             FROM vietpatch_users WHERE id = ?`
        ).bind(
            randomId("tx"),
            sourceKey,
            `Nhận miễn phí: ${offer.title}`.slice(0, 220),
            gameId,
            createdAt,
            createdAt,
            account.id
        )
    ]);
    return getAccountById(env, account.id);
}

export async function purchaseOfferWithWallet(env, account, offer) {
    await ensureSchema(env);
    const gameId = sanitizeGameId(offer?.id);
    const amount = Math.max(0, Math.round(Number(offer?.price) || 0));
    if (!gameId || amount <= 0) throw httpError(409, "USE_FREE_UNLOCK");
    if (await hasEntitlement(env, account.id, gameId)) return getAccountById(env, account.id);

    const createdAt = nowIso();
    const sourceKey = `wallet:${account.id}:${gameId}`;
    const results = await env.DB.batch([
        env.DB.prepare(
            `INSERT OR IGNORE INTO vietpatch_wallet_claims
                (user_id, game_id, amount, title, created_at, applied_at)
             SELECT ?, ?, ?, ?, ?, NULL
             WHERE EXISTS (
                SELECT 1 FROM vietpatch_users
                WHERE id = ? AND balance >= ?
             )
             AND NOT EXISTS (
                SELECT 1 FROM vietpatch_entitlements
                WHERE user_id = ? AND game_id = ?
             )`
        ).bind(
            account.id,
            gameId,
            amount,
            `Patch Việt hóa: ${offer.title}`.slice(0, 220),
            createdAt,
            account.id,
            amount,
            account.id,
            gameId
        ),
        env.DB.prepare(
            `UPDATE vietpatch_users
             SET balance = balance - ?, updated_at = ?
             WHERE id = ?
               AND EXISTS (
                    SELECT 1 FROM vietpatch_wallet_claims
                    WHERE user_id = ? AND game_id = ? AND applied_at IS NULL
               )`
        ).bind(amount, createdAt, account.id, account.id, gameId),
        env.DB.prepare(
            `INSERT OR IGNORE INTO vietpatch_entitlements
                (user_id, game_id, source, created_at)
             SELECT user_id, game_id, 'wallet', ?
             FROM vietpatch_wallet_claims
             WHERE user_id = ? AND game_id = ? AND applied_at IS NULL`
        ).bind(createdAt, account.id, gameId),
        env.DB.prepare(
            `INSERT OR IGNORE INTO vietpatch_transactions
                (id, user_id, source_key, type, title, amount, method, status,
                 game_id, balance_after, applied_at, created_at)
             SELECT ?, claim.user_id, ?, 'purchase', claim.title, -claim.amount,
                    'wallet', 'success', claim.game_id, users.balance, ?, ?
             FROM vietpatch_wallet_claims AS claim
             JOIN vietpatch_users AS users ON users.id = claim.user_id
             WHERE claim.user_id = ? AND claim.game_id = ? AND claim.applied_at IS NULL`
        ).bind(
            randomId("tx"),
            sourceKey,
            createdAt,
            createdAt,
            account.id,
            gameId
        ),
        env.DB.prepare(
            `UPDATE vietpatch_wallet_claims
             SET applied_at = ?
             WHERE user_id = ? AND game_id = ? AND applied_at IS NULL`
        ).bind(createdAt, account.id, gameId)
    ]);

    if (!resultChanges(results[0])) {
        if (await hasEntitlement(env, account.id, gameId)) return getAccountById(env, account.id);
        throw httpError(402, "INSUFFICIENT_BALANCE");
    }
    return getAccountById(env, account.id);
}

function paymentConfig(env) {
    const bankId = String(env.BANK_ID || "").trim().toUpperCase();
    const accountNo = String(env.ACCOUNT_NO || "").replace(/\s+/g, "");
    const accountName = String(env.ACCOUNT_NAME || "").replace(/\s+/g, " ").trim();
    if (
        !/^[A-Z0-9]{2,20}$/.test(bankId)
        || !/^[0-9]{6,25}$/.test(accountNo)
        || accountName.length < 2
    ) throw httpError(503, "PAYMENT_NOT_CONFIGURED");
    return { bankId, accountNo, accountName: accountName.slice(0, 120) };
}

function sanitizeDepositAmount(value) {
    const amount = Math.round(Number(value) || 0);
    if (amount < MIN_DEPOSIT) throw httpError(400, "AMOUNT_MUST_BE_AT_LEAST_10000");
    if (amount > MAX_DEPOSIT) throw httpError(400, "AMOUNT_TOO_LARGE");
    return amount;
}

export async function createPaymentOrder(env, account, input) {
    await ensureSchema(env);
    paymentConfig(env);
    const itemType = String(input?.itemType || "").trim().toLowerCase();
    let amount;
    let gameId = null;
    let itemTitle;

    if (itemType === "deposit") {
        amount = sanitizeDepositAmount(input?.amount);
        itemTitle = "Donate VietPatch";
    } else if (itemType === "purchase") {
        gameId = sanitizeGameId(input?.gameId);
        if (!gameId) throw httpError(400, "INVALID_GAME");
        const offer = await resolvePublishedOffer(env, gameId);
        if (!offer?.available) throw httpError(409, "PATCH_UNAVAILABLE");
        if (offer.price <= 0) throw httpError(409, "USE_FREE_UNLOCK");
        if (await hasEntitlement(env, account.id, gameId)) throw httpError(409, "ALREADY_OWNED");
        amount = offer.price;
        itemTitle = `Patch Việt hóa: ${offer.title}`;
    } else {
        throw httpError(400, "INVALID_ORDER_TYPE");
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
        const memo = `VP${randomHex(5)}`;
        const orderId = memo;
        const createdAt = nowIso();
        const expiresAt = new Date(Date.now() + ORDER_TTL_MS).toISOString();
        try {
            await env.DB.prepare(
                `INSERT INTO vietpatch_orders
                    (id, user_id, amount, memo, status, item_type, game_id, item_title,
                     provider, created_at, expires_at)
                 VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, 'vietqr', ?, ?)`
            ).bind(
                orderId,
                account.id,
                amount,
                memo,
                itemType,
                gameId,
                itemTitle.slice(0, 220),
                createdAt,
                expiresAt
            ).run();
            return publicOrder(orderFromRow(await env.DB.prepare(
                "SELECT * FROM vietpatch_orders WHERE id = ?"
            ).bind(orderId).first()));
        } catch (error) {
            if (!isUniqueError(error) || attempt === 3) throw error;
        }
    }
    throw httpError(500, "ORDER_CREATION_FAILED");
}

export async function getOrderById(env, orderId) {
    await ensureSchema(env);
    return orderFromRow(await env.DB.prepare(
        "SELECT * FROM vietpatch_orders WHERE id = ?"
    ).bind(String(orderId || "").toUpperCase()).first());
}

export async function getOwnedOrder(env, account, orderId) {
    const order = await getOrderById(env, orderId);
    if (!order || order.userId !== account.id) throw httpError(404, "ORDER_NOT_FOUND");
    if (order.status === "paid" && !order.appliedAt) {
        await applyPaidOrder(env, order);
        return getOrderById(env, order.orderId);
    }
    return order;
}

export function publicOrder(order) {
    return {
        orderId: order.orderId,
        createdAt: order.createdAt,
        expiresAt: order.expiresAt,
        paidAt: order.paidAt,
        amount: order.amount,
        memo: order.memo,
        status: order.status,
        gameId: order.gameId,
        itemTitle: order.itemTitle,
        itemType: order.itemType,
        qrUrl: `/api/vietpatch/orders/${encodeURIComponent(order.orderId)}/qr`
    };
}

export function orderQrUrl(env, order) {
    const config = paymentConfig(env);
    const url = new URL(`https://img.vietqr.io/image/${config.bankId}-${config.accountNo}-compact2.png`);
    url.searchParams.set("amount", String(order.amount));
    url.searchParams.set("addInfo", order.memo);
    url.searchParams.set("accountName", config.accountName);
    return url.href;
}

async function applyPaidOrder(env, orderValue) {
    const order = typeof orderValue === "string" ? await getOrderById(env, orderValue) : orderValue;
    if (!order || order.status !== "paid") return null;
    if (order.appliedAt) return getAccountById(env, order.userId);

    const appliedAt = nowIso();
    const sourceKey = `order:${order.orderId}`;
    const transactionId = randomId("tx");
    if (order.itemType === "deposit") {
        await env.DB.batch([
            env.DB.prepare(
                `INSERT OR IGNORE INTO vietpatch_transactions
                    (id, user_id, source_key, type, title, amount, method, status,
                     game_id, balance_after, applied_at, created_at)
                 VALUES (?, ?, ?, 'deposit', ?, ?, 'vietqr', 'success',
                         NULL, 0, NULL, ?)`
            ).bind(
                transactionId,
                order.userId,
                sourceKey,
                order.itemTitle,
                order.amount,
                order.paidAt || appliedAt
            ),
            env.DB.prepare(
                `UPDATE vietpatch_users
                 SET balance = balance + ?, updated_at = ?
                 WHERE id = ?
                   AND EXISTS (
                        SELECT 1 FROM vietpatch_transactions
                        WHERE source_key = ? AND applied_at IS NULL
                   )`
            ).bind(order.amount, appliedAt, order.userId, sourceKey),
            env.DB.prepare(
                `UPDATE vietpatch_transactions
                 SET balance_after = (
                        SELECT balance FROM vietpatch_users WHERE id = ?
                     ),
                     applied_at = ?
                 WHERE source_key = ? AND applied_at IS NULL`
            ).bind(order.userId, appliedAt, sourceKey),
            env.DB.prepare(
                `UPDATE vietpatch_orders
                 SET applied_at = ?
                 WHERE id = ? AND applied_at IS NULL
                   AND EXISTS (
                        SELECT 1 FROM vietpatch_transactions
                        WHERE source_key = ? AND applied_at IS NOT NULL
                   )`
            ).bind(appliedAt, order.orderId, sourceKey)
        ]);
    } else {
        await env.DB.batch([
            env.DB.prepare(
                `INSERT OR IGNORE INTO vietpatch_transactions
                    (id, user_id, source_key, type, title, amount, method, status,
                     game_id, balance_after, applied_at, created_at)
                 VALUES (?, ?, ?, 'purchase', ?, ?, 'vietqr', 'success',
                         ?, 0, NULL, ?)`
            ).bind(
                transactionId,
                order.userId,
                sourceKey,
                order.itemTitle,
                -order.amount,
                order.gameId,
                order.paidAt || appliedAt
            ),
            env.DB.prepare(
                `INSERT OR IGNORE INTO vietpatch_entitlements
                    (user_id, game_id, source, created_at)
                 SELECT ?, ?, 'vietqr', ?
                 WHERE EXISTS (
                    SELECT 1 FROM vietpatch_transactions
                    WHERE source_key = ? AND applied_at IS NULL
                 )`
            ).bind(order.userId, order.gameId, appliedAt, sourceKey),
            env.DB.prepare(
                `UPDATE vietpatch_transactions
                 SET balance_after = (
                        SELECT balance FROM vietpatch_users WHERE id = ?
                     ),
                     applied_at = ?
                 WHERE source_key = ? AND applied_at IS NULL`
            ).bind(order.userId, appliedAt, sourceKey),
            env.DB.prepare(
                `UPDATE vietpatch_orders
                 SET applied_at = ?
                 WHERE id = ? AND applied_at IS NULL
                   AND EXISTS (
                        SELECT 1 FROM vietpatch_transactions
                        WHERE source_key = ? AND applied_at IS NOT NULL
                   )`
            ).bind(appliedAt, order.orderId, sourceKey)
        ]);
    }
    return getAccountById(env, order.userId);
}

function normalizeMemo(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function flattenObject(value, output = {}) {
    if (!value || typeof value !== "object") return output;
    for (const [key, child] of Object.entries(value)) {
        if (child && typeof child === "object" && !Array.isArray(child)) {
            flattenObject(child, output);
        } else if (!(key in output)) {
            output[key] = child;
        }
    }
    return output;
}

function firstValue(source, keys) {
    for (const key of keys) {
        if (source[key] !== undefined && source[key] !== null && source[key] !== "") return source[key];
    }
    return "";
}

export function extractPaymentEvent(body) {
    const source = flattenObject(body);
    const transferType = String(firstValue(source, ["transferType", "transfer_type", "type"]) || "").toLowerCase();
    return {
        incoming: !transferType || ["in", "credit", "deposit", "incoming"].includes(transferType),
        memo: String(firstValue(source, [
            "code",
            "memo",
            "content",
            "transactionContent",
            "transaction_content",
            "transferContent",
            "transfer_content",
            "description"
        ]) || ""),
        content: String(firstValue(source, [
            "content",
            "transactionContent",
            "transaction_content",
            "transferContent",
            "transfer_content",
            "description"
        ]) || ""),
        amount: Math.round(Number(firstValue(source, [
            "transferAmount",
            "transfer_amount",
            "amount",
            "creditAmount",
            "credit_amount",
            "amount_in"
        ])) || 0),
        transactionId: String(firstValue(source, [
            "id",
            "transactionId",
            "transaction_id",
            "referenceCode",
            "reference_code",
            "bankTransactionId",
            "bank_transaction_id"
        ]) || ""),
        accountNumber: String(firstValue(source, ["accountNumber", "account_number"]) || "")
    };
}

function constantTimeEqual(received, expected) {
    const left = new TextEncoder().encode(String(received || ""));
    const right = new TextEncoder().encode(String(expected || ""));
    if (left.byteLength !== right.byteLength) return false;
    let difference = 0;
    for (let index = 0; index < left.byteLength; index += 1) difference |= left[index] ^ right[index];
    return difference === 0;
}

export function hasPaymentWebhookAccess(request, env) {
    const expected = [
        env.PAYMENT_WEBHOOK_API_KEY,
        env.SEPAY_SECRET_KEY
    ].map(value => String(value || "").trim()).filter(value => value.length >= 24);
    if (!expected.length) return false;

    const authorization = String(request.headers.get("authorization") || "").trim();
    const authorizationValue = authorization.replace(/^(?:bearer|token|apikey|api-key)\s+/i, "");
    const received = [
        request.headers.get("x-webhook-secret"),
        request.headers.get("x-secret-key"),
        request.headers.get("x-api-key"),
        request.headers.get("api-key"),
        authorization,
        authorizationValue
    ].map(value => String(value || "").trim()).filter(Boolean);
    return expected.some(secret => received.some(value => constantTimeEqual(value, secret)));
}

async function locateOrderForPayment(env, payment) {
    const transactionId = `sepay:${String(payment.transactionId)}`;
    const duplicate = orderFromRow(await env.DB.prepare(
        `SELECT * FROM vietpatch_orders
         WHERE provider_transaction_id = ?`
    ).bind(transactionId).first());
    if (duplicate) return { order: duplicate, transactionId };

    const memo = normalizeMemo(payment.memo);
    const content = normalizeMemo(`${payment.memo} ${payment.content}`);
    let order = memo ? orderFromRow(await env.DB.prepare(
        `SELECT * FROM vietpatch_orders
         WHERE memo = ? AND status = 'pending'`
    ).bind(memo).first()) : null;
    if (!order && content) {
        const candidates = await env.DB.prepare(
            `SELECT * FROM vietpatch_orders
             WHERE status = 'pending'
             ORDER BY created_at DESC LIMIT 100`
        ).all();
        order = (candidates.results || [])
            .map(orderFromRow)
            .find(candidate => content.includes(normalizeMemo(candidate.memo))) || null;
    }
    return { order, transactionId };
}

export async function confirmPaymentEvent(env, payment) {
    await ensureSchema(env);
    if (!payment?.incoming) return { matched: false, order: null };
    if (!payment.transactionId || payment.amount <= 0) throw httpError(422, "INVALID_PAYMENT_EVENT");

    const config = paymentConfig(env);
    const receivedAccount = String(payment.accountNumber || "").replace(/\s+/g, "");
    if (receivedAccount && !receivedAccount.includes("*") && receivedAccount !== config.accountNo) {
        return { matched: false, order: null };
    }

    const located = await locateOrderForPayment(env, payment);
    const order = located.order;
    if (!order || payment.amount < order.amount) return { matched: false, order: null };
    if (order.status === "paid") {
        await applyPaidOrder(env, order);
        return { matched: true, order: await getOrderById(env, order.orderId) };
    }
    if (order.status !== "pending") return { matched: false, order: null };

    const paidAt = nowIso();
    try {
        const result = await env.DB.prepare(
            `UPDATE vietpatch_orders
             SET status = 'paid', paid_at = ?, provider_transaction_id = ?
             WHERE id = ? AND status = 'pending'`
        ).bind(paidAt, located.transactionId, order.orderId).run();
        if (!resultChanges(result)) return { matched: false, order: null };
    } catch (error) {
        if (!isUniqueError(error)) throw error;
        const duplicate = await env.DB.prepare(
            `SELECT id FROM vietpatch_orders WHERE provider_transaction_id = ?`
        ).bind(located.transactionId).first();
        if (duplicate?.id !== order.orderId) return { matched: false, order: null };
    }

    const paidOrder = await getOrderById(env, order.orderId);
    await applyPaidOrder(env, paidOrder);
    return { matched: true, order: await getOrderById(env, order.orderId) };
}
