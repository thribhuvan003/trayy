const MAX_MENU_IMAGE_URL_LENGTH = 2048;

/**
 * Accept only normal HTTPS image URLs at the server boundary. The browser
 * uploader writes Supabase Storage URLs, but hidden form fields are still
 * user-controlled and must not persist data:, javascript:, credentials, or
 * unbounded payloads.
 */
export function sanitizeMenuImageUrl(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate) return null;
  if (candidate.length > MAX_MENU_IMAGE_URL_LENGTH) return null;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}
