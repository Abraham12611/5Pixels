export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const branchUrl = process.env.VERCEL_BRANCH_URL?.trim();
  if (branchUrl) {
    return `https://${branchUrl}`.replace(/\/$/, "");
  }

  const deployUrl = process.env.VERCEL_URL?.trim();
  if (deployUrl) {
    return `https://${deployUrl}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
