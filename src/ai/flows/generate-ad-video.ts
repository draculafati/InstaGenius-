'use server';

/**
 * @fileOverview Flow to generate a short, engaging video based on an ad prompt.
 *
 * - generateAdVideo - Generates a video for an ad based on the prompt.
 * - GenerateAdVideoInput - The input type for the generateAdVideo function.
 * - GenerateAdVideoOutput - The return type for the generateAdVideo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MediaPart } from 'genkit/cohere';

const GenerateAdVideoInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate the ad video.'),
});
export type GenerateAdVideoInput = z.infer<typeof GenerateAdVideoInputSchema>;

const GenerateAdVideoOutputSchema = z.object({
  videoDataUri: z
    .string() // Consider a more specific validation if possible
    .describe(
      'The generated ad video as a data URI (video/mp4;base64,...).'
    ),
});
export type GenerateAdVideoOutput = z.infer<typeof GenerateAdVideoOutputSchema>;

export async function generateAdVideo(input: GenerateAdVideoInput): Promise<GenerateAdVideoOutput> {
  return generateAdVideoFlow(input);
}

const generateAdVideoFlow = ai.defineFlow(
  {
    name: 'generateAdVideoFlow',
    inputSchema: GenerateAdVideoInputSchema,
    outputSchema: GenerateAdVideoOutputSchema,
  },
  async input => {
    let { operation } = await ai.generate({
      model: 'googleai/veo-2.0-generate-001',
      prompt: input.prompt,
      config: {
        durationSeconds: 5,
        aspectRatio: '16:9',
        personGeneration: 'allow_adult',
      },
    });

    if (!operation) {
      throw new Error('Expected the model to return an operation');
    }

    // Wait until the operation completes. Note that this may take some time, maybe even up to a minute. Design the UI accordingly.
    while (!operation.done) {
      operation = await ai.checkOperation(operation);
      // Sleep for 5 seconds before checking again.
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (operation.error) {
      throw new Error('failed to generate video: ' + operation.error.message);
    }

    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video) {
      throw new Error('Failed to find the generated video');
    }

    const videoDataUri = await downloadVideo(video as MediaPart);

    return { videoDataUri };
  }
);

async function downloadVideo(video: MediaPart): Promise<string> {
  const fetch = (await import('node-fetch')).default;
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      'process.env.GEMINI_API_KEY is not defined. Cannot download video.'
    );
  }
  const videoDownloadResponse = await fetch(
    `${video.media!.url}&key=${process.env.GEMINI_API_KEY}`
  );
  if (
    !videoDownloadResponse ||
    videoDownloadResponse.status !== 200 ||
    !videoDownloadResponse.body
  ) {
    throw new Error('Failed to fetch video');
  }
  const buffer = await videoDownloadResponse.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  return `data:video/mp4;base64,${base64}`;
}
