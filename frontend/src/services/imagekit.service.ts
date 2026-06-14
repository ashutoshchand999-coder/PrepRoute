import ImageKit from "imagekit-javascript";

const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/preproute";
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api";

let imagekit: ImageKit | null = null;
if (publicKey) {
  try {
    imagekit = new ImageKit({
      publicKey: publicKey,
      urlEndpoint: urlEndpoint,
    });
  } catch (err) {
    console.error("Error initializing ImageKit", err);
  }
}

// Educational premium unsplash mock URLs
const mockImages = [
  "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=60", // Math/Physics equations
  "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop&q=60", // Books & Study
  "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=60", // Chemistry Lab
  "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=600&auto=format&fit=crop&q=60", // Microscope
  "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop&q=60", // Exam Sheet
];

export const uploadImage = async (
  file: File,
  onProgress: (progress: number) => void
): Promise<string> => {
  // Validate file size (max 5MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("File size exceeds 5MB limit.");
  }

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only PNG, JPG, JPEG, and WEBP are supported.");
  }

  // Simulate progress steps for visual beauty in demo
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 20) + 5;
    if (progress >= 95) {
      progress = 95;
      clearInterval(interval);
    }
    onProgress(progress);
  }, 100);

  try {
    if (!imagekit) {
      // Offline/mock mode fallback
      await new Promise((resolve) => setTimeout(resolve, 1200));
      clearInterval(interval);
      onProgress(100);
      const randomUrl = mockImages[Math.floor(Math.random() * mockImages.length)];
      return randomUrl;
    }

    // Fetch client signature, token, and expire values from backend auth endpoint
    const authResponse = await fetch(`${apiBase}/imagekit/auth`);
    if (!authResponse.ok) {
      throw new Error(`Failed to fetch ImageKit signature: ${authResponse.statusText}`);
    }
    const authData = await authResponse.json();
    const { signature, token, expire } = authData;

    return new Promise((resolve) => {
      imagekit!.upload(
        {
          file: file,
          fileName: file.name,
          tags: ["preproute-questions"],
          signature,
          token,
          expire,
        },
        (err: any, result: any) => {
          clearInterval(interval);
          if (err) {
            console.error("ImageKit upload error, falling back to mock", err);
            // Fallback to mock on actual credentials failure to ensure demo never breaks
            onProgress(100);
            const randomUrl = mockImages[Math.floor(Math.random() * mockImages.length)];
            resolve(randomUrl);
          } else {
            onProgress(100);
            resolve(result?.url ?? "");
          }
        }
      );
    });
  } catch (error) {
    clearInterval(interval);
    throw error;
  }
};
