import { describe, it, expect } from "vitest";
import {
  recoveryRedirect,
  signupConfirmRedirect,
  AUTH_REDIRECT_ALLOWLIST,
} from "./emailRedirect";

describe("emailRedirect", () => {
  it("signup confirm lands on callback → setup", () => {
    expect(signupConfirmRedirect("https://lamakeka.vercel.app")).toBe(
      "https://lamakeka.vercel.app/auth/callback?next=%2Fsetup"
    );
  });

  it("recovery lands on callback → reset-password", () => {
    expect(recoveryRedirect("http://localhost:3000/")).toBe(
      "http://localhost:3000/auth/callback?next=%2Freset-password"
    );
  });

  it("allowlist includes prod and localhost", () => {
    expect(AUTH_REDIRECT_ALLOWLIST.some((u) => u.includes("lamakeka.vercel.app"))).toBe(
      true
    );
    expect(AUTH_REDIRECT_ALLOWLIST.some((u) => u.includes("localhost:3000"))).toBe(
      true
    );
  });
});
