import { createHash } from "crypto";

export function computeSha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function generateKeyString(prefix = "VOID", length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  // Group in chunks of 4: VOID-XXXX-XXXX-XXXX
  const chunks: string[] = [];
  for (let i = 0; i < result.length; i += 4) {
    chunks.push(result.substring(i, i + 4));
  }
  return `${prefix}-${chunks.join("-")}`;
}

export function generateSessionToken(prefix = "void_sess"): string {
  return `${prefix}_${Bun.randomUUIDv7()}`;
}
