
import { PEXELS_API_KEY, PEXELS_API_URL } from '../constants';

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  page: number;
  per_page: number;
  total_results: number;
  next_page?: string;
}

export async function getRandomImage(): Promise<string | undefined> {
  if (!PEXELS_API_KEY) {
    console.warn("Pexels API key not found.");
    return undefined;
  }

  // Fetch a random page number first - Pexels doesn't have a direct "random" endpoint for curated.
  // We'll fetch a list of popular/curated photos and pick one. Max per_page is 80.
  const randomPage = Math.floor(Math.random() * 50) + 1; // Get from first 50 pages
  const url = `${PEXELS_API_URL}/curated?page=${randomPage}&per_page=10`; // Fetch 10 to pick one

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error("Pexels API error:", response.status, errorData);
      throw new Error(`Pexels API request failed: ${response.status} ${errorData.message || response.statusText}`);
    }

    const data = (await response.json()) as PexelsResponse;

    if (data.photos && data.photos.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.photos.length);
      // Use a reasonably sized image, 'large' is good.
      return data.photos[randomIndex].src.large;
    } else {
      console.warn("No photos returned from Pexels.");
      return undefined;
    }
  } catch (error) {
    console.error("Error fetching image from Pexels:", error);
    // Don't throw, allow quiz generation to proceed without image if Pexels fails
    return undefined;
  }
}
