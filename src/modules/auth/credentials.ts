import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

// scrypt cost parameters (N = 2^14, r = 8, p = 1: about 16 MB and some tens of ms per hash)
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

/** Hashes a password with scrypt and a random salt: `scrypt$N$r$p$<salt>$<hash>` (base64). */
export function hashPassword(password: string): string {
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P });
    return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

/** Checks a password against a hash from hashPassword, in constant time. False for a malformed hash. */
export function verifyPassword(password: string, stored: string): boolean {
    const parts = String(stored ?? "").split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const [n, r, p] = parts.slice(1, 4).map(Number);
    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p) || expected.length === 0) return false;
    const actual = scryptSync(password, salt, expected.length, { N: n, r, p, maxmem: 256 * n * r + 1024 * 1024 });
    return timingSafeEqual(actual, expected);
}

/** A new node key: 32 random bytes, base64url. */
export function generateKey(): string {
    return randomBytes(32).toString("base64url");
}

/** The stored form of a node key: SHA-256, hex (the key itself is random, so a fast hash is sufficient). */
export function hashKey(key: string): string {
    return createHash("sha256").update(key, "utf8").digest("hex");
}

/** A hash of a random password, verified against when the username is unknown so that the response time is the same. */
export const DUMMY_PASSWORD_HASH: string = hashPassword(randomBytes(16).toString("hex"));
