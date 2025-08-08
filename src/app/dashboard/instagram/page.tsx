import { AdGeneratorForm } from "@/components/dashboard/ad-generator-form";
import { PenSquare } from "lucide-react";

export default function InstagramAdGeneratorPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
       <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <PenSquare className="w-8 h-8" />
          Instagram Ad Generator
        </h1>
        <p className="text-muted-foreground mt-1">
          Describe your ad, and let AI do the rest.
        </p>
      </div>
      <AdGeneratorForm />
    </div>
  );
}
