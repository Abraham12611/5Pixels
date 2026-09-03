export const ADMIN_ASSET_ROLES = [
  "hero",
  "poster",
  "preview-video",
  "preview-gif",
  "style-reference",
  "composition-reference",
  "layout-reference",
] as const;

export type AdminAssetRole = (typeof ADMIN_ASSET_ROLES)[number];

export const PRESET_MEDIA_MAX_BYTES = 25 * 1024 * 1024;

const roleMimeTypes: Record<AdminAssetRole, readonly string[]> = {
  hero: ["image/jpeg", "image/png", "image/webp"],
  poster: ["image/jpeg", "image/png", "image/webp"],
  "preview-video": ["video/mp4", "video/webm"],
  "preview-gif": ["image/gif"],
  "style-reference": ["image/jpeg", "image/png", "image/webp"],
  "composition-reference": ["image/jpeg", "image/png", "image/webp"],
  "layout-reference": ["image/jpeg", "image/png", "image/webp"],
};

const mimeExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export interface AdminUploadFile {
  name: string;
  type: string;
  size: number;
}

export function validateAdminUpload(
  role: string,
  file: AdminUploadFile
): AdminAssetRole {
  if (!ADMIN_ASSET_ROLES.includes(role as AdminAssetRole)) {
    throw new Error("Unsupported asset role");
  }

  const validRole = role as AdminAssetRole;
  if (
    !Number.isSafeInteger(file.size) ||
    file.size <= 0 ||
    file.size > PRESET_MEDIA_MAX_BYTES
  ) {
    throw new Error("File must be between 1 byte and 25 MB");
  }
  if (!roleMimeTypes[validRole].includes(file.type)) {
    throw new Error(`Unsupported file type for ${validRole}`);
  }

  return validRole;
}

export function buildPresetMediaPath(
  userId: string,
  role: AdminAssetRole,
  randomId: string,
  mimeType: string
) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId
    )
  ) {
    throw new Error("Invalid user id");
  }
  if (!/^[0-9a-f-]{36}$/i.test(randomId)) {
    throw new Error("Invalid upload id");
  }
  const extension = mimeExtensions[mimeType];
  if (!extension || !roleMimeTypes[role].includes(mimeType)) {
    throw new Error("Unsupported MIME type");
  }

  return `admins/${userId}/${role}/${randomId}.${extension}`;
}

export function validateOwnedPresetMediaPath(
  userId: string,
  role: AdminAssetRole,
  path: string
) {
  const prefix = `admins/${userId}/${role}/`;
  if (!path.startsWith(prefix) || path.includes("..") || path.includes("\\")) {
    throw new Error("Invalid upload path");
  }
  const filename = path.slice(prefix.length);
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm)$/i.test(filename)) {
    throw new Error("Invalid upload path");
  }
  return path;
}

export function acceptedMimeTypes(role: AdminAssetRole) {
  return roleMimeTypes[role].join(",");
}
