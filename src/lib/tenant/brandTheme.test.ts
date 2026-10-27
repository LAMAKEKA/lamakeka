import { describe, it, expect } from "vitest";
import {
  brandThemeCssVars,
  brandThemeToJson,
  isHexColor,
  parseBrandTheme,
  initialsFromName,
} from "./brandTheme";

describe("brandTheme", () => {
  it("isHexColor", () => {
    expect(isHexColor("#3A4A32")).toBe(true);
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("green")).toBe(false);
  });

  it("parseBrandTheme acepta aliases primary/accent", () => {
    expect(parseBrandTheme({ primary: "#1E3A5F", accent: "#C45C26" })).toEqual({
      campo: "#1E3A5F",
      cuero: "#C45C26",
    });
  });

  it("parseBrandTheme null si incompleto", () => {
    expect(parseBrandTheme({ campo: "#111111" })).toBeNull();
    expect(parseBrandTheme(null)).toBeNull();
  });

  it("brandThemeToJson + css vars", () => {
    const t = { campo: "#1e3a5f", cuero: "#c45c26" };
    expect(brandThemeToJson(t)).toEqual({ campo: "#1E3A5F", cuero: "#C45C26" });
    const css = brandThemeCssVars(t);
    expect(css["--color-campo"]).toBe("#1E3A5F");
    expect(css["--color-cuero"]).toBe("#C45C26");
  });

  it("initialsFromName", () => {
    expect(initialsFromName("Campo San José")).toBe("CS");
    expect(initialsFromName("Estancia")).toBe("ES");
  });
});
