
/**
 * @fileoverview Service for interacting with the Instagram Graph API.
 */
import { FormData } from 'formdata-node';
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

    // After uploading, we need to poll until the container is ready.
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

    // 1. Create Media Container
    const containerUrl = `${BASE_URL}/${businessAccountId}/media`;
    const containerParams = new URLSearchParams({
        media_type: mediaType === 'image' ? 'IMAGE' : 'VIDEO',
        caption: caption,
        access_token: accessToken,
    });

    // For videos, we need to initiate a resumable upload session
    if (mediaType === 'video') {
        containerParams.set('upload_type', 'resumable');
    }

    const containerResponse = await fetch(containerUrl, {
        method: 'POST',
        body: containerParams,
    });
    const containerJson = (await containerResponse.json()) as any;
    if (!containerResponse.ok || !containerJson.id) {
        console.error('Instagram API Error (createContainer):', containerJson.error);
        throw new Error(containerJson.error?.message || 'Failed to create media container.');
    }
    const containerId = containerJson.id;
    console.log(`Successfully created media container with ID: ${containerId}`);

    // 2. Upload the actual media file
    const uploadUrl = `${BASE_URL}/${containerId}`;
    
    // Convert data URI to buffer
    const base64Data = mediaDataUri.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const fileDetails = await fileTypeFromBuffer(buffer);
    if (!fileDetails) {
        throw new Error('Could not determine file type from data URI.');
    }
    
    const formData = new FormData();
    formData.append('access_token', accessToken);
    
    // We need to use node-fetch's Blob equivalent for this to work
    const { Blob } = await import('buffer');
    const blob = new Blob([buffer]);
    
    // The API expects a file, so we create a blob and append it.
    // The filename is not critical but good practice to include.
    formData.append('source', blob, `upload.${fileDetails.ext}`);
    
    // Important: When using FormData with node-fetch, you should NOT set the Content-Type header manually.
    // It will be set automatically with the correct boundary.
    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
    });

    const uploadJson = (await uploadResponse.json()) as any;
    if (!uploadResponse.ok || !uploadJson.success) {
        console.error('Instagram API Error (uploadMedia):', uploadJson.error || uploadJson);
        throw new Error(uploadJson.error?.message || 'Failed to upload media file to Instagram.');
    }

    console.log(`Successfully uploaded media for container ID: ${containerId}`);
    return containerId;
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
      throw new Error(`Media container processing failed with status: ${statusJson.status}`);
    }

    console.log(`Container status: ${statusCode}. Polling again in 5 seconds...`);
    // Wait for 5 seconds before the next poll.
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
