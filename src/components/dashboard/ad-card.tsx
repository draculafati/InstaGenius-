import Image from "next/image";
import { Ad } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";

interface AdCardProps {
  ad: Ad;
}

export function AdCard({ ad }: AdCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="aspect-square relative">
          <Image
            src={ad.imageUrl}
            alt={ad.prompt}
            fill
            className="object-cover"
            data-ai-hint="advertisement social media"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">{ad.caption}</p>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4 p-4 pt-0">
         <div className="flex flex-wrap gap-2">
          {ad.hashtags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {format(parseISO(ad.createdAt), "MMMM d, yyyy")}
        </p>
      </CardFooter>
    </Card>
  );
}
