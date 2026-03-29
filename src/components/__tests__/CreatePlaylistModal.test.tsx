import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreatePlaylistModal } from "../CreatePlaylistModal";

vi.mock("../../lib/spotify-api", () => ({
  createSpotifyApi: () => ({
    post: vi.fn().mockResolvedValue({ id: "pl1", name: "My Playlist", uri: "spotify:playlist:pl1", description: null, images: [], owner: { id: "u1", display_name: "Me" }, items: undefined }),
  }),
}));

vi.mock("../../store/auth-store", () => ({
  useAuthStore: { getState: () => ({ accessToken: "token", logout: vi.fn() }) },
}));

describe("CreatePlaylistModal", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders a text input with empty value by default", () => {
    render(<CreatePlaylistModal onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("pre-fills the input when initialName is provided", () => {
    render(<CreatePlaylistModal initialName="Road Trip" onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("Road Trip");
  });

  it("shows 'Create' submit label by default", () => {
    render(<CreatePlaylistModal onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("shows custom submitLabel when provided", () => {
    render(<CreatePlaylistModal submitLabel="Save" onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("disables submit button when input is empty", () => {
    render(<CreatePlaylistModal onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("enables submit button when input has text", () => {
    render(<CreatePlaylistModal onCreated={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "My Playlist" } });
    expect(screen.getByRole("button", { name: "Create" })).not.toBeDisabled();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<CreatePlaylistModal onCreated={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
