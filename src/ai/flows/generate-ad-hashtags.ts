// This is a server-side file.
'use server';

/**
 * @fileOverview Generates relevant hashtags for an ad based on the provided prompt.
 *
 * - generateAdHashtags - A function that generates hashtags for an ad.
 * - GenerateAdHashtagsInput - The input type for the generateAdHashtags function.
 * - GenerateAdHashtagsOutput - The return type for the generateAdHashtags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAdHashtagsInputSchema = z.object({
  prompt: z.string().describe('The ad prompt to generate hashtags for.'),
});
export type GenerateAdHashtagsInput = z.infer<typeof GenerateAdHashtagsInputSchema>;

const GenerateAdHashtagsOutputSchema = z.object({
  hashtags: z.array(z.string()).describe('An array of relevant hashtags for the ad.'),
});
export type GenerateAdHashtagsOutput = z.infer<typeof GenerateAdHashtagsOutputSchema>;

export async function generateAdHashtags(input: GenerateAdHashtagsInput): Promise<GenerateAdHashtagsOutput> {
  return generateAdHashtagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAdHashtagsPrompt',
  input: {schema: GenerateAdHashtagsInputSchema},
  output: {schema: GenerateAdHashtagsOutputSchema},
  prompt: `You are an expert in generating relevant hashtags for ads.

  Based on the following ad prompt, generate an array of relevant hashtags to maximize the ad's reach.

  Prompt: {{{prompt}}}

  Hashtags:`,
});

const generateAdHashtagsFlow = ai.defineFlow(
  {
    name: 'generateAdHashtagsFlow',
    inputSchema: GenerateAdHashtagsInputSchema,
    outputSchema: GenerateAdHashtagsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
