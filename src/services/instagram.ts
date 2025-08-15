
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
    form.append('media_type', 'VIDEO');
    form.append('video_url', mediaDataUri);
    // When creating a video container from a URL, you must check for completion via webhooks or polling.
    // The current polling implementation will handle this.
  }

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: form,
  });

  const json = (await response.json()) as any;
  if (!response.ok || !json.id) {
    console.error('Instagram API Error:', json.error);
    throw new Error(
      json.error?.message || 'Failed to upload media to Instagram.'
    );
  }

  return json.id;
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

  // We need to poll for completion
  const creationId = await pollForCompletion(
    url,
    'POST',
    form,
    accessToken,
    businessAccountId,
    containerId
  );

  return creationId;
}

/**
 * Polls the Instagram Graph API until the media container is published.
 */
async function pollForCompletion(
  url: string,
  method: string,
  body: URLSearchParams,
  accessToken: string,
  businessAccountId: string,
  containerId: string
): Promise<string> {
  const fetch = (await import('node-fetch')).default;

  const initialResponse = await fetch(url, { method, body });
  const initialJson = (await initialResponse.json()) as any;

  if (!initialResponse.ok || !initialJson.id) {
    throw new Error(
      initialJson.error?.message || 'Failed to initiate media publishing.'
    );
  }

  const statusUrl = `${BASE_URL}/${containerId}?fields=status_code,status&access_token=${accessToken}`;

  for (let i = 0; i < 10; i++) {
    // Poll every 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    const statusResponse = await fetch(statusUrl);
    const statusJson = (await statusResponse.json()) as any;

    if (!statusResponse.ok) {
      throw new Error(
        statusJson.error?.message || 'Failed to get publishing status.'
      );
    }
    if (statusJson.status_code === 'FINISHED') {
      return initialJson.id;
    }
    if (
      statusJson.status_code === 'ERROR' ||
      statusJson.status_code === 'EXPIRED'
    ) {
      throw new Error(
        `Media publishing failed with status: ${statusJson.status}`
      );
    }
  }

  throw new Error('Publishing timed out.');
}
