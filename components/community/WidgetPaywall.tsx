import Link from "next/link";
import OfferGrid from "@/components/offers/OfferGrid";
import { getOffersByPlacement } from "@/lib/offers/getOffers";

type Widget = {
  key: string;
  name: string;
  nav_label: string | null;
  saleswall_config: Record<string, any> | null;
};

export default async function WidgetPaywall({ widget }: { widget: Widget }) {
  const placementKey = widget.saleswall_config?.placementKey ?? `widget:${widget.key}`;
  const offers = await getOffersByPlacement(placementKey);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-2xl font-semibold">
          Unlock {widget.nav_label ?? widget.name}
        </h1>
        <p className="text-gray-600 mt-2">
          This content is available to members. Join to get access!
        </p>
      </div>

      {offers.length > 0 ? (
        <OfferGrid
          offers={offers}
          next={`/app/community/w/${widget.key}`}
          placementKey={placementKey}
        />
      ) : (
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            No offers configured for this widget.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 rounded-lg bg-black text-white hover:bg-gray-800"
          >
            View Membership Plans
          </Link>
        </div>
      )}
    </div>
  );
}
