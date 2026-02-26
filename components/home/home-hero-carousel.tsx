"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const banners = [
  "/home%20banners/banner-1.webp",
  "/home%20banners/banner-2.webp",
  "/home%20banners/banner-3.webp",
];

export function HomeHeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hero-carousel">
      <Image
        alt="Equinemates home banner"
        className="hero-carousel-image"
        fill
        priority
        sizes="(max-width: 1040px) 100vw, 58vw"
        src={banners[active]}
      />
      <div className="hero-carousel-dots">
        {banners.map((banner, index) => (
          <button
            aria-label={`Show banner ${index + 1}`}
            className={
              index === active ? "hero-dot hero-dot-active" : "hero-dot"
            }
            key={banner}
            onClick={() => setActive(index)}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
