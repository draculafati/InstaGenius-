
'use server';

/**
 * @fileOverview A Genkit flow for publishing a generated ad to Instagram.
 *
 * - publishInstagramPost - The main flow function.
 * - PublishInstagramPostInput - The input type for the flow.
 * - PublishInstagramPostOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { publishToInstagram } from '@/services/instagram';

const PublishInstagramPostInputSchema = z.object({
  userId: z.string().describe('The ID of the user publishing the post.'),
  caption: z.string().describe('The ad caption.'),
  hashtags: z.array(z.string()).describe('An array of hashtags.'),
  mediaDataUri: z.string().describe('The data URI of the image or video to post.'),
  mediaType: z.enum(['image', 'video']).describe("The type of media being posted."),
});
export type PublishInstagramPostInput = z.infer<
  typeof PublishInstagramPostInputSchema
>;

const PublishInstagramPostOutputSchema = z.object({
  postId: z.string().describe('The ID of the successfully published Instagram post.'),
});
export type PublishInstagramPostOutput = z.infer<
  typeof PublishInstagramPostOutputSchema
>;

export async function publishInstagramPost(
  input: PublishInstagramPostInput
): Promise<PublishInstagramPostOutput> {
  return publishInstagramPostFlow(input);
}

const publishInstagramPostFlow = ai.defineFlow(
  {
    name: 'publishInstagramPostFlow',
    inputSchema: PublishInstagramPostInputSchema,
    outputSchema: PublishInstagramPostOutputSchema,
  },
  async (input) => {
    // 1. Fetch user credentials from Firestore
    const userDocRef = doc(db, 'users', input.userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error('User not found.');
    }
    const userData = userDoc.data();
    const accessToken = userData.instagramAccessToken;
    const businessAccountId = userData.instagramBusinessAccountId;

    if (!accessToken || !businessAccountId) {
      throw new Error(
        'Instagram credentials are not configured. Please add them on the Credentials page.'
      );
    }

    // 2. Format caption with hashtags
    const fullCaption = `${input.caption}\n\n${input.hashtags.join(' ')}`;

    // 3. Call the Instagram service to publish the post
    const postId = await publishToInstagram(
      accessToken,
      businessAccountId,
      fullCaption,
      input.mediaDataUri,
      input.mediaType
    );

    return { postId };
  }
);
