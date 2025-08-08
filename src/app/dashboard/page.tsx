import { AdsHistoryList } from "@/components/dashboard/ads-history-list";
import { History } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <History className="w-8 h-8" />
          Ads History
        </h1>
        <p className="text-muted-foreground mt-1">
          Review your previously generated ads.
        </p>
      </div>
      <AdsHistoryList />
    </div>
  );
}
