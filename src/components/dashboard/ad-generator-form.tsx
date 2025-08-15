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
        !data.mediaFile
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
    let finalMediaType: "image" | "video";

    switch (values.mediaType) {
      case "video":
      case "upload_video":
        finalMediaType = "video";
        break;
      case "image":
      case "upload_image":
      default:
        finalMediaType = "image";
        break;
    }

    // Handle uploaded file
    if (
      (values.mediaType === "upload_image" || values.mediaType === "upload_video") &&
      values.mediaFile &&
      values.mediaFile.length > 0
    ) {
      const file = values.mediaFile[0];
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
        imageUrl: generatedContent.videoDataUri
          ? "https://placehold.co/600x400.png?text=Video+Ad"
          : generatedContent.imageDataUri || "",
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
        description: "Your ad has been posted to Instagram.",
      });
      await handleSaveAd();
    }

    setIsPublishing(false);
  }

  const fileRef = form.register("mediaFile");

  return (
    <div className="space-y-8">
      {/* --- rest of your JSX stays exactly the same --- */}
    </div>
  );
}
