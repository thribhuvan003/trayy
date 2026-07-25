import { describe, expect, it } from "vitest";
import { sanitizeMenuImageUrl } from "@/lib/menu-image";

describe("sanitizeMenuImageUrl", () => {
  it("accepts a normal HTTPS storage URL", () => {
    expect(
      sanitizeMenuImageUrl(
        "https://project.supabase.co/storage/v1/object/public/menu-images/tenant/item.webp"
      )
    ).toBe(
      "https://project.supabase.co/storage/v1/object/public/menu-images/tenant/item.webp"
    );
  });

  it.each([
    "data:image/svg+xml;base64,PHN2Zz4=",
    "javascript:alert(1)",
    "http://insecure.example/image.png",
    "https://user:password@example.com/image.png",
    "not a URL",
  ])("rejects unsafe image value %s", (value) => {
    expect(sanitizeMenuImageUrl(value)).toBeNull();
  });

  it("rejects an unbounded URL", () => {
    expect(
      sanitizeMenuImageUrl(`https://example.com/${"a".repeat(2100)}`)
    ).toBeNull();
  });
});
