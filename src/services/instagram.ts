
/**
 * @fileoverview Service for interacting with the Instagram Graph API.
 */
import { fileTypeFromBuffer } from 'file-type';

const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

/**
 * Publishes a post to Instagram.
 * @param accessToken The user's Instagram access token.
 * @param businessAccountId The user's Instagram Business Account ID.
 * @param caption The caption for the post.
 * @param mediaDataUri The data URI of the image or video to post.
 * @param mediaType The type of media, 'image' or 'video'.
 * @returns The ID of the published post.
 */
export async function publishToInstagram(
  accessToken: string,
  businessAccountId: string,
  caption: string,
  mediaDataUri: string,
  mediaType: 'image' | 'video'
) {
  try {
    const containerId = await uploadMedia(
      accessToken,
      businessAccountId,
      caption,
      mediaDataUri,
      mediaType
    );

    await pollForContainerReady(accessToken, containerId);

    const creationId = await publishMediaContainer(
      accessToken,
      businessAccountId,
      containerId
    );
    return creationId;
  } catch (error) {
    console.error('Error publishing to Instagram:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(`Instagram publishing failed: ${errorMessage}`);
  }
}

/**
 * Uploads media to Instagram and returns a container ID.
 */
async function uploadMedia(
  accessToken: string,
  businessAccountId: string,
  caption: string,
  mediaDataUri: string,
  mediaType: 'image' | 'video'
): Promise<string> {
    const fetch = (await import('node-fetch')).default;

    const base64Data = mediaDataUri.split(',')[1];
    if (!base64Data) {
        throw new Error('Invalid data URI provided.');
    }
    const buffer = Buffer.from(base64Data, 'base64');
    const fileDetails = await fileTypeFromBuffer(buffer);

    let url: string;
    let params: URLSearchParams;

    if (mediaType === 'image') {
        url = `${BASE_URL}/${businessAccountId}/media`;
        params = new URLSearchParams({
            caption: caption,
            access_token: accessToken,
        });

        // For images, we can upload directly if it's not a URL
        const uploadResponse = await fetch(`${url}?${params.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': fileDetails?.mime || 'image/jpeg',
            },
            body: buffer,
        });
        const json = await uploadResponse.json() as any;

        if (!uploadResponse.ok || !json.id) {
            console.error('Instagram API Error (uploadImage):', json.error);
            throw new Error(json.error?.message || 'Failed to upload image.');
        }
        console.log(`Successfully created image container with ID: ${json.id}`);
        return json.id;

    } else { // mediaType === 'video'
        // Step 1: Create a media container
        url = `${BASE_URL}/${businessAccountId}/media`;
        params = new URLSearchParams({
            media_type: 'VIDEO',
            video_type: 'REELS', // Or 'FEED' if you want non-reels
            caption: caption,
            access_token: accessToken,
        });

        const createContainerResponse = await fetch(url, {
            method: 'POST',
            body: params,
        });
        const createContainerJson = await createContainerResponse.json() as any;
        if (!createContainerResponse.ok || !createContainerJson.id) {
            console.error('Instagram API Error (create video container):', createContainerJson.error);
            throw new Error(createContainerJson.error?.message || 'Failed to create video container.');
        }
        const containerId = createContainerJson.id;
        console.log(`Successfully created video container with ID: ${containerId}`);
        
        // Step 2: Upload the video file to the container
        const uploadUrl = `${BASE_URL}/${containerId}`;
        const uploadResponse = await fetch(
            uploadUrl,
            {
                method: 'POST',
                headers: {
                    'Authorization': `OAuth ${accessToken}`,
                    'Content-Type': fileDetails?.mime || 'application/octet-stream',
                    'Content-Length': buffer.length.toString(),
                },
                body: buffer,
            }
        );

        const uploadJson = await uploadResponse.json() as any;
        if (!uploadResponse.ok || !uploadJson.success) {
            console.error('Instagram API Error (upload video file):', uploadJson.error || uploadJson);
            throw new Error(uploadJson.error?.message || 'Failed to upload video file to Instagram.');
        }
        console.log(`Successfully uploaded video file to container ID: ${containerId}`);
        return containerId;
    }
}


/**
 * Polls the media container status until it is ready (FINISHED).
 */
async function pollForContainerReady(
  accessToken: string,
  containerId: string
): Promise<void> {
  const fetch = (await import('node-fetch')).default;
  const statusUrl = `${BASE_URL}/${containerId}?fields=status_code,status&access_token=${accessToken}`;

  for (let i = 0; i < 20; i++) { // Poll for up to 100 seconds
    const statusResponse = await fetch(statusUrl);
    const statusJson = (await statusResponse.json()) as any;

    if (!statusResponse.ok) {
      console.error('Instagram API Error (pollForContainerReady):', statusJson.error);
      throw new Error(statusJson.error?.message || 'Failed to get container status.');
    }

    const statusCode = statusJson.status_code;

    if (statusCode === 'FINISHED') {
      console.log('Media container is ready.');
      return;
    }

    if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
       throw new Error(`Media container processing failed with status: ${statusJson.status_code}. Status: ${statusJson.status}`);
    }

    console.log(`Container status: ${statusCode}. Polling again in 5 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Media container processing timed out.');
}

/**
 * Publishes a media container to the user's Instagram feed.
 */
async function publishMediaContainer(
  accessToken: string,
  businessAccountId: string,
  containerId: string
): Promise<string> {
  const fetch = (await import('node-fetch')).default;
  const url = `${BASE_URL}/${businessAccountId}/media_publish`;

  const form = new URLSearchParams();
  form.append('access_token', accessToken);
  form.append('creation_id', containerId);

  const response = await fetch(url, { method: 'POST', body: form });
  const json = (await response.json()) as any;

  if (!response.ok || !json.id) {
    console.error('Instagram API Error (publishMediaContainer):', json.error);
    throw new Error(
      json.error?.message || 'Failed to publish media container.'
    );
  }
  console.log(`Successfully published post with ID: ${json.id}`);
  return json.id;
}
