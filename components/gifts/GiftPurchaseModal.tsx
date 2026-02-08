"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gift, Loader2, CheckCircle, Copy, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GiftPurchaseModalProps {
  courseId: string;
  courseTitle: string;
  children?: React.ReactNode;
}

export function GiftPurchaseModal({ courseId, courseTitle, children }: GiftPurchaseModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [giftDetails, setGiftDetails] = useState<any>(null);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/gifts/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          recipientEmail,
          recipientName: recipientName || undefined,
          personalMessage: personalMessage || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to purchase gift");
        return;
      }

      setPurchased(true);
      setGiftDetails(data.gift);

      toast({
        title: "Gift purchased!",
        description: `Gift code sent to ${recipientEmail}`,
      });
    } catch (err) {
      setError("Failed to purchase gift");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (giftDetails?.code) {
      navigator.clipboard.writeText(giftDetails.code);
      toast({
        title: "Copied!",
        description: "Gift code copied to clipboard",
      });
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/gift/redeem?code=${giftDetails.code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Redemption link copied to clipboard",
    });
  };

  const resetForm = () => {
    setPurchased(false);
    setGiftDetails(null);
    setRecipientEmail("");
    setRecipientName("");
    setPersonalMessage("");
    setError("");
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form after closing animation
    setTimeout(resetForm, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Gift className="mr-2 h-4 w-4" />
            Give as Gift
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            {purchased ? "Gift Purchased!" : "Gift This Course"}
          </DialogTitle>
          <DialogDescription>
            {purchased
              ? "Share the gift code or redemption link with the recipient"
              : "Send this course as a gift to someone special"}
          </DialogDescription>
        </DialogHeader>

        {!purchased ? (
          <form onSubmit={handlePurchase} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="courseTitle">Course</Label>
              <Input
                id="courseTitle"
                value={courseTitle}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="recipientEmail">Recipient Email *</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="friend@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
              <Input
                id="recipientName"
                type="text"
                placeholder="John Doe"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="personalMessage">Personal Message (Optional)</Label>
              <Textarea
                id="personalMessage"
                placeholder="Happy birthday! Hope you enjoy this course..."
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !recipientEmail}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Purchase Gift"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Gift purchased successfully! The recipient will receive an email with the redemption code.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label>Gift Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={giftDetails.code}
                    readOnly
                    className="font-mono"
                  />
                  <Button size="icon" variant="outline" onClick={handleCopyCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Redemption Link</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/gift/redeem?code=${giftDetails.code}`}
                    readOnly
                    className="text-sm"
                  />
                  <Button size="icon" variant="outline" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-muted p-3 rounded text-sm">
              <p className="font-medium">Recipient: {giftDetails.recipientEmail}</p>
              {giftDetails.recipientName && (
                <p className="text-muted-foreground">{giftDetails.recipientName}</p>
              )}
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
