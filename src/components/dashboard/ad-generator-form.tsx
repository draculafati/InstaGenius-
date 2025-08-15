
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Sparkles, Image as ImageIcon, Video, FileText, Loader2, Check, Mic } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

// Extend window to include webkitSpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function AdGeneratorForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      prompt: "",
      mediaType: "image",
    },
  });

  const mediaType = form.watch("mediaType");

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        // The 'no-speech' error is triggered when the user doesn't say anything.
        // We can safely ignore it to avoid showing an unnecessary error message.
        if (event.error === 'no-speech') {
          setIsRecording(false);
          return;
        }

        console.error("Speech recognition error", event.error);
        setIsRecording(false);
        toast({
          title: "Speech Recognition Error",
          description: `An error occurred: ${event.error}. Please ensure you have given microphone permissions.`,
          variant: "destructive",
        });
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const currentPrompt = form.getValues("prompt");
        // Append with a space if the current prompt is not empty
        const newPrompt = currentPrompt ? `${currentPrompt} ${transcript}` : transcript;
        form.setValue("prompt", newPrompt, { shouldValidate: true });
      };

      recognitionRef.current = recognition;
    } 
    // We don't need a toast here because handleMicClick will show a toast if recognitionRef.current is null
    
    return () => {
      recognitionRef.current?.abort();
    };
  }, [form, toast]);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
        toast({
          title: "Unsupported Browser",
          description: "Speech recognition is not supported in your browser.",
          variant: "destructive",
        });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Error starting speech recognition:", err);
         toast({
          title: "Could not start recording",
          description: `Please ensure microphone permissions are granted and try again.`,
          variant: "destructive",
        });
      }
    }
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedContent(null);
    setError(null);

    const result = await generateAdContent(values.prompt, values.mediaType);

    if (result.error) {
      setError(result.error);
      toast({
        title: "Generation Failed",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setGeneratedContent(result);
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
        // In a real app, you would upload the image/video to a storage service (like Firebase Storage)
        // and save the URL. For this example, we'll save the data URI directly, which is not recommended for production.
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
                        className="resize-none bg-background/70 border-input/60 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50 pr-10"
                        rows={3}
                        {...field}
                      />
                       <button
                        type="button"
                        onClick={handleMicClick}
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors",
                          isRecording ? "bg-red-500/80 text-white" : "text-muted-foreground hover:bg-muted"
                        )}
                        aria-label={isRecording ? "Stop recording" : "Start recording"}
                      >
                        <Mic className="h-5 w-5" />
                      </button>
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
            {mediaType === 'image' && (
              <Card className="bg-card/50 backdrop-blur-sm md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ImageIcon /> Generated Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="aspect-video w-full bg-muted/50" />
                </CardContent>
              </Card>
            )}
            {mediaType === 'video' && (
              <Card className="bg-card/50 backdrop-blur-sm md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Video /> Generated Video</CardTitle>
                </CardHeader>
                <CardContent>
                   <Skeleton className="aspect-video w-full bg-muted/50" />
                   <p className="text-xs text-muted-foreground mt-2 text-center">Video generation may take up to a minute.</p>
                </CardContent>
              </Card>
            )}
            <Card className="md:col-span-2 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText /> Generated Caption & Hashtags</CardTitle>
              </CardHeader>
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
                            <CardTitle className="flex items-center gap-2 text-foreground"><ImageIcon /> Generated Image</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image src={generatedContent.imageDataUri} alt="Generated Ad Image" width={1920} height={1080} className="rounded-lg border" />
                        </CardContent>
                    </Card>
                )}
                 {generatedContent.videoDataUri && (
                    <Card className="bg-card/50 backdrop-blur-sm md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-foreground"><Video /> Generated Video</CardTitle>
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
            <div className="flex justify-end">
                <Button onClick={handleSaveAd} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
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
            </div>
        </div>
      )}
    </div>
  );
}
