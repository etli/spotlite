import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SearchBar } from "../SearchBar";

describe("SearchBar", () => {
  it("renders with the controlled value", () => {
    render(<SearchBar value="hello" onChange={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("hello");
  });

  it("calls onChange when the user types", () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "jazz" } });
    expect(onChange).toHaveBeenCalledWith("jazz");
  });

  it("shows the clear button when value is non-empty", () => {
    render(<SearchBar value="jazz" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /clear search/i })).toBeInTheDocument();
  });

  it("hides the clear button when value is empty", () => {
    render(<SearchBar value="" onChange={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onChange with empty string when the clear button is clicked", () => {
    const onChange = vi.fn();
    render(<SearchBar value="jazz" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
