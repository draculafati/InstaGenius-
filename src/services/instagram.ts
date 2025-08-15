
/**
 * @fileoverview Service for interacting with the Instagram Graph API.
 */

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

  const form = new URLSearchParams();
  form.append('access_token', accessToken);
  form.append('caption', caption);

  let uploadUrl = `${BASE_URL}/${businessAccountId}/media`;

  if (mediaType === 'image') {
    form.append('image_url', mediaDataUri);
  } else {
    // For video, we initiate an async upload.
    form.append('media_type', 'VIDEO');
    form.append('video_url', mediaDataUri);
  }

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: form,
  });

  const json = (await response.json()) as any;
  if (!response.ok || !json.id) {
    console.error('Instagram API Error (uploadMedia):', json.error);
    throw new Error(
      json.error?.message || 'Failed to upload media to Instagram.'
    );
  }

  return json.id;
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

  return json.id;
}
