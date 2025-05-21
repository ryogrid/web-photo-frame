import { Image, ImageSet } from './types.js';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

export async function fetchImageSets(): Promise<ImageSet[]> {
  try {
    const response = await fetch(`${API_URL}/image-sets`);
    if (!response.ok) {
      throw new Error(`Failed to fetch image sets: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching image sets:', error);
    throw error;
  }
}
