import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useContainerSession } from "../lib/useContainerSession";

export function CatalogSearchBar() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { withContainerId } = useContainerSession();
  const [q, setQ] = useState(params.get("q") ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    nav(withContainerId(`/buyer/mixed-container/catalog/search?q=${encodeURIComponent(trimmed)}`));
  };

  return (
    <form onSubmit={submit} className="mb-6" data-testid="mc-catalog-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products or categories…"
          className="w-full h-11 pl-10 pr-4 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-900/20"
          data-testid="mc-search-input"
        />
      </div>
    </form>
  );
}
