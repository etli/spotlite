import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "../theme-store";

describe("theme-store", () => {
  beforeEach(() => {
    useThemeStore.setState({
      primary: "hsl(260, 40%, 80%)", accent: "hsl(290, 40%, 80%)",
      glow: "hsla(260, 40%, 80%, 0.3)", bgTint: "hsla(260, 40%, 80%, 0.08)", currentAlbumId: null,
    });
  });

  it("starts with default lavender theme", () => {
    expect(useThemeStore.getState().primary).toContain("hsl");
  });

  it("setThemeFromColor updates all properties", () => {
    useThemeStore.getState().setThemeFromColor(200, 40, 80, "album123");
    const state = useThemeStore.getState();
    expect(state.primary).toBe("hsl(200, 40%, 80%)");
    expect(state.accent).toBe("hsl(230, 40%, 80%)");
    expect(state.glow).toBe("hsla(200, 40%, 80%, 0.3)");
    expect(state.bgTint).toBe("hsla(200, 40%, 80%, 0.08)");
    expect(state.currentAlbumId).toBe("album123");
  });

  it("skips update if album ID matches", () => {
    useThemeStore.getState().setThemeFromColor(200, 40, 80, "album123");
    const firstPrimary = useThemeStore.getState().primary;
    useThemeStore.getState().setThemeFromColor(300, 50, 70, "album123");
    expect(useThemeStore.getState().primary).toBe(firstPrimary);
  });
});
