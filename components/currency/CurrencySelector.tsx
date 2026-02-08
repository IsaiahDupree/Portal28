"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency/converter";
import { useToast } from "@/hooks/use-toast";

export function CurrencySelector() {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load user's currency preference
    const loadPreference = async () => {
      try {
        const response = await fetch('/api/currency/preference');
        const data = await response.json();
        setCurrency(data.currency || 'USD');
      } catch (error) {
        console.error('Error loading currency preference:', error);
      }
    };

    loadPreference();
  }, []);

  const handleCurrencyChange = async (newCurrency: CurrencyCode) => {
    setLoading(true);
    setCurrency(newCurrency);

    try {
      const response = await fetch('/api/currency/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: newCurrency }),
      });

      if (!response.ok) {
        throw new Error('Failed to update currency preference');
      }

      // Reload page to update prices
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update currency preference",
        variant: "destructive",
      });
      console.error('Error updating currency:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Select
      value={currency}
      onValueChange={handleCurrencyChange}
      disabled={loading}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_CURRENCIES.map((curr) => (
          <SelectItem key={curr.code} value={curr.code}>
            {curr.symbol} {curr.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
