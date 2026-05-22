import { Product, ProductCategory } from "@/lib/types";

const CATALOG_MARKDOWN = String.raw`# Shop Structure

---

## 1?? Horse

### Horse Wear & Protection
- Turnout Blankets
- Stable Blankets
- Coolers
- Rain Sheets
- Fly Sheets
- Therapy Sheets
- Neck Covers

### Horse Boots & Leg Protection
- Bell Boots
- Hoof Boots
- Ice Boots
- Shipping Boots
- Therapeutic Boots
- Leg Wraps & Bandages

### Bits & Tack
- CNC Bits

#### English Bits
- Ring Bits
- Full Cheek Bits
- Egg Butt & D-Ring Bits
- Kimberwick Bits
- Gag Bits
- Half Spoon Bits
- Driving Bits
- Pelham Bits
- Walking Horse Bits

#### Western Bits
- Western Shank Bits
- Lariat Rope Bits

#### German Silver Bits
- German Silver Ring Bits
- German Silver Shank Bits

#### Specialty Bits
- Interchangeable Cheeks & Mouthpieces
- Mouthpieces (Loose / Ported / Twisted)
- Cheeks

### Hackamores
- Mechanical Hackamores
- Bosal Hackamores

### Bridles
- English Bridles
- Western Bridles
- Bitless Bridles
- Reins
- Curb Straps & Accessories

### Saddles & Pads
- English Saddles
- Western Saddles
- Saddle Pads
- Correction Pads
- Bareback Pads
- Saddle Covers & Accessories

### Girths & Cinches
- English Girths
- Dressage Girths
- Western Cinches

### Halters & Leads
- Leather Halters
- Nylon Halters
- Rope Halters
- Poly Halters / PVC Halters
- Synthetic Waterproof Halters
- Lead Ropes
- Show Halters

### Training Equipment
- Martingales
- Breastplates
- Side Reins
- Lunging Equipment
- Whips & Crops
- Surcingles
- Cavessons

### Trail & Outdoor Gear
- All Purpose Saddles
- Trail Saddles
- Saddle Bags
- Trail Riding Accessories

### Fly & Pest Control
- Fly Masks
- Fly Boots
- Fly Rugs
- Fly Hoods

---

## 2?? Rider
### Riding Chaps
- Half chaps
- full chaps
-

### Riding Boots
- Field Boots
- Paddock Boots
- Winter Riding Boots
- Western Cowboy Boots

### Riding Apparel
- Breeches (Knee Patch / Full Seat)
- Show Shirts
- Show Coats
- Riding Gloves
- Stock Ties
- english belts
- Sun Shirts
- Hoodies & Sweatshirts
- Casual Riding Wear
- rider gifts

### Safety Gear
- Helmets
- Safety Vests

### Spurs & Accessories
- English Spurs
- Western Spurs
- Prince of Wales Spurs
- Roller Ball Spurs
- Rowel Spurs
- Spur Straps

### Boot & Gear Accessories
- Boot Jacks
- Boot Carry Bag
- Helmet Bags
- Duffle Bags


---


## 3?? Pet

### Dog Products
- Dog Coats & Jackets
- Dog Boots
- Dog Collars & Leashes
- Dog Grooming Products
- Dog Beds
- Dog Toys

### Cat Products
- Cat Collars
- Cat Toys
- Cat Beds
- Cat Grooming Products

### Small & Other Animals
- Pet Clothing
- Pet Carriers
- Pet Feeding Accessories
- Pet Toys
- Pet Grooming Tools

---


## 4?? Stable

### Tack Room Organization
- Saddle Racks
- Bridle Hooks & Racks
- Tack Racks
- Blanket Racks & Bars
- Tack Trunks & Boxes
- Helmet & Clothing Racks

### Stable Supplies
- Cross Ties & Hardware
- Nameplates & Signs

### Feeding Equipment
- Hay Bags & Feeders

### Farrier Tools
- Hoof Nippers
- Hoof Rasps
- Clinchers
- Pull-offs
- Hoof Knives
- Driving Hammers

### Hardware & Knives
- Tack Hardware
- Stainless Hardware
- Brass Hardware
- Damascus Knives
- Leather Cutting Tools

---

## 5?? Health & Care

### Grooming & Bathing
- Mane & Tail Care
- Clippers
- Grooming Kits
- Grooming Racks & Totes

### Therapy & First Aid
- Ice Boots
- Leg Wraps
- Therapy Equipment

### ?? Veterinary Instruments

#### Castration Instruments
- Castration Forceps
- Burdizzo Castrators
- Emasculators

#### Balling Guns
- Stainless Balling Guns
- Plastic Balling Guns

#### Restraining Equipment
- Nose Tongs
- Bull Holders
- Animal Restraining Tools

#### Hoof & Claw Tools
- Hoof Knives (Vet Grade)
- Hoof Testers
- Claw Cutters

#### Pig Holders

#### Grooming Products (Livestock)

#### Ear Tagging Instruments
- Ear Tag Applicators
- Ear Tag Removal Tools

#### Obstetric Instruments
- OB Chains
- OB Handles
- OB Hooks

#### MISC Veterinary
- Surgical Scissors
- Bandage Scissors
- Needle Holders
- Forceps
- Wire Saws
- Dehorners
- Milking Equipment
- Uterine Pumps

---`;

interface CatalogNode {
  name: string;
  children: CatalogNode[];
}

interface LeafCategory {
  path: string[];
  name: string;
}

type ProductImagePair = readonly [string, string];

const PRODUCTS_PER_LEAF = 3;
const MANUAL_ONLY_CATEGORY_PATHS = new Set(["Horse > Bits & Tack > CNC Bits"]);

const PRODUCT_IMAGE_SETS = {
  horseWear: [
    ["/products/turnout-blanket.svg", "/products/saddle-cover.svg"],
    ["/products/fly-mask.svg", "/products/turnout-blanket.svg"],
  ],
  horseLeg: [
    ["/products/bell-boots.svg", "/products/therapy-boot.svg"],
    ["/products/hoof-rasp.svg", "/products/bell-boots.svg"],
  ],
  tack: [
    ["/products/bridle.svg", "/products/saddle-pad.svg"],
    ["/products/saddle-pad.svg", "/products/saddle-cover.svg"],
  ],
  rider: [
    ["/products/field-boots.svg", "/products/rider-gloves.svg"],
    ["/products/breeches.svg", "/products/helmet.svg"],
  ],
  pet: [
    ["/products/dog-coat.svg", "/products/pawshield.svg"],
    ["/products/dog-boots.svg", "/products/cat-collar.svg"],
  ],
  stable: [
    ["/products/stable-rack.svg", "/products/stable-clean.svg"],
    ["/products/hay-feeder.svg", "/products/smartfeed.svg"],
  ],
  care: [
    ["/products/therapy-boot.svg", "/products/groom-kit.svg"],
    ["/products/vet-scissors.svg", "/products/hoof-rasp.svg"],
  ],
  trail: [
    ["/products/trail-pack.svg", "/products/trailbuddy.svg"],
    ["/products/arena-pack.svg", "/products/trail-pack.svg"],
  ],
  default: [
    ["/products/groom-kit.svg", "/products/arena-pack.svg"],
    ["/products/stable-clean.svg", "/products/smartfeed.svg"],
  ],
} as const satisfies Record<string, readonly ProductImagePair[]>;

interface CuratedProductSeed {
  slug: string;
  name: string;
  sku: string;
  categoryPath: string[];
  shortDescription: string;
  longDescription: string;
  basePriceUsd: number;
  images: ProductImagePair;
  tags: string[];
  stock: number;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  careInstructions?: string;
  shippingInfo?: string;
}

const CURATED_PRODUCTS: CuratedProductSeed[] = [
  {
    slug: "alpine-guard-turnout-blanket",
    name: "Alpine Guard Turnout Blanket",
    sku: "EQM-X001",
    categoryPath: ["Horse", "Horse Wear & Protection", "Turnout Blankets"],
    shortDescription:
      "Water-resistant turnout blanket with a warm quilted lining, secure surcingles, and reinforced shoulder movement for daily pasture use.",
    longDescription:
      "The Alpine Guard Turnout Blanket is built for changing weather and long barn days. A durable outer shell, soft lining, adjustable front closure, and tail flap help keep horses covered without restricting natural movement.",
    basePriceUsd: 169,
    images: ["/products/turnout-blanket.svg", "/products/saddle-cover.svg"],
    tags: ["turnout-blankets", "horse", "winter"],
    stock: 48,
    isBestSeller: true,
    careInstructions: "Brush off dried mud before washing. Machine wash cold and hang dry.",
  },
  {
    slug: "ventra-mesh-fly-mask",
    name: "Ventra Mesh Fly Mask",
    sku: "EQM-X002",
    categoryPath: ["Horse", "Fly & Pest Control", "Fly Masks"],
    shortDescription:
      "Breathable fly mask with soft fleece edging, ear coverage, and structured mesh that sits away from the eyes.",
    longDescription:
      "The Ventra Mesh Fly Mask keeps insects away while maintaining visibility and airflow. Its comfort-bound edges and adjustable closure make it a dependable turnout essential through fly season.",
    basePriceUsd: 36,
    images: ["/products/fly-mask.svg", "/products/turnout-blanket.svg"],
    tags: ["fly-masks", "horse", "summer"],
    stock: 72,
    isNewArrival: true,
  },
  {
    slug: "meridian-english-bridle",
    name: "Meridian English Bridle",
    sku: "EQM-X003",
    categoryPath: ["Horse", "Bridles", "English Bridles"],
    shortDescription:
      "Supple English bridle with padded crown, raised browband, stainless fittings, and clean stitching for schooling or show.",
    longDescription:
      "The Meridian English Bridle balances polished presentation with daily reliability. It includes thoughtful pressure relief at the crown, easy-adjust buckles, and a refined profile suited to training rings and event days.",
    basePriceUsd: 128,
    images: ["/products/bridle.svg", "/products/saddle-pad.svg"],
    tags: ["english-bridles", "horse", "tack"],
    stock: 36,
    isBestSeller: true,
  },
  {
    slug: "flexcurve-saddle-pad",
    name: "FlexCurve Saddle Pad",
    sku: "EQM-X004",
    categoryPath: ["Horse", "Saddles & Pads", "Saddle Pads"],
    shortDescription:
      "Contoured saddle pad with moisture-wicking lining, quilted support, and reinforced billet straps.",
    longDescription:
      "The FlexCurve Saddle Pad is shaped for close contact and balanced cushioning. Its breathable lining helps manage heat while the reinforced wear points stand up to regular schooling.",
    basePriceUsd: 74,
    images: ["/products/saddle-pad.svg", "/products/saddle-cover.svg"],
    tags: ["saddle-pads", "horse", "schooling"],
    stock: 58,
    isNewArrival: true,
  },
  {
    slug: "forge-shield-bell-boots",
    name: "Forge Shield Bell Boots",
    sku: "EQM-X005",
    categoryPath: ["Horse", "Horse Boots & Leg Protection", "Bell Boots"],
    shortDescription:
      "Flexible bell boots with reinforced strike zones and quick-grip closures for turnout, schooling, and travel.",
    longDescription:
      "Forge Shield Bell Boots protect the hoof area from overreach and everyday knocks. The flexible shell, soft upper edge, and secure closure make them easy to fit and simple to clean.",
    basePriceUsd: 42,
    images: ["/products/bell-boots.svg", "/products/therapy-boot.svg"],
    tags: ["bell-boots", "horse", "protection"],
    stock: 84,
  },
  {
    slug: "sterling-field-boots",
    name: "Sterling Field Boots",
    sku: "EQM-X006",
    categoryPath: ["Rider", "Riding Boots", "Field Boots"],
    shortDescription:
      "Tall field boots with a shaped calf, elastic back panel, spur rests, and a grippy riding sole.",
    longDescription:
      "Sterling Field Boots are designed for riders who need a polished silhouette without giving up comfort. The supportive shaft, flexible ankle, and secure zip closure make them suitable for lessons, clinics, and show prep.",
    basePriceUsd: 219,
    images: ["/products/field-boots.svg", "/products/rider-gloves.svg"],
    tags: ["field-boots", "rider", "show"],
    stock: 32,
    isBestSeller: true,
  },
  {
    slug: "showline-full-seat-breeches",
    name: "ShowLine Full Seat Breeches",
    sku: "EQM-X007",
    categoryPath: ["Rider", "Riding Apparel", "Breeches (Knee Patch / Full Seat)"],
    shortDescription:
      "Full-seat breeches with stretch fabric, smooth waistband, phone pocket, and silicone grip for secure saddle contact.",
    longDescription:
      "ShowLine Full Seat Breeches deliver a clean show-ready look with practical day-to-day comfort. Four-way stretch, a supportive waistband, and a breathable feel keep riders comfortable through long sessions.",
    basePriceUsd: 98,
    images: ["/products/breeches.svg", "/products/helmet.svg"],
    tags: ["breeches", "rider", "apparel"],
    stock: 64,
    isNewArrival: true,
  },
  {
    slug: "crestguard-safety-vest",
    name: "CrestGuard Safety Vest",
    sku: "EQM-X008",
    categoryPath: ["Rider", "Safety Gear", "Safety Vests"],
    shortDescription:
      "Lightweight rider safety vest with segmented padding, adjustable side panels, and a close, flexible fit.",
    longDescription:
      "The CrestGuard Safety Vest gives riders coverage without a bulky feel. Its segmented profile supports mobility while the adjustable panels help fine-tune the fit over base layers or show shirts.",
    basePriceUsd: 149,
    images: ["/products/safety-vest.svg", "/products/helmet.svg"],
    tags: ["safety-vests", "rider", "safety"],
    stock: 41,
  },
  {
    slug: "rangefinder-trail-pack",
    name: "RangeFinder Trail Pack",
    sku: "EQM-X009",
    categoryPath: ["Horse", "Trail & Outdoor Gear", "Saddle Bags"],
    shortDescription:
      "Balanced saddle bag set with insulated bottle pockets, weather-resistant fabric, and quick-release straps.",
    longDescription:
      "The RangeFinder Trail Pack keeps essentials organized without swinging or crowding the saddle. Reinforced panels, compact pockets, and trail-friendly closures make it a practical outdoor companion.",
    basePriceUsd: 86,
    images: ["/products/trail-pack.svg", "/products/trailbuddy.svg"],
    tags: ["saddle-bags", "horse", "trail"],
    stock: 45,
    isNewArrival: true,
  },
  {
    slug: "orchard-hay-feeder",
    name: "Orchard Hay Feeder",
    sku: "EQM-X010",
    categoryPath: ["Stable", "Feeding Equipment", "Hay Bags & Feeders"],
    shortDescription:
      "Slow-feed hay feeder with sturdy hanging straps, reinforced seams, and wide fill access for daily stable routines.",
    longDescription:
      "The Orchard Hay Feeder helps reduce waste and extend feeding time. Durable mesh, clean hardware, and a stable hanging profile make it useful in stalls, trailers, and show setups.",
    basePriceUsd: 52,
    images: ["/products/hay-feeder.svg", "/products/smartfeed.svg"],
    tags: ["hay-bags-and-feeders", "stable", "feeding"],
    stock: 69,
    isBestSeller: true,
  },
  {
    slug: "farrier-pro-hoof-rasp",
    name: "Farrier Pro Hoof Rasp",
    sku: "EQM-X011",
    categoryPath: ["Stable", "Farrier Tools", "Hoof Rasps"],
    shortDescription:
      "Dual-sided hoof rasp with an ergonomic handle, sharp filing face, and fine finishing side.",
    longDescription:
      "The Farrier Pro Hoof Rasp is designed for accurate shaping and smooth finishing. Its balanced handle and durable working surfaces support confident hoof-care maintenance.",
    basePriceUsd: 44,
    images: ["/products/hoof-rasp.svg", "/products/stable-clean.svg"],
    tags: ["hoof-rasps", "stable", "farrier"],
    stock: 51,
  },
  {
    slug: "dockside-dog-coat",
    name: "Dockside Dog Coat",
    sku: "EQM-X012",
    categoryPath: ["Pet", "Dog Products", "Dog Coats & Jackets"],
    shortDescription:
      "Weather-ready dog coat with a warm lining, leash opening, adjustable belly strap, and reflective trim.",
    longDescription:
      "The Dockside Dog Coat keeps active dogs comfortable through chilly walks and damp mornings. It is easy to secure, easy to clean, and shaped to allow natural movement.",
    basePriceUsd: 48,
    images: ["/products/dog-coat.svg", "/products/pawshield.svg"],
    tags: ["dog-coats-and-jackets", "pet", "dog"],
    stock: 90,
    isBestSeller: true,
  },
  {
    slug: "rover-trail-dog-boots",
    name: "Rover Trail Dog Boots",
    sku: "EQM-X013",
    categoryPath: ["Pet", "Dog Products", "Dog Boots"],
    shortDescription:
      "Protective dog boots with flexible soles, reflective straps, and a secure wrap fit for rough surfaces.",
    longDescription:
      "Rover Trail Dog Boots help protect paws from heat, gravel, mud, and cold ground. A flexible sole and adjustable strap make them suitable for walks, travel, and barn visits.",
    basePriceUsd: 39,
    images: ["/products/dog-boots.svg", "/products/pawshield.svg"],
    tags: ["dog-boots", "pet", "dog"],
    stock: 74,
    isNewArrival: true,
  },
  {
    slug: "lumen-cat-collar",
    name: "Lumen Cat Collar",
    sku: "EQM-X014",
    categoryPath: ["Pet", "Cat Products", "Cat Collars"],
    shortDescription:
      "Adjustable cat collar with a breakaway buckle, soft webbing, and a polished bell charm.",
    longDescription:
      "The Lumen Cat Collar is lightweight enough for daily wear and secure enough for peace of mind. The breakaway buckle, smooth adjustment, and clean finish make it a simple pet essential.",
    basePriceUsd: 18,
    images: ["/products/cat-collar.svg", "/products/pet-bed.svg"],
    tags: ["cat-collars", "pet", "cat"],
    stock: 110,
  },
  {
    slug: "recovery-ice-boot-wraps",
    name: "Recovery Ice Boot Wraps",
    sku: "EQM-X015",
    categoryPath: ["Health & Care", "Therapy & First Aid", "Ice Boots"],
    shortDescription:
      "Reusable cold therapy boot wraps with flexible gel inserts, secure straps, and full lower-leg coverage.",
    longDescription:
      "Recovery Ice Boot Wraps support post-workout cooling and routine first-aid care. The flexible inserts contour around the leg while broad straps keep the wrap steady during use.",
    basePriceUsd: 92,
    images: ["/products/therapy-boot.svg", "/products/groom-kit.svg"],
    tags: ["ice-boots", "health-and-care", "therapy"],
    stock: 42,
    isBestSeller: true,
  },
  {
    slug: "vetgrade-bandage-scissors",
    name: "VetGrade Bandage Scissors",
    sku: "EQM-X016",
    categoryPath: ["Health & Care", "Veterinary Instruments", "MISC Veterinary", "Bandage Scissors"],
    shortDescription:
      "Stainless bandage scissors with a blunt safety tip, angled blades, and a comfortable grip.",
    longDescription:
      "VetGrade Bandage Scissors are a practical addition to barn and veterinary kits. The angled profile and blunt tip support careful bandage removal while the stainless finish is easy to sanitize.",
    basePriceUsd: 29,
    images: ["/products/vet-scissors.svg", "/products/hoof-rasp.svg"],
    tags: ["bandage-scissors", "health-and-care", "veterinary"],
    stock: 63,
  },
];

export const USD_TO_PKR_RATE = 280;
export const BULK_PRICE_MULTIPLIER = 1;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\//g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanHeading(value: string): string {
  return value
    .replace(/^\d+[^A-Za-z]+/, "")
    .replace(/[0-9????]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCatalogFromMarkdown(markdown: string): CatalogNode[] {
  const lines = markdown.split(/\r?\n/);
  const categories: CatalogNode[] = [];

  let currentH2: CatalogNode | null = null;
  let currentH3: CatalogNode | null = null;
  let currentH4: CatalogNode | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === "---") {
      continue;
    }

    if (line.startsWith("## ") && !line.startsWith("### ")) {
      const node: CatalogNode = { name: cleanHeading(line.replace(/^##\s+/, "")), children: [] };
      categories.push(node);
      currentH2 = node;
      currentH3 = null;
      currentH4 = null;
      continue;
    }

    if (line.startsWith("### ") && !line.startsWith("#### ")) {
      if (!currentH2) continue;
      const node: CatalogNode = { name: cleanHeading(line.replace(/^###\s+/, "")), children: [] };
      currentH2.children.push(node);
      currentH3 = node;
      currentH4 = null;
      continue;
    }

    if (line.startsWith("#### ")) {
      if (!currentH3) continue;
      const node: CatalogNode = { name: cleanHeading(line.replace(/^####\s+/, "")), children: [] };
      currentH3.children.push(node);
      currentH4 = node;
      continue;
    }

    if (line.startsWith("- ")) {
      const leaf = cleanHeading(line.replace(/^-\s+/, ""));
      if (!leaf) {
        continue;
      }
      const parent = currentH4 ?? currentH3 ?? currentH2;
      if (!parent) {
        continue;
      }
      parent.children.push({ name: leaf, children: [] });
    }
  }

  return categories;
}

function getLeafCategories(nodes: CatalogNode[], basePath: string[] = []): LeafCategory[] {
  const leaves: LeafCategory[] = [];

  for (const node of nodes) {
    const path = [...basePath, node.name];
    if (!node.children.length) {
      leaves.push({ path, name: node.name });
      continue;
    }
    leaves.push(...getLeafCategories(node.children, path));
  }

  return leaves;
}

function toUsdToPkr(usd: number): number {
  return Math.round(usd * BULK_PRICE_MULTIPLIER * USD_TO_PKR_RATE);
}

function priceRangeForCategory(path: string[]): [number, number] {
  const main = path[0] ?? "";
  const full = path.join(" ").toLowerCase();

  if (full.includes("blanket") || full.includes("rug") || full.includes("sheet")) return [79, 199];
  if (main === "Rider" && full.includes("boot")) return [89, 249];
  if (full.includes("saddle")) return [129, 699];
  if (full.includes("helmet") || full.includes("safety vest")) return [69, 239];
  if (full.includes("bit") || full.includes("hackamore") || full.includes("bridle")) return [45, 189];
  if (full.includes("grooming") || full.includes("clippers")) return [25, 110];
  if (full.includes("therapy") || full.includes("first aid") || full.includes("instrument")) return [35, 220];
  if (full.includes("carrier") || full.includes("bed")) return [45, 140];
  if (main === "Pet") return [15, 60];
  if (main === "Stable") return [24, 180];
  if (main === "Health & Care") return [29, 150];
  return [29, 120];
}

function imageSetForCategory(path: string[]): readonly ProductImagePair[] {
  const main = path[0] ?? "";
  const full = path.join(" ").toLowerCase();

  if (full.includes("trail") || full.includes("saddle bag")) {
    return PRODUCT_IMAGE_SETS.trail;
  }
  if (main === "Rider") {
    return PRODUCT_IMAGE_SETS.rider;
  }
  if (main === "Pet") {
    return PRODUCT_IMAGE_SETS.pet;
  }
  if (main === "Health & Care") {
    return PRODUCT_IMAGE_SETS.care;
  }
  if (
    full.includes("blanket") ||
    full.includes("rug") ||
    full.includes("sheet") ||
    full.includes("fly")
  ) {
    return PRODUCT_IMAGE_SETS.horseWear;
  }
  if (
    full.includes("boot") ||
    full.includes("wrap") ||
    full.includes("bandage") ||
    full.includes("hoof")
  ) {
    return PRODUCT_IMAGE_SETS.horseLeg;
  }
  if (
    full.includes("bit") ||
    full.includes("hackamore") ||
    full.includes("bridle") ||
    full.includes("saddle") ||
    full.includes("halter") ||
    full.includes("rein")
  ) {
    return PRODUCT_IMAGE_SETS.tack;
  }
  if (main === "Stable") {
    return PRODUCT_IMAGE_SETS.stable;
  }

  return PRODUCT_IMAGE_SETS.default;
}

function imagesForCategory(path: string[], variantIndex: number): string[] {
  const imageSet = imageSetForCategory(path);
  return [...imageSet[variantIndex % imageSet.length]];
}

function buildTitle(leaf: string, variantIndex: number): string {
  const prefixes = ["Heritage", "Performance", "Premier"];
  const suffixes = ["Edition", "Series", "Collection"];
  return `${prefixes[variantIndex]} ${leaf} ${suffixes[variantIndex]}`;
}

function buildDescriptions(path: string[], leaf: string, variantIndex: number): { short: string; long: string } {
  const section = path[path.length - 2] ?? path[0] ?? "General";
  const shortTemplates = [
    `${leaf} engineered for dependable daily use in ${section.toLowerCase()} workflows. Built with premium materials to balance durability, comfort, and clean finish.`,
    `A modern ${leaf.toLowerCase()} solution designed for performance and control. Crafted for riders and caretakers who expect consistent quality in every session.`,
    `Professional-grade ${leaf.toLowerCase()} tailored for long-term reliability. Optimized construction supports fit, function, and polished presentation.`,
  ];

  const longTemplates = [
    `This ${leaf.toLowerCase()} combines refined design with practical utility for demanding barn and riding routines. Reinforced detailing and quality finishing help maintain performance across repeated use.`,
    `Developed for premium e-commerce standards, this ${leaf.toLowerCase()} offers dependable handling and comfort-focused construction. Its balanced profile supports both day-to-day operations and event-ready presentation.`,
    `Built as a high-value option within ${section.toLowerCase()}, this ${leaf.toLowerCase()} delivers consistent functionality with a professional look. Reliable materials and thoughtful construction make it a smart long-term addition.`,
  ];

  return {
    short: shortTemplates[variantIndex],
    long: `${shortTemplates[variantIndex]} ${longTemplates[variantIndex]}`,
  };
}

function createCuratedProducts(): Product[] {
  return CURATED_PRODUCTS.map((product) => ({
    id: product.slug,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    category: product.categoryPath[0] as ProductCategory,
    categoryPath: product.categoryPath,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    basePriceUsd: product.basePriceUsd,
    basePricePkr: toUsdToPkr(product.basePriceUsd),
    compareAtPricePkr: toUsdToPkr(product.basePriceUsd * 1.12),
    images: [...product.images],
    variants: [],
    rating: 0,
    reviewCount: 0,
    reviews: [],
    tags: product.tags,
    isBestSeller: Boolean(product.isBestSeller),
    isNewArrival: Boolean(product.isNewArrival),
    relatedSlugs: [],
    stock: product.stock,
    careInstructions: product.careInstructions,
    shippingInfo: product.shippingInfo,
  }));
}

function createProductsFromLeaves(leaves: LeafCategory[]): Product[] {
  const products: Product[] = [];
  let sequence = 1;

  for (const leaf of leaves) {
    if (MANUAL_ONLY_CATEGORY_PATHS.has(leaf.path.join(" > "))) {
      continue;
    }

    const [minUsd, maxUsd] = priceRangeForCategory(leaf.path);

    for (let i = 0; i < PRODUCTS_PER_LEAF; i += 1) {
      const ratio = i / (PRODUCTS_PER_LEAF - 1);
      const usd = Math.round((minUsd + (maxUsd - minUsd) * ratio) * 100) / 100;
      const { short, long } = buildDescriptions(leaf.path, leaf.name, i);
      const idBase = `${slugify(leaf.path.join("-"))}-${i + 1}`;

      products.push({
        id: idBase,
        slug: idBase,
        name: buildTitle(leaf.name, i),
        sku: `EQM-${String(sequence).padStart(4, "0")}`,
        category: leaf.path[0] as ProductCategory,
        categoryPath: leaf.path,
        shortDescription: short,
        longDescription: long,
        basePriceUsd: usd,
        basePricePkr: toUsdToPkr(usd),
        compareAtPricePkr: toUsdToPkr(usd * 1.1),
        images: imagesForCategory(leaf.path, i),
        variants: [],
        rating: 0,
        reviewCount: 0,
        reviews: [],
        tags: [slugify(leaf.name), slugify(leaf.path[0])],
        isBestSeller: i === 0,
        isNewArrival: i === 2,
        relatedSlugs: [],
        stock: 35 + i * 10,
      });
      sequence += 1;
    }
  }

  products.push(...createCuratedProducts());

  const byLeaf = new Map<string, Product[]>();
  for (const product of products) {
    const key = product.categoryPath.join(" > ");
    const list = byLeaf.get(key) ?? [];
    list.push(product);
    byLeaf.set(key, list);
  }

  for (const siblings of byLeaf.values()) {
    for (const product of siblings) {
      product.relatedSlugs = siblings
        .filter((item) => item.slug !== product.slug)
        .map((item) => item.slug)
        .slice(0, 2);
    }
  }

  return products;
}

function validateCatalog(categories: CatalogNode[], products: Product[]) {
  const leaves = getLeafCategories(categories);
  const seededLeaves = leaves.filter(
    (leaf) => !MANUAL_ONLY_CATEGORY_PATHS.has(leaf.path.join(" > ")),
  );
  const leafKeys = new Set(leaves.map((leaf) => leaf.path.join(" > ")));
  const expectedCount = seededLeaves.length * PRODUCTS_PER_LEAF + CURATED_PRODUCTS.length;

  if (products.length !== expectedCount) {
    throw new Error(`Catalog validation failed: expected ${expectedCount} products, got ${products.length}.`);
  }

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const seenSkus = new Set<string>();
  for (const product of products) {
    if (seenIds.has(product.id)) {
      throw new Error(`Catalog validation failed: duplicate product id ${product.id}.`);
    }
    seenIds.add(product.id);

    if (seenSlugs.has(product.slug)) {
      throw new Error(`Catalog validation failed: duplicate product slug ${product.slug}.`);
    }
    seenSlugs.add(product.slug);

    if (seenSkus.has(product.sku)) {
      throw new Error(`Catalog validation failed: duplicate product SKU ${product.sku}.`);
    }
    seenSkus.add(product.sku);

    if (!leafKeys.has(product.categoryPath.join(" > "))) {
      throw new Error(`Catalog validation failed: ${product.id} uses an unknown category path.`);
    }

    if (product.images.length !== 2 || product.images.some((image) => !image.startsWith("/products/"))) {
      throw new Error(`Catalog validation failed: ${product.id} must use exactly two product image assets.`);
    }
  }

  const countByLeaf = new Map<string, number>();
  for (const product of products) {
    const key = product.categoryPath.join(" > ");
    countByLeaf.set(key, (countByLeaf.get(key) ?? 0) + 1);
  }

  for (const leaf of seededLeaves) {
    const key = leaf.path.join(" > ");
    if ((countByLeaf.get(key) ?? 0) < PRODUCTS_PER_LEAF) {
      throw new Error(`Catalog validation failed: ${key} does not have at least ${PRODUCTS_PER_LEAF} products.`);
    }
  }
}

export const CATEGORIES = parseCatalogFromMarkdown(CATALOG_MARKDOWN);
const LEAF_CATEGORIES = getLeafCategories(CATEGORIES);
// Seed-source catalog data used to populate Neon.
export const PRODUCTS: Product[] = createProductsFromLeaves(LEAF_CATEGORIES);
validateCatalog(CATEGORIES, PRODUCTS);

export interface NavMenuColumn {
  heading: string;
  href?: string;
  items: Array<{ label: string; href: string }>;
}

export interface NavMenu {
  label: string;
  href: string;
  columns: NavMenuColumn[];
}

export function buildCategoryPathHref(path: string[]): string {
  const top = path[0] ?? "";
  return `/products?category=${encodeURIComponent(top)}&path=${encodeURIComponent(path.join(" > "))}`;
}

export interface AdminProductSummary {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: ProductCategory;
  primaryImage: string | null;
}

export interface AdminProductInput {
  originalSlug?: string;
  slug: string;
  name: string;
  sku: string;
  category: ProductCategory;
  categoryPath: string[];
  shortDescription: string;
  longDescription: string;
  basePriceUsd: number;
  basePricePkr: number;
  compareAtPricePkr?: number;
  images: string[];
  tags: string[];
  stock: number;
  isBestSeller: boolean;
  isNewArrival: boolean;
  careInstructions?: string;
  shippingInfo?: string;
}
