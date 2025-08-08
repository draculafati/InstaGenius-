"use server";

import { generateAdCaption } from "@/ai/flows/generate-ad-caption";
import { generateAdHashtags } from "@/ai/flows/generate-ad-hashtags";
import { generateAdImage } from "@/ai/flows/generate-ad-image";
import { generateAdVideo } from "@/ai/flows/generate-ad-video";

export async function generateAdContent(prompt: string) {
  try {
    console.log(`Generating ad content for prompt: ${prompt}`);

    // We run image and text generation first, as they are faster.
    const [captionData, hashtagsData, imageData] = await Promise.all([
      generateAdCaption({ prompt }),
      generateAdHashtags({ prompt }),
      generateAdImage({ prompt }),
    ]);

    // Video generation is a long-running operation.
    // We run it separately to allow other content to be generated first
    // In a production app, this would be a background job.
    const videoData = await generateAdVideo({ prompt });

    console.log("Ad content generation successful.");
    return {
      caption: captionData.caption,
      hashtags: hashtagsData.hashtags,
      imageDataUri: imageData.imageDataUri,
      videoDataUri: videoData.videoDataUri,
    };
  } catch (error) {
    console.error("Failed to generate ad content:", error);
    return { error: "An error occurred during content generation. Please check the server logs." };
  }
}
