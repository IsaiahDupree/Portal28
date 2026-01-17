import { getOffersByPlacement } from "@/lib/offers/getOffers";
import OffersSidebarClient from "./OffersSidebarClient";

export default async function OffersSidebarWidget({
  placementKey,
  title,
  className,
}: {
  placementKey: string;
  title?: string;
  className?: string;
}) {
  const offers = await getOffersByPlacement(placementKey);

  if (offers.length === 0) {
    return null;
  }

  return (
    <OffersSidebarClient
      offers={offers}
      placementKey={placementKey}
      title={title}
      className={className}
    />
  );
}
