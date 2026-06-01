export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: number;
  isFallback?: boolean;
}

export const imageService = {
  async generate(prompt: string): Promise<GeneratedImage> {
    console.log("NOVA: Requested image generation for:", prompt);
    
    // We now call our backend proxy to avoid CORS/XHR issues and keep the API key on the server
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate image over the neural link.");
    }

    return await response.json();
  }
};
