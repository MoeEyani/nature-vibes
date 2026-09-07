const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I

function randomChars(length: number): string {
  const bytes =
    typeof globalThis.crypto?.getRandomValues === "function"
      ? globalThis.crypto.getRandomValues(new Uint8Array(length))
      : Uint8Array.from({ length }, () => Math.floor(Math.random() * 256));

  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

/** Internal configuration id. */
export function createConfigurationId(): string {
  return `cfg_${randomChars(10).toLowerCase()}`;
}

/**
 * Customer-facing design reference, e.g. `NV-7KQ4-2M9X`.
 * Stable once assigned: it is what the customer quotes back to us.
 */
export function createDesignReference(): string {
  return `NV-${randomChars(4)}-${randomChars(4)}`;
}
