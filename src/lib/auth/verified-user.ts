import "server-only";

export type VerifiedAuthUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, any>;
};

/**
 * Verify the cookie access token before using its identity with service-role
 * queries. getClaims() validates the JWT signature/expiry locally through the
 * project's cached JWKS when asymmetric signing is enabled.
 */
export async function getVerifiedAuthUser(
  client: { auth: { getClaims: () => Promise<any> } }
): Promise<VerifiedAuthUser | null> {
  const { data, error } = await client.auth.getClaims();
  const subject = data?.claims?.sub;
  if (error || typeof subject !== "string" || !subject) return null;

  return {
    id: subject,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    user_metadata:
      data.claims.user_metadata &&
      typeof data.claims.user_metadata === "object" &&
      !Array.isArray(data.claims.user_metadata)
        ? data.claims.user_metadata
        : {},
  };
}
