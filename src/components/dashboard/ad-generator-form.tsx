"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Sparkles, Image as ImageIcon, Video, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { generateAdContent } from "./actions";

const formSchema = z.object({
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters." }),
});

type GeneratedContent = {
  caption: string;
  hashtags: string[];
  imageDataUri: string;
  videoDataUri: string;
};

export function AdGeneratorForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedContent(null);
    setError(null);

    const result = await generateAdContent(values.prompt);

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
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Generate an ad for stylish, eco-friendly summer shoes."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && (
         <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ImageIcon /> Generated Image</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="aspect-video w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Video /> Generated Video</CardTitle>
              </CardHeader>
              <CardContent>
                 <Skeleton className="aspect-video w-full" />
                 <p className="text-xs text-muted-foreground mt-2 text-center">Video generation may take up to a minute.</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText /> Generated Caption & Hashtags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <div className="flex gap-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-28 rounded-full" />
                </div>
              </CardContent>
            </Card>
        </div>
      )}
      
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Generation Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">Please try again. If the problem persists, check your API credentials.</p>
          </CardContent>
        </Card>
      )}

      {generatedContent && (
        <div className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ImageIcon /> Generated Image</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Image src={generatedContent.imageDataUri} alt="Generated Ad Image" width={1920} height={1080} className="rounded-lg border" />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Video /> Generated Video</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <video src={generatedContent.videoDataUri} controls className="w-full rounded-lg border" />
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText /> Generated Caption & Hashtags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea value={generatedContent.caption} readOnly rows={5} className="bg-muted" />
                    <div className="flex flex-wrap gap-2">
                        {generatedContent.hashtags.map((tag) => (
                            <Badge key={tag} variant="default">{tag}</Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>
            <div className="flex justify-end">
                <Button onClick={handleSaveAd}>Save Ad</Button>
            </div>
        </div>
      )}
    </div>
  );
}
