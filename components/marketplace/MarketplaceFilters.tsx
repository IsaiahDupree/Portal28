"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "learn", label: "Learning" },
  { value: "community", label: "Community" },
  { value: "tools", label: "Tools" },
];

const SORT_OPTIONS = [
  { value: "rating", label: "Top Rated" },
  { value: "installs", label: "Most Installed" },
  { value: "name", label: "Name" },
];

export function MarketplaceFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "rating";
  const search = searchParams.get("search") || "";

  function updateFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`/app/marketplace?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchValue = formData.get("search") as string;
    updateFilters({ search: searchValue });
  }

  function clearFilters() {
    router.push("/app/marketplace");
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <form onSubmit={handleSearchSubmit}>
        <Label htmlFor="search">Search</Label>
        <div className="flex gap-2 mt-2">
          <Input
            id="search"
            name="search"
            placeholder="Search apps..."
            defaultValue={search}
          />
          <Button type="submit" variant="secondary">
            Go
          </Button>
        </div>
      </form>

      {/* Category Filter */}
      <div>
        <Label className="mb-3 block">Category</Label>
        <RadioGroup
          value={category}
          onValueChange={(value) => updateFilters({ category: value })}
        >
          {CATEGORIES.map((cat) => (
            <div key={cat.value} className="flex items-center space-x-2">
              <RadioGroupItem value={cat.value} id={`cat-${cat.value}`} />
              <Label htmlFor={`cat-${cat.value}`} className="cursor-pointer">
                {cat.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Sort Filter */}
      <div>
        <Label className="mb-3 block">Sort By</Label>
        <RadioGroup
          value={sort}
          onValueChange={(value) => updateFilters({ sort: value })}
        >
          {SORT_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`sort-${option.value}`}
              />
              <Label
                htmlFor={`sort-${option.value}`}
                className="cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Clear Filters */}
      {(category || sort !== "rating" || search) && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          Clear Filters
        </Button>
      )}
    </div>
  );
}
