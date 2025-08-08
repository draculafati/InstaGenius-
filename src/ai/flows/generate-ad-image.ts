'use server';

/**
 * @fileOverview Image generation flow for generating Instagram ad images based on a user prompt.
 *
 * - generateAdImage - A function that triggers the image generation flow.
 * - GenerateAdImageInput - The input type for the generateAdImage function.
 * - GenerateAdImageOutput - The return type for the generateAdImage function, containing the image data URI.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAdImageInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate the ad image from.'),
});

export type GenerateAdImageInput = z.infer<typeof GenerateAdImageInputSchema>;

const GenerateAdImageOutputSchema = z.object({
  imageDataUri: z.string().describe('The generated image as a data URI.'),
});

export type GenerateAdImageOutput = z.infer<typeof GenerateAdImageOutputSchema>;

export async function generateAdImage(input: GenerateAdImageInput): Promise<GenerateAdImageOutput> {
  return generateAdImageFlow(input);
}

const generateAdImageFlow = ai.defineFlow(
  {
    name: 'generateAdImageFlow',
    inputSchema: GenerateAdImageInputSchema,
    outputSchema: GenerateAdImageOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: input.prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('No image was generated.');
    }

    return {imageDataUri: media.url};
  }
);
