import { v4 as uuidv4 } from "uuid";

export function isOwnedUserPath(userId: string, path: string): boolean {
  const prefix = `${userId}/`;
  if (!path.startsWith(prefix) || path.includes("..") || path.includes("\\")) {
    return false;
  }
  const rest = path.slice(prefix.length);
  return /^(sources|outputs)\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(rest);
}

export function buildOutputPath(userId: string, contentType: string): string {
  const ext = contentType === "image/webp" ? "webp" : "png";
  return `${userId}/outputs/${uuidv4()}.${ext}`;
}
