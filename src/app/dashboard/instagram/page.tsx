import { AdGeneratorForm } from "@/components/dashboard/ad-generator-form";
import { Bot } from "lucide-react";

export default function InstagramAdGeneratorPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 -z-10 h-full w-full bg-gradient-to-r from-primary to-accent"></div>
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold font-headline text-white sm:text-5xl">
              Create Your Ad
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Describe your ad idea and let our AI do the magic.
            </p>
          </div>
          <AdGeneratorForm />
        </div>
      </div>
    </div>
  );
}
