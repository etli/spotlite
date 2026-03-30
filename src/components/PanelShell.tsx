import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { SearchBar } from "./SearchBar";
import { SearchResults } from "../views/SearchResults";
import { ToastContainer } from "./ToastContainer";

export function PanelShell() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleTitleClick = () => {
    setSearchQuery("");
    navigate("/");
  };

  const showBack = location.pathname !== "/";
  const goBack = () => {
    if (location.key === "default") navigate("/");
    else navigate(-1);
  };

  return (
    <div className="glass-panel flex h-full w-full flex-col overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-2">
        {showBack && (
          <button
            onClick={goBack}
            aria-label="Go back"
            className="flex items-center gap-1 text-[9px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            <span className="text-[14px]">←</span> Back
          </button>
        )}
        <button
          onClick={handleTitleClick}
          className="text-[11px] tracking-widest text-[var(--color-text-primary)] transition-opacity hover:opacity-70"
        >
          <span className="text-[15px]">✦</span> spotlite
        </button>
        <div className="ml-auto">
          <ToastContainer />
        </div>
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
