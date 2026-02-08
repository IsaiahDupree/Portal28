"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SearchFiltersProps {
  filters: {
    type: string;
    category: string;
    priceMin?: number;
    priceMax?: number;
  };
  onFilterChange: (filters: any) => void;
}

export function SearchFilters({ filters, onFilterChange }: SearchFiltersProps) {
  const handleTypeChange = (value: string) => {
    onFilterChange({ ...filters, type: value });
  };

  const handleCategoryChange = (value: string) => {
    onFilterChange({ ...filters, category: value });
  };

  const handlePriceMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : undefined;
    onFilterChange({ ...filters, priceMin: value });
  };

  const handlePriceMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : undefined;
    onFilterChange({ ...filters, priceMax: value });
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <Label className="mb-2 block">Type</Label>
        <Select value={filters.type} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="courses">Courses</SelectItem>
            <SelectItem value="lessons">Lessons</SelectItem>
            <SelectItem value="forums">Forums</SelectItem>
            <SelectItem value="resources">Resources</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label className="mb-2 block">Category</Label>
        <Select value={filters.category} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="programming">Programming</SelectItem>
            <SelectItem value="design">Design</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="music">Music</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <Label className="mb-2 block">Min Price ($)</Label>
        <Input
          type="number"
          min="0"
          step="1"
          placeholder="0"
          value={filters.priceMin || ""}
          onChange={handlePriceMinChange}
        />
      </div>

      <div className="flex-1 min-w-[150px]">
        <Label className="mb-2 block">Max Price ($)</Label>
        <Input
          type="number"
          min="0"
          step="1"
          placeholder="Any"
          value={filters.priceMax || ""}
          onChange={handlePriceMaxChange}
        />
      </div>
    </div>
  );
}
