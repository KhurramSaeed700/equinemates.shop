import { Product, ProductCategory, Promotion, SearchFilters } from "@/lib/types";

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
- CNC Bits
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

const PRODUCT_IMAGES = ["/place holder/1.webp", "/place holder/2.webp"] as const;
const PRODUCTS_PER_LEAF = 3;

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

function createProductsFromLeaves(leaves: LeafCategory[]): Product[] {
  const products: Product[] = [];
  let sequence = 1;

  for (const leaf of leaves) {
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
        images: [...PRODUCT_IMAGES],
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
  const expectedCount = leaves.length * PRODUCTS_PER_LEAF;

  if (products.length !== expectedCount) {
    throw new Error(`Catalog validation failed: expected ${expectedCount} products, got ${products.length}.`);
  }

  const seenIds = new Set<string>();
  for (const product of products) {
    if (seenIds.has(product.id)) {
      throw new Error(`Catalog validation failed: duplicate product id ${product.id}.`);
    }
    seenIds.add(product.id);

    if (product.images.length !== 2 || product.images[0] !== PRODUCT_IMAGES[0] || product.images[1] !== PRODUCT_IMAGES[1]) {
      throw new Error(`Catalog validation failed: ${product.id} must use exactly two shared placeholder images.`);
    }
  }

  const countByLeaf = new Map<string, number>();
  for (const product of products) {
    const key = product.categoryPath.join(" > ");
    countByLeaf.set(key, (countByLeaf.get(key) ?? 0) + 1);
  }

  for (const leaf of leaves) {
    const key = leaf.path.join(" > ");
    if ((countByLeaf.get(key) ?? 0) !== PRODUCTS_PER_LEAF) {
      throw new Error(`Catalog validation failed: ${key} does not have exactly ${PRODUCTS_PER_LEAF} products.`);
    }
  }
}

export const CATEGORIES = parseCatalogFromMarkdown(CATALOG_MARKDOWN);
const LEAF_CATEGORIES = getLeafCategories(CATEGORIES);

export const CATEGORY_OPTIONS: ProductCategory[] = CATEGORIES.map(
  (category) => category.name as ProductCategory,
);

export const PRODUCTS: Product[] = createProductsFromLeaves(LEAF_CATEGORIES);
validateCatalog(CATEGORIES, PRODUCTS);

export const CATALOG_SEED = {
  categories: CATEGORIES,
  products: PRODUCTS,
};

export const PROMOTIONS: Promotion[] = [
  {
    id: "promo-horse",
    title: "Horse Premium Collection",
    copy: "Technical horse gear, tack, and protection essentials curated for stable and competition routines.",
    ctaLabel: "Shop Horse",
    ctaHref: "/products?category=Horse",
  },
  {
    id: "promo-rider",
    title: "Rider Performance Edit",
    copy: "Elevate training and show-day preparation with rider apparel, boots, and safety gear.",
    ctaLabel: "Shop Rider",
    ctaHref: "/products?category=Rider",
  },
];

export const FEATURED_CATEGORY_SUMMARY = CATEGORIES.slice(0, 5).map((category) => ({
  id: `cat-${slugify(category.name)}`,
  name: category.name,
  description: `${category.name} essentials curated across premium product lines.`,
  href: `/products?category=${encodeURIComponent(category.name)}`,
}));

function isLeaf(node: CatalogNode): boolean {
  return node.children.length === 0;
}

function collectLeafPaths(node: CatalogNode, path: string[]): string[][] {
  if (isLeaf(node)) {
    return [path];
  }

  const paths: string[][] = [];
  for (const child of node.children) {
    paths.push(...collectLeafPaths(child, [...path, child.name]));
  }
  return paths;
}

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

export function getNavbarMenus(): NavMenu[] {
  return CATEGORIES.map((top) => {
    const columns: NavMenuColumn[] = [];

    for (const child of top.children) {
      if (top.name === "Horse" && child.name === "Bits & Tack") {
        columns.push({
          heading: "Bits",
          href: buildCategoryPathHref([top.name, child.name]),
          items: child.children.map((group) => ({
            label: group.name,
            href: buildCategoryPathHref([top.name, child.name, group.name]),
          })),
        });
        continue;
      }

      if (child.children.length > 0 && child.children.every(isLeaf)) {
        columns.push({
          heading: child.name,
          href: buildCategoryPathHref([top.name, child.name]),
          items: child.children.map((leaf) => ({
            label: leaf.name,
            href: buildCategoryPathHref([top.name, child.name, leaf.name]),
          })),
        });
        continue;
      }

      if (child.children.length > 0) {
        for (const grandChild of child.children) {
          const leafPaths = collectLeafPaths(grandChild, [top.name, child.name, grandChild.name]);
          columns.push({
            heading: grandChild.name,
            href: buildCategoryPathHref([top.name, child.name, grandChild.name]),
            items: leafPaths.map((path) => ({
              label: path[path.length - 1],
              href: buildCategoryPathHref(path),
            })),
          });
        }
      }
    }

    return {
      label: top.name,
      href: `/products?category=${encodeURIComponent(top.name)}`,
      columns,
    };
  });
}

export function buildCategoryPathHref(path: string[]): string {
  const top = path[0] ?? "";
  return `/products?category=${encodeURIComponent(top)}&path=${encodeURIComponent(path.join(" > "))}`;
}

function normalizeSlug(value: string): string {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/\/+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getProductBySlug(slug: string): Product | undefined {
  const directMatch = PRODUCTS.find((product) => product.slug === slug);
  if (directMatch) {
    return directMatch;
  }

  const normalized = normalizeSlug(slug);
  return PRODUCTS.find((product) => normalizeSlug(product.slug) === normalized);
}

export function getRelatedProducts(slug: string): Product[] {
  const product = getProductBySlug(slug);
  if (!product) return [];
  return product.relatedSlugs
    .map((relatedSlug) => getProductBySlug(relatedSlug))
    .filter((relatedProduct): relatedProduct is Product => Boolean(relatedProduct));
}

export function getBestSellers(limit = 4): Product[] {
  return PRODUCTS.filter((product) => product.isBestSeller).slice(0, limit);
}

export function getNewArrivals(limit = 4): Product[] {
  return PRODUCTS.filter((product) => product.isNewArrival).slice(0, limit);
}

export function filterProducts(filters: SearchFilters): Product[] {
  return PRODUCTS.filter((product) => {
    if (filters.category && product.category !== filters.category) {
      return false;
    }

    if (filters.categoryPath) {
      const productPath = product.categoryPath.join(" > ");
      const isExactMatch = productPath === filters.categoryPath;
      const isNestedMatch = productPath.startsWith(`${filters.categoryPath} > `);
      if (!isExactMatch && !isNestedMatch) {
        return false;
      }
    }

    if (filters.minPricePkr && product.basePricePkr < filters.minPricePkr) {
      return false;
    }

    if (filters.maxPricePkr && product.basePricePkr > filters.maxPricePkr) {
      return false;
    }

    if (filters.tag && !product.tags.includes(filters.tag)) {
      return false;
    }

    if (!filters.query) {
      return true;
    }

    const normalizedQuery = filters.query.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.sku.toLowerCase().includes(normalizedQuery) ||
      product.categoryPath.some((node) => node.toLowerCase().includes(normalizedQuery))
    );
  });
}

export function searchSuggestions(query: string): Product[] {
  if (!query.trim()) {
    return [];
  }
  return filterProducts({ query }).slice(0, 6);
}
