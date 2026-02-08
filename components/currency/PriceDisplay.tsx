"use client";

import { useEffect, useState } from "react";
import { formatPrice, convertPrice, type CurrencyCode, type CurrencyRate } from "@/lib/currency/converter";

interface PriceDisplayProps {
  priceInCentsUSD: number;
  className?: string;
  showCurrency?: boolean;
}

export function PriceDisplay({
  priceInCentsUSD,
  className = "",
  showCurrency = true,
}: PriceDisplayProps) {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrencyData = async () => {
      try {
        // Load user's currency preference
        const prefResponse = await fetch('/api/currency/preference');
        const prefData = await prefResponse.json();
        setCurrency(prefData.currency || 'USD');

        // Load exchange rates
        const ratesResponse = await fetch('/api/currency/rates');
        const ratesData = await ratesResponse.json();
        setRates(ratesData.rates || []);
      } catch (error) {
        console.error('Error loading currency data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCurrencyData();
  }, []);

  if (loading) {
    return <span className={className}>Loading...</span>;
  }

  const convertedPrice = convertPrice(priceInCentsUSD, currency, rates);
  const formattedPrice = formatPrice(convertedPrice, currency);

  return (
    <span className={className}>
      {formattedPrice}
      {showCurrency && currency !== 'USD' && (
        <span className="text-xs text-muted-foreground ml-1">
          {currency}
        </span>
      )}
    </span>
  );
}

// Server-side version for static rendering
export function PriceDisplayServer({
  priceInCentsUSD,
  currency = 'USD',
  className = "",
}: {
  priceInCentsUSD: number;
  currency?: CurrencyCode;
  className?: string;
}) {
  const formattedPrice = formatPrice(priceInCentsUSD, currency);
  return <span className={className}>{formattedPrice}</span>;
}
