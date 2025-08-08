import { Ad } from "@/lib/types";
import { AdCard } from "./ad-card";

const mockAds: Ad[] = [
  {
    id: "1",
    prompt: "A vibrant ad for summer shoes.",
    caption: "Step into summer with our new collection! ☀️👟 Lightweight, breathable, and stylish. Get yours now!",
    hashtags: ["#SummerShoes", "#NewCollection", "#Footwear", "#ShoeStyle"],
    imageUrl: "https://placehold.co/600x600.png",
    createdAt: "2024-07-28",
  },
  {
    id: "2",
    prompt: "An ad for a new coffee blend.",
    caption: "Your perfect morning starts here. ☕️ Discover our new artisanal coffee blend, roasted to perfection.",
    hashtags: ["#CoffeeLover", "#ArtisanalCoffee", "#MorningRitual", "#SpecialtyCoffee"],
    imageUrl: "https://placehold.co/600x600.png",
    createdAt: "2024-07-27",
  },
  {
    id: "3",
    prompt: "A promotion for a local tech meetup.",
    caption: "Connect with fellow tech enthusiasts at our next meetup! 🚀 Network, learn, and innovate.",
    hashtags: ["#TechMeetup", "#Networking", "#TechCommunity", "#Innovation"],
    imageUrl: "https://placehold.co/600x600.png",
    createdAt: "2024-07-25",
  },
  {
    id: "4",
    prompt: "An ad for a fitness app.",
    caption: "Reach your fitness goals with our new app. 💪 Track your progress, get personalized workouts, and stay motivated!",
    hashtags: ["#FitnessApp", "#Workout", "#Health", "#FitnessMotivation"],
    imageUrl: "https://placehold.co/600x600.png",
    createdAt: "2024-07-24",
  },
];


export function AdsHistoryList() {
  if (mockAds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
        <h3 className="text-xl font-semibold">No Ads Generated Yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Go to the Ad Generator to create your first ad.
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
