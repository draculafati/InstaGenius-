
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Sparkles, Image as ImageIcon, Video, FileText, Loader2, Check, Send, Upload } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { generateAdContent, publishAdToInstagram } from "./actions";
import { cn } from "@/lib/utils";
import type { GeneratedAdContent } from "@/lib/types";
import { Input } from "../ui/input";

const formSchema = z.object({
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters." }),
  mediaType: z.enum(["image", "video", "upload_image", "upload_video"]),
  mediaFile: z.any().optional(),
}).refine(data => {
    if ((data.mediaType === 'upload_image' || data.mediaType === 'upload_video') && !data.mediaFile) {
        return false;
    }
    return true;
}, {
    message: "Please select a file to upload.",
    path: ["mediaFile"],
});


export function AdGeneratorForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedAdContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      mediaType: "image",
    },
  });

  const mediaType = form.watch("mediaType");
  const mediaFile = form.watch("mediaFile");

  useEffect(() => {
    if (mediaFile && mediaFile.length > 0) {
      const file = mediaFile[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
        setPreviewUrl(null);
    }
  }, [mediaFile]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedContent(null);
    setError(null);

    let mediaDataUri: string | undefined = undefined;
    let finalMediaType: 'image' | 'video' = 'image';

    // Handle uploaded file
    if ((values.mediaType === 'upload_image' || values.mediaType === 'upload_video') && values.mediaFile && values.mediaFile.length > 0) {
        const file = values.mediaFile[0];
        finalMediaType = values.mediaType === 'upload_image' ? 'image' : 'video';
        mediaDataUri = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                resolve(event.target?.result as string);
            };
            reader.onerror = (error) => {
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    }

    // Call server action to generate content
    const result = await generateAdContent(values.prompt, finalMediaType, mediaDataUri);


    if (result.error) {
      setError(result.error);
      toast({
        title: "Generation Failed",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setGeneratedContent(result as GeneratedAdContent);
    }
    setIsLoading(false);
  }

  async function handleSaveAd() {
    if (!generatedContent) return;
    setIsSaving(true);

    try {
      const adToSave = {
        prompt: form.getValues("prompt"),
        caption: generatedContent.caption,
        hashtags: generatedContent.hashtags,
        imageUrl: generatedContent.imageDataUri || generatedContent.videoDataUri || "",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "ads"), adToSave);

      toast({
        title: "Ad Saved!",
        description: "Your generated ad has been saved to your history.",
      });
    } catch (error) {
        console.error("Error saving ad:", error);
        toast({
          title: "Save Failed",
          description: "Could not save the ad. Please check the console for errors.",
          variant: "destructive",
        });
    } finally {
        setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (!generatedContent) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to publish an ad.",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);

    const result = await publishAdToInstagram(generatedContent, currentUser.uid);

    if (result.error) {
      toast({
        title: "Publishing Failed",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Published Successfully!",
        description: "Your ad has been posted to Instagram.",
      });
    }

    setIsPublishing(false);
  }
  
  const fileRef = form.register("mediaFile");

  return (
    <div className="space-y-8">
      <div className="bg-card/50 border border-border/20 rounded-xl p-6 md:p-8 backdrop-blur-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                   <FormLabel className="text-foreground">Ad Prompt</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        placeholder="e.g., 'A summer sale for our new skincare line, focused on hydration.'"
                        className="resize-none bg-background/70 border-input/60 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
                        rows={3}
                        {...field}
                      />
                    </div>
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
                  <FormLabel className="text-foreground">Media Type</FormLabel>
                   <FormControl>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => field.onChange("image")}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg p-3 transition-all duration-200",
                          field.value === 'image'
                            ? "bg-primary text-primary-foreground shadow-lg scale-105"
                            : "bg-muted/80 text-muted-foreground hover:bg-muted"
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
                            ? "bg-primary text-primary-foreground shadow-lg scale-105"
                            : "bg-muted/80 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Video className="h-5 w-5" />
                        <span>Generate Video Ad</span>
                      </button>
                       <button
                        type="button"
                        onClick={() => field.onChange("upload_image")}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg p-3 transition-all duration-200",
                          field.value === 'upload_image'
                            ? "bg-primary text-primary-foreground shadow-lg scale-105"
                            : "bg-muted/80 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Upload className="h-5 w-5" />
                        <span>Upload Image</span>
                      </button>
                       <button
                        type="button"
                        onClick={() => field.onChange("upload_video")}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg p-3 transition-all duration-200",
                          field.value === 'upload_video'
                            ? "bg-primary text-primary-foreground shadow-lg scale-105"
                            : "bg-muted/80 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Upload className="h-5 w-5" />
                        <span>Upload Video</span>
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(mediaType === 'upload_image' || mediaType === 'upload_video') && (
                <FormField
                    control={form.control}
                    name="mediaFile"
                    render={() => (
                        <FormItem>
                            <FormLabel>Upload File</FormLabel>
                            <FormControl>
                                <Input type="file" {...fileRef} accept={mediaType === 'upload_image' ? 'image/*' : 'video/*'} />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
            )}


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
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Ad Creative
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>

      {isLoading && (
         <div className="grid gap-8 md:grid-cols-2">
            {(mediaType === 'image' || mediaType === 'upload_image') && (
              <Card className="bg-card/50 backdrop-blur-sm md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ImageIcon /> {mediaType === 'image' ? 'Generated' : 'Uploaded'} Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="aspect-video w-full bg-muted/50" />
                </CardContent>
              </Card>
            )}
            {(mediaType === 'video' || mediaType === 'upload_video') && (
              <Card className="bg-card/50 backdrop-blur-sm md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Video /> {mediaType === 'video' ? 'Generated' : 'Uploaded'} Video</CardTitle>
                </CardHeader>
                <CardContent>
                   <Skeleton className="aspect-video w-full bg-muted/50" />
                   {mediaType === 'video' && <p className="text-xs text-muted-foreground mt-2 text-center">Video generation may take up to a minute.</p>}
                </CardContent>
              </Card>
            )}
            <Card className="md:col-span-2 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText /> Generated Caption & Hashtags</CardTitle>
              </Header>
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full bg-muted/50" />
                <div className="flex gap-2">
                    <Skeleton className="h-6 w-24 rounded-full bg-muted/50" />
                    <Skeleton className="h-6 w-20 rounded-full bg-muted/50" />
                    <Skeleton className="h-6 w-28 rounded-full bg-muted/50" />
                </div>
              </CardContent>
            </Card>
        </div>
      )}

      {error && !isLoading && (
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
                    <Card className="bg-card/50 backdrop-blur-sm md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-foreground"><ImageIcon /> {mediaType === 'image' ? 'Generated' : 'Uploaded'} Image</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={generatedContent.imageDataUri} alt="Ad Image" width={1920} height={1080} className="rounded-lg border" />
                        </CardContent>
                    </Card>
                )}
                 {generatedContent.videoDataUri && (
                    <Card className="bg-card/50 backdrop-blur-sm md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-foreground"><Video /> {mediaType === 'video' ? 'Generated' : 'Uploaded'} Video</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <video src={generatedContent.videoDataUri} controls className="w-full rounded-lg border" />
                        </CardContent>
                    </Card>
                 )}
                 <div className="md:col-span-2">
                    <Card className="bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-foreground"><FileText /> Generated Caption & Hashtags</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea value={generatedContent.caption} readOnly rows={5} className="bg-background/70 border-input/60" />
                            <div className="flex flex-wrap gap-2">
                                {generatedContent.hashtags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="bg-muted/80 text-muted-foreground hover:bg-muted">{tag}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                 </div>
            </div>
            <div className="flex justify-end gap-4">
                <Button onClick={handleSaveAd} disabled={isSaving || isPublishing} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Save Ad
                    </>
                  )}
                </Button>
                <Button onClick={handlePublish} disabled={isPublishing || isSaving} variant="secondary">
                  {isPublishing ? (
                     <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Publish to Instagram
                    </>
                  )}
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
