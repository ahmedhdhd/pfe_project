"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BannerCarouselProps {
  banners: string[];
}

export function BannerCarousel({ banners }: BannerCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });

  // Track selected index for dots
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Auto-play with pause on hover
  useEffect(() => {
    if (!emblaApi || isHovered || banners.length <= 1) return;
    const id = window.setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => window.clearInterval(id);
  }, [emblaApi, banners.length, isHovered]);

  if (!banners.length) {
    return null;
  }

  return (
    <div
      className="relative w-full h-40 md:h-64 lg:h-80 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {banners.map((banner, index) => (
            <div key={banner} className="relative h-full w-full shrink-0">
              <Image
                src={banner}
                alt={`Banner ${index + 1}`}
                fill
                className="object-cover"
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          {/* Prev / Next buttons */}
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 hover:bg-background px-3 py-1 text-xs shadow-sm"
            aria-label="Previous banner"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 hover:bg-background px-3 py-1 text-xs shadow-sm"
            aria-label="Next banner"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((banner, i) => (
              <button
                key={banner}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-1.5 w-5 rounded-full transition ${
                  i === selectedIndex ? "bg-primary" : "bg-muted/70"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
