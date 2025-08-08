import { Ad } from "@/lib/types";
import { AdCard } from "./ad-card";

const mockAds: Ad[] = [];


export function AdsHistoryList() {
  if (mockAds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center h-96">
        <h3 className="text-xl font-semibold">No Ads Generated Yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your generated ads will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {mockAds.map((ad) => (
        <AdCard key={ad.id} ad={ad} />
      ))}
    </div>
  );
}
