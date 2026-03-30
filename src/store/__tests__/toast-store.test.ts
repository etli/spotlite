import { describe, it, expect, beforeEach } from "vitest";
import { useToastStore } from "../toast-store";

describe("toast-store", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("starts with no toasts", () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it("push adds a toast with the given message", () => {
    useToastStore.getState().push("Added to My Playlist");
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("Added to My Playlist");
    expect(typeof toasts[0].id).toBe("string");
  });

  it("push assigns unique IDs across multiple calls", () => {
    useToastStore.getState().push("First");
    useToastStore.getState().push("Second");
    const { toasts } = useToastStore.getState();
    expect(toasts[0].id).not.toBe(toasts[1].id);
  });

  it("dismiss removes only the toast with the given ID", () => {
    useToastStore.getState().push("First");
    useToastStore.getState().push("Second");
    const firstId = useToastStore.getState().toasts[0].id;
    useToastStore.getState().dismiss(firstId);
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("Second");
  });

  it("dismiss on unknown ID is a no-op", () => {
    useToastStore.getState().push("Hello");
    useToastStore.getState().dismiss("nonexistent-id");
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });
});
