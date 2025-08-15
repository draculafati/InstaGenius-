
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

    // Convert data URI to buffer
    const base64Data = mediaDataUri.split(',')[1];
    if (!base64Data) {
        throw new Error('Invalid data URI provided.');
    }
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 1. Initiate Upload Session (for resumable uploads, required for videos)
    // For images, we can do a direct upload, but using resumable for both is simpler.
    const uploadSessionUrl = `${BASE_URL}/${businessAccountId}/media`;
    const fileDetails = await fileTypeFromBuffer(buffer);
    const fileSize = buffer.length;

    const sessionParams = new URLSearchParams({
        file_length: fileSize.toString(),
        media_type: mediaType === 'image' ? 'IMAGE' : 'VIDEO',
        access_token: accessToken,
    });
    
    const sessionResponse = await fetch(uploadSessionUrl, {
        method: 'POST',
        body: sessionParams,
    });

    const sessionJson = (await sessionResponse.json()) as any;
    if (!sessionResponse.ok || !sessionJson.id) {
        console.error('Instagram API Error (create upload session):', sessionJson.error);
        throw new Error(sessionJson.error?.message || 'Failed to create upload session.');
    }
    const uploadSessionId = sessionJson.id;
    console.log(`Successfully created upload session with ID: ${uploadSessionId}`);

    // 2. Upload the file content to the session ID
    const uploadResponse = await fetch(
        `${BASE_URL}/${uploadSessionId}`,
        {
            method: 'POST',
            headers: {
                Authorization: `OAuth ${accessToken}`,
                'Content-Type': fileDetails?.mime || (mediaType === 'image' ? 'image/jpeg' : 'video/mp4'),
                'Content-Length': fileSize.toString(),
                'X-Entity-Name': `upload.${fileDetails?.ext || 'bin'}`,
                'X-Entity-Length': fileSize.toString(),
                'offset': '0',
            },
            body: buffer,
        }
    );
    
    const uploadJson = await uploadResponse.json() as any;
    if (!uploadResponse.ok || !uploadJson.success) {
        console.error('Instagram API Error (upload media file):', uploadJson.error || uploadJson);
        throw new Error(uploadJson.error?.message || 'Failed to upload media file to Instagram.');
    }
    
    console.log(`Successfully uploaded media for session ID: ${uploadSessionId}`);

    // 3. Create the media container with the uploaded media
    const containerUrl = `${BASE_URL}/${businessAccountId}/media`;
    const containerParams = new URLSearchParams({
        media_type: mediaType === 'image' ? 'IMAGE' : 'VIDEO',
        caption: caption,
        access_token: accessToken,
        upload_id: uploadSessionId,
    });

    if (mediaType === 'video') {
       containerParams.set('media_type', 'VIDEO');
    }

    const containerResponse = await fetch(containerUrl, {
        method: 'POST',
        body: containerParams,
    });

    const containerJson = (await containerResponse.json()) as any;

     if (!containerResponse.ok || !containerJson.id) {
        console.error('Instagram API Error (createContainer):', containerJson.error);
        throw new Error(containerJson.error?.message || 'Failed to create media container from upload session.');
    }
    
    const containerId = containerJson.id;
    console.log(`Successfully created media container with ID: ${containerId}`);

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
