export interface Ad {
  id: string;
  prompt: string;
  caption: string;
  hashtags: string[];
  imageUrl: string; // This can be a data URI for image or video
  createdAt: string; // Stored as an ISO string
}
