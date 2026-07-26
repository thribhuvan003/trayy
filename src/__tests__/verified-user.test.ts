import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getVerifiedAuthUser } from "@/lib/auth/verified-user";

describe("getVerifiedAuthUser", () => {
  it("maps only identity returned by verified JWT claims", async () => {
    const client = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: {
            claims: {
              sub: "user-123",
              email: "student@example.com",
              user_metadata: { display_name: "Student" },
            },
          },
          error: null,
        }),
      },
    };

    await expect(getVerifiedAuthUser(client)).resolves.toEqual({
      id: "user-123",
      email: "student@example.com",
      user_metadata: { display_name: "Student" },
    });
  });

  it.each([
    { data: null, error: new Error("invalid token") },
    { data: { claims: {} }, error: null },
    { data: { claims: { sub: "" } }, error: null },
  ])("rejects an invalid or incomplete identity", async (result) => {
    const client = {
      auth: { getClaims: vi.fn().mockResolvedValue(result) },
    };

    await expect(getVerifiedAuthUser(client)).resolves.toBeNull();
  });
});
