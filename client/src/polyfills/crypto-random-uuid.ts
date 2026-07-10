function generateUUID(): `${string}-${string}-${string}-${string}-${string}` {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }) as `${string}-${string}-${string}-${string}-${string}`;
}

/**
 * Ensure crypto.randomUUID works on HTTP (non-secure context) deployments.
 * Must be imported before any library that calls crypto.randomUUID at load time.
 */
export function installCryptoRandomUUIDPolyfill() {
  const root = globalThis as typeof globalThis & { crypto?: Crypto };

  if (typeof root.crypto === "undefined") {
    root.crypto = {} as Crypto;
  }

  if (typeof root.crypto.randomUUID !== "function") {
    root.crypto.randomUUID = generateUUID;
  }
}

export function randomUUID() {
  return generateUUID();
}
