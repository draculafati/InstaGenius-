
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  FileText,
  Loader2,
  Check,
  Send,
  Upload,
} from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { generateAdContent, publishAdToInstagram } from "./actions";
import { cn } from "@/lib/utils";
import type { GeneratedAdContent } from "@/lib/types";
import { Input } from "../ui/input";

const formSchema = z
  .object({
    prompt: z.string().min(10, { message: "Prompt must be at least 10 characters." }),
    mediaType: z.enum(["image", "video", "upload_image", "upload_video"]),
    mediaFile: z.any().optional(),
  })
  .refine(
    (data) => {
      if (
        (data.mediaType === "upload_image" || data.mediaType === "upload_video") &&
        (!data.mediaFile || data.mediaFile.length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Please select a file to upload.",
      path: ["mediaFile"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

export function AdGeneratorForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedAdContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      mediaType: "image",
      mediaFile: undefined,
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

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setGeneratedContent(null);
    setError(null);

    let mediaDataUri: string | undefined = undefined;
    const isUpload = values.mediaType.startsWith("upload_");
    const finalMediaType = values.mediaType.includes("video") ? "video" : "image";

    // Handle uploaded file
    if (isUpload && values.mediaFile && values.mediaFile.length > 0) {
      const file = values.mediaFile[0];
      try {
        mediaDataUri = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              resolve(event.target.result as string);
            } else {
              reject(new Error("Failed to read file."));
            }
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      } catch (e) {
        const err = e as Error;
        setError(err.message);
        toast({ title: "File Read Error", description: err.message, variant: "destructive" });
        setIsLoading(false);
        return;
      }
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

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save an ad.",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    try {
      const adToSave = {
        prompt: form.getValues("prompt"),
        caption: generatedContent.caption,
        hashtags: generatedContent.hashtags,
        imageUrl: generatedContent.imageDataUri || (generatedContent.videoDataUri ? "https://placehold.co/600x400.png?text=Video+Ad" : ""),
        createdAt: serverTimestamp(),
        userId: currentUser.uid,
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
        description: `Your ad has been posted to Instagram with ID: ${result.postId}`,
      });
      await handleSaveAd();
    }

    setIsPublishing(false);
  }

  const fileRef = form.register("mediaFile");

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold">
                  Ad Prompt
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., A vibrant ad for a new line of eco-friendly sneakers, showing them in nature."
                    className="min-h-[120px] text-base"
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
              <FormItem className="space-y-4">
                <FormLabel className="text-lg font-semibold">
                  Media Type
                </FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={field.value === "image" ? "default" : "outline"}
                      className="h-24 flex-col gap-2"
                      onClick={() => field.onChange("image")}
                    >
                      <ImageIcon className="h-8 w-8" />
                      <span>Generate Image</span>
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "video" ? "default" : "outline"}
                      className="h-24 flex-col gap-2"
                      onClick={() => field.onChange("video")}
                    >
                      <Video className="h-8 w-8" />
                      <span>Generate Video</span>
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "upload_image" ? "default" : "outline"}
                      className="h-24 flex-col gap-2"
                      onClick={() => field.onChange("upload_image")}
                    >
                      <Upload className="h-8 w-8" />
                      <span>Upload Image</span>
                    </Button>
                     <Button
                      type="button"
                      variant={field.value === "upload_video" ? "default" : "outline"}
                      className="h-24 flex-col gap-2"
                      onClick={() => field.onChange("upload_video")}
                    >
                      <Upload className="h-8 w-8" />
                      <span>Upload Video</span>
                    </Button>
                  </div>
                </FormControl>
                 <FormMessage />
              </FormItem>
            )}
          />

          {(mediaType === "upload_image" || mediaType === "upload_video") && (
            <FormField
              control={form.control}
              name="mediaFile"
              render={({ field }) => (
                 <FormItem>
                  <FormLabel className="text-lg font-semibold">Upload File</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept={mediaType === "upload_image" ? "image/*" : "video/*"}
                      {...fileRef}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {previewUrl && (
            <div className="flex justify-center">
              {mediaType.includes('image') ? (
                <Image
                  src={previewUrl}
                  alt="Uploaded preview"
                  width={200}
                  height={200}
                  className="rounded-lg object-cover"
                />
              ) : (
                <video src={previewUrl} controls className="w-full max-w-sm rounded-lg" />
              )}
            </div>
          )}


          <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Ad Content
          </Button>
        </form>
      </Form>

      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
          <p>{error}</p>
        </div>
      )}

      {generatedContent && (
        <div className="space-y-8 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-center">Generated Ad</h2>
          <div className="space-y-6">
            {(generatedContent.imageDataUri || generatedContent.videoDataUri) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {generatedContent.imageDataUri ? (
                      <ImageIcon />
                    ) : (
                      <Video />
                    )}
                    Generated Media
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {generatedContent.imageDataUri ? (
                    <Image
                      src={generatedContent.imageDataUri}
                      alt="Generated ad media"
                      width={500}
                      height={500}
                      className="mx-auto rounded-lg"
                    />
                  ) : (
                    <video src={generatedContent.videoDataUri} controls className="w-full rounded-lg" />
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText />
                  Generated Caption
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {generatedContent.caption}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles />
                  Generated Hashtags
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {generatedContent.hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
             <Button
              onClick={handleSaveAd}
              variant="outline"
              className="w-full"
              disabled={isSaving || isPublishing}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save Ad
            </Button>
            <Button
              onClick={handlePublish}
              className="w-full"
              disabled={isPublishing || isSaving}
            >
              {isPublishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Publish to Instagram
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
