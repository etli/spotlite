import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PanelShell } from "../PanelShell";
import { vi } from "vitest";

vi.mock("../../views/SearchResults", () => ({
  SearchResults: ({ query }: { query: string }) => <div>Results for {query}</div>,
}));

function renderPanelShell(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<PanelShell />}>
          <Route path="/" element={<div>Home content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("PanelShell", () => {
  it("renders the spotlite title", () => {
    renderPanelShell();
    expect(screen.getByText(/spotlite/i)).toBeInTheDocument();
  });

  it("renders a search input", () => {
    renderPanelShell();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows the outlet when the search query is empty", () => {
    renderPanelShell();
    expect(screen.getByText("Home content")).toBeInTheDocument();
  });

  it("shows SearchResults when the user types a query", () => {
    renderPanelShell();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "jazz" } });
    expect(screen.getByText("Results for jazz")).toBeInTheDocument();
    expect(screen.queryByText("Home content")).not.toBeInTheDocument();
  });

  it("restores the outlet when the search query is cleared", () => {
    renderPanelShell();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "jazz" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(screen.getByText("Home content")).toBeInTheDocument();
  });
});
