"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Copy, Trash2, Clock, Check } from "lucide-react";
import {
  generatePreviewToken,
  getCoursePreviewTokens,
  deletePreviewToken,
  type PreviewToken,
} from "@/lib/actions/preview-tokens";

interface PreviewTokenManagerProps {
  courseId: string;
}

export function PreviewTokenManager({ courseId }: PreviewTokenManagerProps) {
  const [tokens, setTokens] = useState<PreviewToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    loadTokens();
  }, [courseId]);

  const loadTokens = async () => {
    const data = await getCoursePreviewTokens(courseId);
    setTokens(data);
  };

  const handleGenerateToken = async () => {
    setLoading(true);
    const result = await generatePreviewToken(courseId, 7);

    if (result.success && result.url) {
      // Copy to clipboard
      await navigator.clipboard.writeText(result.url);
      setCopiedToken("new");
      setTimeout(() => setCopiedToken(null), 2000);

      // Reload tokens
      await loadTokens();
    } else {
      alert(result.error || "Failed to generate preview token");
    }
    setLoading(false);
  };

  const handleCopyToken = async (token: PreviewToken) => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:2828";
    const url = `${baseUrl}/preview/course/${courseId}?token=${token.token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token.id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm("Are you sure you want to delete this preview token?")) {
      return;
    }

    const result = await deletePreviewToken(tokenId);
    if (result.success) {
      await loadTokens();
    } else {
      alert(result.error || "Failed to delete token");
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview Links
            </CardTitle>
            <CardDescription>
              Share preview links to allow others to view this course
            </CardDescription>
          </div>
          <Button onClick={handleGenerateToken} disabled={loading} size="sm">
            {copiedToken === "new" ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              "Generate Link"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No preview links yet. Generate one to share this course.
          </p>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => {
              const expired = isExpired(token.expires_at);
              const expiresDate = new Date(token.expires_at);

              return (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono text-muted-foreground truncate">
                        {token.token.substring(0, 16)}...
                      </code>
                      {expired ? (
                        <Badge variant="destructive" className="text-xs">
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {expired ? "Expired" : "Expires"}{" "}
                      {expiresDate.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyToken(token)}
                      disabled={expired}
                    >
                      {copiedToken === token.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteToken(token.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
