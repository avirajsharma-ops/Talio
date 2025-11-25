/**
 * Lightweight helpers for decoding the payload of JWTs that are generated
 * with base64url encoding (the default for jose SignJWT).
 */

/**
 * Decode a JWT payload safely on the client. Returns null when the token is
 * missing or malformed instead of throwing, so callers can guard logic easily.
 */
export function decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') return null

    const parts = token.split('.')
    if (parts.length < 2) return null

    try {
        const base64Url = parts[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
        const json = typeof window !== 'undefined' && window.atob
            ? window.atob(padded)
            : Buffer.from(padded, 'base64').toString('binary')
        return JSON.parse(json)
    } catch (error) {
        console.error('[JWT] Failed to decode token payload:', error)
        return null
    }
}

/**
 * Convenience helper to extract the user identifier from a token. Falls back
 * to checking common fields in case the payload uses a different key.
 */
export function getUserIdFromToken(token) {
    const payload = decodeJwtPayload(token)
    if (!payload) return null
    return payload.userId || payload.sub || payload.id || payload._id || null
}
