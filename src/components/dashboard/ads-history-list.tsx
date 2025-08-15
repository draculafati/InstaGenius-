"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ad } from "@/lib/types";
import { AdCard } from "./ad-card";
import { Skeleton } from "@/components/ui/skeleton";

export function AdsHistoryList() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "ads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const adsData: Ad[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        adsData.push({
          id: doc.id,
          prompt: data.prompt,
          caption: data.caption,
          hashtags: data.hashtags,
          imageUrl: data.imageUrl,
          // Convert Firestore Timestamp to ISO string
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        });
      });
      setAds(adsData);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching ads:", err);
      setError("Failed to fetch ad history. Please ensure your Firebase setup is correct.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <Skeleton className="h-[250px] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/10 p-12 text-center h-96">
        <h3 className="text-xl font-semibold text-destructive">An Error Occurred</h3>
        <p className="mt-2 text-sm text-destructive/80">
          {error}
        </p>
      </div>
    );
  }
  
  if (ads.length === 0) {
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
      {ads.map((ad) => (
        <AdCard key={ad.id} ad={ad} />
      ))}
    </div>
  );
}
