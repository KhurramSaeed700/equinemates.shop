"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [main, setMain] = useState(images[0]);
  return (
    <div className="product-gallery-component">
      <div>
        <Image
          alt={name}
          src={main}
          width={640}
          height={420}
          className="product-gallery-main"
        />
      </div>
      <div className="product-gallery-thumbs">
        {images.slice(1).map((img) => (
          <img
            key={img}
            src={img}
            alt={`${name} gallery`}
            onClick={() => setMain(img)}
          />
        ))}
      </div>
    </div>
  );
}
