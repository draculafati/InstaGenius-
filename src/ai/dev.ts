import { config } from 'dotenv';
config();

import '@/ai/flows/generate-ad-caption.ts';
import '@/ai/flows/generate-ad-video.ts';
import '@/ai/flows/generate-ad-image.ts';
import '@/ai/flows/generate-ad-hashtags.ts';