"use server";

import { generateAdCaption } from "@/ai/flows/generate-ad-caption";
import { generateAdHashtags } from "@/ai/flows/generate-ad-hashtags";
import { generateAdImage } from "@/ai/flows/generate-ad-image";
import { generateAdVideo } from "@/ai/flows/generate-ad-video";

export async function generateAdContent(prompt: string, mediaType: 'image' | 'video') {
  try {
    console.log(`Generating ad content for prompt: "${prompt}" with media type: ${mediaType}`);

    const [captionData, hashtagsData] = await Promise.all([
      generateAdCaption({ prompt }),
      generateAdHashtags({ prompt }),
    ]);

    let imageDataUri: string | undefined;
    let videoDataUri: string | undefined;

    if (mediaType === 'image') {
      const imageData = await generateAdImage({ prompt });
      imageDataUri = imageData.imageDataUri;
    } else {
      const videoData = await generateAdVideo({ prompt });
      videoDataUri = videoData.videoDataUri;
    }

    console.log("Ad content generation successful.");
    return {
      caption: captionData.caption,
      hashtags: hashtagsData.hashtags,
      imageDataUri,
      videoDataUri,
    };
  } catch (error) {
    console.error("Failed to generate ad content:", error);
    return { error: "An error occurred during content generation. Please check the server logs." };
  }
}
