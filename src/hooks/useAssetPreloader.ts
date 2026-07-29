import { useEffect, useState } from "react";

type AssetType = "image" | "audio";

interface GameAsset {
  src: string;
  type: AssetType;
}

const GAME_ASSETS: readonly GameAsset[] = [
  { src: "/vinparye-logo.png", type: "image" },
  { src: "/vinparye-flight-mark.svg", type: "image" },
  { src: "/avionu-plane-ground.webp", type: "image" },
  { src: "/avionu-plane-flight.png", type: "image" },
  { src: "/avionu-haiti-plane.png", type: "image" },
  { src: "/avionu-avatar-sprite.png", type: "image" },
  { src: "/sounds/bg-music.mp3", type: "audio" },
  { src: "/sounds/fly-away.mp3", type: "audio" },
];

const MINIMUM_LOADING_TIME = 5000;

interface AssetLoadingState {
  ready: boolean;
  progress: number;
}

const decodeImage = async (blob: Blob) => {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(blob);
    bitmap.close();
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Image decode failed"));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const decodeAudio = async (blob: Blob) => {
  const objectUrl = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio();
      const timeout = window.setTimeout(
        () => reject(new Error("Audio decode timed out")),
        12000,
      );
      const cleanup = () => {
        window.clearTimeout(timeout);
        audio.removeEventListener("loadeddata", handleLoaded);
        audio.removeEventListener("error", handleError);
      };
      const handleLoaded = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error("Audio decode failed"));
      };

      audio.preload = "auto";
      audio.addEventListener("loadeddata", handleLoaded);
      audio.addEventListener("error", handleError);
      audio.src = objectUrl;
      audio.load();
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const useAssetPreloader = (): AssetLoadingState => {
  const [state, setState] = useState<AssetLoadingState>({
    ready: false,
    progress: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const startedAt = performance.now();
    let actualProgress = 0;
    const fractions = new Map(
      GAME_ASSETS.map((asset) => [asset.src, 0]),
    );

    const publishProgress = () => {
      if (cancelled) return;
      const total = Array.from(fractions.values()).reduce(
        (sum, value) => sum + value,
        0,
      );
      actualProgress = (total / GAME_ASSETS.length) * 100;
      const timeProgress =
        ((performance.now() - startedAt) / MINIMUM_LOADING_TIME) * 100;
      setState({
        ready: false,
        progress: Math.min(
          99,
          Math.round(Math.min(actualProgress, timeProgress)),
        ),
      });
    };

    const progressTimer = window.setInterval(publishProgress, 80);

    const loadAsset = async (asset: GameAsset) => {
      try {
        const response = await fetch(asset.src, { cache: "force-cache" });
        if (!response.ok) {
          throw new Error(`Asset request failed: ${asset.src}`);
        }

        const contentLength = Number(
          response.headers.get("content-length") ?? 0,
        );
        const reader = response.body?.getReader();
        let blob: Blob;

        if (reader) {
          const chunks: BlobPart[] = [];
          let loadedBytes = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = new Uint8Array(value.byteLength);
            chunk.set(value);
            chunks.push(chunk.buffer);
            loadedBytes += value.byteLength;
            if (contentLength > 0) {
              fractions.set(
                asset.src,
                Math.min(0.9, (loadedBytes / contentLength) * 0.9),
              );
              publishProgress();
            }
          }

          blob = new Blob(chunks, {
            type: response.headers.get("content-type") ?? undefined,
          });
        } else {
          blob = await response.blob();
        }

        fractions.set(asset.src, 0.94);
        publishProgress();

        if (asset.type === "image") await decodeImage(blob);
        else await decodeAudio(blob);
      } catch (error) {
        // A missing optional asset must not leave users trapped on the loader.
        console.warn(error);
      } finally {
        fractions.set(asset.src, 1);
        publishProgress();
      }
    };

    void Promise.all(GAME_ASSETS.map(loadAsset)).then(async () => {
      const remainingTime = Math.max(
        0,
        MINIMUM_LOADING_TIME - (performance.now() - startedAt),
      );
      if (remainingTime > 0) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, remainingTime);
        });
      }
      if (!cancelled) {
        window.clearInterval(progressTimer);
        setState({ ready: true, progress: 100 });
      }
    });

    return () => {
      cancelled = true;
      window.clearInterval(progressTimer);
    };
  }, []);

  return state;
};
