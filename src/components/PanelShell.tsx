import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SearchBar } from "./SearchBar";
import { SearchResults } from "../views/SearchResults";

export function PanelShell() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleTitleClick = () => {
    setSearchQuery("");
    navigate("/");
  };

  return (
    <div className="glass-panel flex h-full w-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-2">
        <button
          onClick={handleTitleClick}
          className="text-[11px] tracking-widest text-[var(--color-text-primary)] transition-opacity hover:opacity-70"
        >
          ✦ spotlite
        </button>
      </div>
      <div className="shrink-0 px-4 pb-3">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {searchQuery ? <SearchResults query={searchQuery} onNavigate={() => setSearchQuery("")} /> : <Outlet />}
      </div>
    </div>
  );
}
