"use client";

import * as React from "react";
import { Search, Loader2, FileText, BookOpen, MessageSquare, Megaphone, FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  excerpt: string;
  url: string;
  rank: number;
  createdAt: string;
  typeLabel: string;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const debounceTimer = React.useRef<NodeJS.Timeout>();

  // Perform search with debouncing
  const performSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search input
  React.useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, performSearch]);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
    }
  }, [open]);

  // Handle result click
  const handleResultClick = (url: string) => {
    onOpenChange(false);
    window.location.href = url;
  };

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">Search Portal28</DialogTitle>
          <DialogDescription className="sr-only">
            Search courses, lessons, and community content
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative px-4">
          <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search courses, lessons, community..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4"
            autoFocus
          />
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[400px] px-4 pb-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Searching...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-8 text-destructive">
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mb-2 opacity-40" />
              <p>No results found for "{query}"</p>
            </div>
          )}

          {!isLoading && !error && !query && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mb-2 opacity-40" />
              <p className="text-sm">Start typing to search</p>
              <p className="text-xs mt-1">Try searching for courses, lessons, or community posts</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2 mt-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result.url)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-muted-foreground">
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{result.title}</h4>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {result.typeLabel}
                        </Badge>
                      </div>
                      {result.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {stripHtml(result.excerpt)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>Press <kbd className="px-1.5 py-0.5 text-xs border rounded">Esc</kbd> to close</span>
          <span><kbd className="px-1.5 py-0.5 text-xs border rounded">⌘K</kbd> to open</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to get icon based on content type
function getTypeIcon(type: string) {
  const iconMap: Record<string, React.ReactNode> = {
    course: <BookOpen className="h-4 w-4" />,
    lesson: <FileText className="h-4 w-4" />,
    forum_thread: <MessageSquare className="h-4 w-4" />,
    forum_post: <MessageSquare className="h-4 w-4" />,
    announcement: <Megaphone className="h-4 w-4" />,
    resource: <FolderOpen className="h-4 w-4" />,
  };
  return iconMap[type] || <FileText className="h-4 w-4" />;
}

// Helper function to strip HTML tags from text
function stripHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
