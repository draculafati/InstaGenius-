"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Sparkles, Image as ImageIcon, Video, FileText, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { generateAdContent } from "./actions";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters." }),
  mediaType: z.enum(["image", "video"]),
});

type GeneratedContent = {
  caption: string;
  hashtags: string[];
  imageDataUri?: string;
  videoDataUri?: string;
};

export function AdGeneratorForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      prompt: "",
      mediaType: "image",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedContent(null);
    setError(null);

    const result = await generateAdContent(values.prompt, values.mediaType);

    if (result.error) {
      setError(result.error);
    } else {
      setGeneratedContent(result);
    }
    setIsLoading(false);
  }

  function handleSaveAd() {
    // In a real app, this would save the ad to the database.
    toast({
      title: "Ad Saved!",
      description: "Your generated ad has been saved to your history.",
    });
  }

  return (
    <div className="space-y-8">
      <div className="bg-card border border-border rounded-xl p-6 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                   <FormLabel className="text-card-foreground">Ad Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'A summer sale for our new skincare line, focused on hydration.'"
                      className="resize-none bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="mediaType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-card-foreground">Media Type</FormLabel>
                   <FormControl>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => field.onChange("image")}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg p-3 transition-all duration-200",
                          field.value === 'image'
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        <ImageIcon className="h-5 w-5" />
                        <span>Generate Image Ad</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange("video")}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg p-3 transition-all duration-200",
                           field.value === 'video'
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        <Video className="h-5 w-5" />
                        <span>Generate Video Ad</span>
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              disabled={isLoading} 
              size="lg"
              className="w-full text-lg bg-primary text-primary-foreground hover:bg-primary/90 h-12"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Ad Creative
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>

      {isLoading && (
         <div className="grid gap-8 md:grid-cols-2">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ImageIcon /> Generated Image</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="aspect-video w-full bg-muted" />
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Video /> Generated Video</CardTitle>
              </CardHeader>
              <CardContent>
                 <Skeleton className="aspect-video w-full bg-muted" />
                 <p className="text-xs text-muted-foreground mt-2 text-center">Video generation may take up to a minute.</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText /> Generated Caption & Hashtags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full bg-muted" />
                <div className="flex gap-2">
                    <Skeleton className="h-6 w-24 rounded-full bg-muted" />
                    <Skeleton className="h-6 w-20 rounded-full bg-muted" />
                    <Skeleton className="h-6 w-28 rounded-full bg-muted" />
                </div>
              </CardContent>
            </Card>
        </div>
      )}
      
      {error && (
        <Card className="border-destructive bg-destructive/20 text-destructive-foreground">
          <CardHeader>
            <CardTitle>Generation Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <p className="mt-2 text-sm text-destructive-foreground/80">Please try again. If the problem persists, check your API credentials.</p>
          </CardContent>
        </Card>
      )}

      {generatedContent && (
        <div className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
                {generatedContent.imageDataUri && (
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ImageIcon /> Generated Image</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={generatedContent.imageDataUri} alt="Generated Ad Image" width={1920} height={1080} className="rounded-lg border" />
                        </CardContent>
                    </Card>
                )}
                 {generatedContent.videoDataUri && (
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Video /> Generated Video</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <video src={generatedContent.videoDataUri} controls className="w-full rounded-lg border" />
                        </CardContent>
                    </Card>
                 )}
            </div>
             <Card className="bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText /> Generated Caption & Hashtags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea value={generatedContent.caption} readOnly rows={5} className="bg-background border-input" />
                    <div className="flex flex-wrap gap-2">
                        {generatedContent.hashtags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80">{tag}</Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>
            <div className="flex justify-end">
                <Button onClick={handleSaveAd} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Check className="mr-2 h-4 w-4" />
                  Save Ad
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
