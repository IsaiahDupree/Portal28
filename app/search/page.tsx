"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchFilters } from "@/components/search/SearchFilters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: "all",
    category: "",
    priceMin: undefined,
    priceMax: undefined,
  });

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, []);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: q.trim(),
        type: filters.type,
        ...(filters.category && { category: filters.category }),
        ...(filters.priceMin && { priceMin: filters.priceMin.toString() }),
        ...(filters.priceMax && { priceMax: filters.priceMax.toString() }),
      });

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();

      setResults(data);
      setSearchQuery(q);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    if (searchQuery) {
      performSearch(searchQuery);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Search</h1>

          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search courses, lessons, and more..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
            </Button>
          </form>

          <SearchFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : results ? (
          <SearchResults results={results} query={searchQuery} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Enter a search query to find courses and lessons</p>
          </div>
        )}
      </div>
    </div>
  );
}
