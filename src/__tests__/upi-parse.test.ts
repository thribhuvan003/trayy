import { describe, it, expect } from "vitest";
import { parseUpiCreditPaise } from "@/lib/payments/upi-parse";

describe("parseUpiCreditPaise", () => {
  it("parses PhonePe style", () => {
    expect(parseUpiCreditPaise("You have received ₹50.43 from John via UPI")).toBe(5043);
  });
  it("parses Google Pay style", () => {
    expect(parseUpiCreditPaise("₹120.00 received from Aman")).toBe(12000);
  });
  it("parses Paytm 'Rs' style", () => {
    expect(parseUpiCreditPaise("Received Rs 7.05 in your Paytm")).toBe(705);
  });
  it("parses 'INR' style", () => {
    expect(parseUpiCreditPaise("INR 250.50 credited")).toBe(25050);
  });
  it("parses amounts with thousands separators", () => {
    expect(parseUpiCreditPaise("You received ₹1,234.56")).toBe(123456);
  });
  it("treats a whole-rupee amount as .00", () => {
    expect(parseUpiCreditPaise("Received ₹50")).toBe(5000);
  });
  it("returns null when there is no amount", () => {
    expect(parseUpiCreditPaise("Payment request from John")).toBeNull();
  });
  it("ignores debit/sent notifications", () => {
    expect(parseUpiCreditPaise("₹50.43 sent to John")).toBeNull();
    expect(parseUpiCreditPaise("You paid ₹50.43 to John")).toBeNull();
    expect(parseUpiCreditPaise("₹50.43 debited from your account")).toBeNull();
  });
});
