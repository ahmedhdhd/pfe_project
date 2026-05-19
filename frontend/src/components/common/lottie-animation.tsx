"use client";

import Lottie from "lottie-react";
import { CSSProperties, useEffect, useState } from "react";

interface LottieAnimationProps {
  animationData?: object;
  animationUrl?: string;
  className?: string;
  style?: CSSProperties;
  loop?: boolean;
  autoplay?: boolean;
  height?: number | string;
  width?: number | string;
  fallbackIcon?: React.ReactNode;
}

export function LottieAnimation({
  animationData,
  animationUrl,
  className = "",
  style,
  loop = true,
  autoplay = true,
  height = "100%",
  width = "100%",
  fallbackIcon,
}: LottieAnimationProps) {
  const [fetchedData, setFetchedData] = useState<object | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Fetch animation data from URL if provided
  useEffect(() => {
    if (animationUrl && !animationData) {
      setIsLoading(true);
      setHasError(false);
      fetch(animationUrl)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch: ${res.status}`);
          }
          // Check if response is JSON
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Response is not JSON");
          }
          return res.json();
        })
        .then((data) => {
          // Validate that it's a valid Lottie JSON
          if (data && (data.v || data.assets || data.layers)) {
            setFetchedData(data);
            setIsLoading(false);
          } else {
            throw new Error("Invalid Lottie JSON format");
          }
        })
        .catch((err) => {
          console.error("Failed to load Lottie animation:", err);
          setHasError(true);
          setIsLoading(false);
        });
    }
  }, [animationUrl, animationData]);

  // Use animationData if provided, otherwise use fetched data
  const dataToUse = animationData || fetchedData;

  if (isLoading) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (hasError || !dataToUse) {
    // Show fallback icon or a simple placeholder
    if (fallbackIcon) {
      return (
        <div
          className={className}
          style={{
            width,
            height,
            ...style,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {fallbackIcon}
        </div>
      );
    }
    // Return null to hide the component if no fallback
    return null;
  }

  return (
    <div className={className} style={{ width, height, ...style }}>
      <Lottie
        animationData={dataToUse}
        loop={loop}
        autoplay={autoplay}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
