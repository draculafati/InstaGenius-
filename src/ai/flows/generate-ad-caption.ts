'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating Instagram ad captions.
 *
 * - generateAdCaption - A function that generates an ad caption based on a user prompt.
 * - GenerateAdCaptionInput - The input type for the generateAdCaption function.
 * - GenerateAdCaptionOutput - The return type for the generateAdCaption function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAdCaptionInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the ad for which a caption should be generated.'),
});
export type GenerateAdCaptionInput = z.infer<typeof GenerateAdCaptionInputSchema>;

const GenerateAdCaptionOutputSchema = z.object({
  caption: z.string().describe('The generated ad caption.'),
});
export type GenerateAdCaptionOutput = z.infer<typeof GenerateAdCaptionOutputSchema>;

export async function generateAdCaption(input: GenerateAdCaptionInput): Promise<GenerateAdCaptionOutput> {
  return generateAdCaptionFlow(input);
}

const generateAdCaptionPrompt = ai.definePrompt({
  name: 'generateAdCaptionPrompt',
  input: {schema: GenerateAdCaptionInputSchema},
  output: {schema: GenerateAdCaptionOutputSchema},
  prompt: `Generate a compelling Instagram ad caption for the following ad description: {{{prompt}}}. The caption should be engaging and encourage users to take action.`,
});

const generateAdCaptionFlow = ai.defineFlow(
  {
    name: 'generateAdCaptionFlow',
    inputSchema: GenerateAdCaptionInputSchema,
    outputSchema: GenerateAdCaptionOutputSchema,
  },
  async input => {
    const {output} = await generateAdCaptionPrompt(input);
    return output!;
  }
);
