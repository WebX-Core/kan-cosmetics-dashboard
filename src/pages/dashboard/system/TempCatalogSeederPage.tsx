import React from "react";
import { Beaker, Loader2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { catalogApi } from "@/features/catalog";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

const CATEGORY_COUNT = 5;
const SUBCATEGORY_PER_CATEGORY = 3;
const PRODUCTS_PER_SUBCATEGORY = 5;
const TOTAL_ITEMS = CATEGORY_COUNT + CATEGORY_COUNT * SUBCATEGORY_PER_CATEGORY + CATEGORY_COUNT * SUBCATEGORY_PER_CATEGORY * PRODUCTS_PER_SUBCATEGORY;

const imagePool: ReadonlyArray<string> = [
  "/KANWEBSITE/KAN PRODUCTS/liquid lipstick.png",
  "/KANWEBSITE/KAN PRODUCTS/lipstick.PNG",
  "/KANWEBSITE/KAN PRODUCTS/blush.jpeg",
  "/KANWEBSITE/KAN PRODUCTS/foundation 1.png",
  "/KANWEBSITE/KAN PRODUCTS/compact powder.jpg",
  "/KANWEBSITE/KAN PRODUCTS/highlighter.PNG",
  "/KANWEBSITE/KAN PRODUCTS/MASCARA.png",
  "/KANWEBSITE/KAN PRODUCTS/eyeliner.PNG",
  "/KANWEBSITE/KAN PRODUCTS/cc air cushion.PNG",
  "/KANWEBSITE/KAN PRODUCTS/loose powder.PNG",
  "/KANWEBSITE/KAN PRODUCTS/setting spray.png",
  "/KANWEBSITE/KAN PRODUCTS/beauty bleander.png",
];

const seedCatalog: ReadonlyArray<
  Readonly<{
    category: string;
    subcategories: ReadonlyArray<
      Readonly<{
        name: string;
        products: ReadonlyArray<string>;
      }>
    >;
  }>
> = [
  {
    category: "Face",
    subcategories: [
      {
        name: "Foundation",
        products: [
          "Liquid Foundation Natural Glow",
          "Soft Matte Foundation",
          "Air Cushion Foundation",
          "Hydrating Foundation Serum",
          "Full Coverage Foundation",
        ],
      },
      {
        name: "Concealer",
        products: [
          "Creamy Concealer Bright Touch",
          "Long Wear Concealer",
          "Under Eye Corrector",
          "Spot Cover Concealer",
          "Silk Finish Concealer",
        ],
      },
      {
        name: "Powder",
        products: [
          "Compact Powder Smooth Skin",
          "Loose Setting Powder",
          "Oil Control Pressed Powder",
          "Bright Finish Banana Powder",
          "Translucent Matte Powder",
        ],
      },
    ],
  },
  {
    category: "Lips",
    subcategories: [
      {
        name: "Lipstick",
        products: [
          "Lipstick Matte All On",
          "Creamy Satin Lipstick",
          "Velvet Nude Lipstick",
          "Bold Red Lipstick",
          "Moisture Lock Lipstick",
        ],
      },
      {
        name: "Lip Gloss",
        products: [
          "Shine Boost Lip Gloss",
          "Glass Finish Lip Gloss",
          "Plump Effect Lip Gloss",
          "Tinted Glow Lip Gloss",
          "Hydra Gloss Lip Shine",
        ],
      },
      {
        name: "Lip Care",
        products: [
          "Nourishing Lip Balm",
          "Overnight Lip Mask",
          "SPF Protection Lip Balm",
          "Berry Repair Lip Care",
          "Shea Soft Lip Treatment",
        ],
      },
    ],
  },
  {
    category: "Eyes",
    subcategories: [
      {
        name: "Mascara",
        products: [
          "Volume Lift Mascara",
          "Length Define Mascara",
          "Waterproof Curl Mascara",
          "Deep Black Lash Mascara",
          "Smudge Free Daily Mascara",
        ],
      },
      {
        name: "Eyeliner",
        products: [
          "Precision Liquid Eyeliner",
          "Gel Intense Eyeliner",
          "Ultra Black Matte Liner",
          "Waterproof Fine Tip Liner",
          "Soft Glide Pencil Liner",
        ],
      },
      {
        name: "Eyeshadow",
        products: [
          "Nude Bloom Eyeshadow Palette",
          "Sunset Glow Eyeshadow Palette",
          "Smokey Night Eyeshadow Palette",
          "Rose Gold Eyeshadow Quad",
          "Everyday Matte Eyeshadow Set",
        ],
      },
    ],
  },
  {
    category: "Skincare",
    subcategories: [
      {
        name: "Cleanser",
        products: [
          "Gentle Foaming Cleanser",
          "Hydrating Cream Cleanser",
          "Brightening Gel Cleanser",
          "Purifying Daily Face Wash",
          "Calming Sensitive Cleanser",
        ],
      },
      {
        name: "Serum",
        products: [
          "Vitamin C Glow Serum",
          "Hyaluronic Hydration Serum",
          "Niacinamide Balance Serum",
          "Retinol Renewal Serum",
          "Barrier Repair Serum",
        ],
      },
      {
        name: "Moisturizer",
        products: [
          "Daily Hydration Moisturizer",
          "Oil Free Gel Moisturizer",
          "Nourishing Night Cream",
          "Bright Tone Moisturizer",
          "Ceramide Barrier Cream",
        ],
      },
    ],
  },
  {
    category: "Tools",
    subcategories: [
      {
        name: "Brushes",
        products: [
          "Foundation Blend Brush",
          "Powder Finish Brush",
          "Angled Blush Brush",
          "Precision Concealer Brush",
          "Eyeshadow Detail Brush",
        ],
      },
      {
        name: "Sponges",
        products: [
          "Soft Blend Makeup Sponge",
          "Precision Edge Sponge",
          "Velvet Air Sponge",
          "Dew Finish Blending Sponge",
          "Mini Concealer Sponge",
        ],
      },
      {
        name: "Accessories",
        products: [
          "Pro Lash Curler",
          "Dual Pencil Sharpener",
          "Compact Mirror Fold",
          "Travel Makeup Pouch",
          "Sanitizing Brush Cleaner",
        ],
      },
    ],
  },
];

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const extFromPath = (path: string): string => {
  const filename = path.split("/").pop() ?? "file.png";
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return "png";
  return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp" ? ext : "png";
};

const mimeFromExt = (ext: string): string => {
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "image/png";
};

const toId = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null) return "";

  const row = value as Record<string, unknown>;
  if (typeof row.id === "string" && row.id) return row.id;

  const directKeys = ["category", "subcategory", "product", "item", "result"] as const;
  for (const key of directKeys) {
    const nested = row[key];
    if (typeof nested === "object" && nested !== null) {
      const nestedId = toId(nested);
      if (nestedId) return nestedId;
    }
  }

  const data = row.data;
  if (typeof data === "object" && data !== null) {
    const dataId = toId(data);
    if (dataId) return dataId;
  }

  return "";
};

const findIdBySlug = (
  rows: ReadonlyArray<unknown>,
  slug: string
): string => {
  const match = rows.find((entry) => {
    if (typeof entry !== "object" || entry === null) return false;
    const row = entry as Record<string, unknown>;
    return typeof row.slug === "string" && row.slug === slug;
  });
  return toId(match);
};

export const TempCatalogSeederPage: React.FC = () => {
  const toast = useToast();

  const createCategory = catalogApi.categories.hooks.useCreate();
  const createSubcategory = catalogApi.subcategories.hooks.useCreate();
  const createProduct = catalogApi.products.hooks.useCreate();

  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(0);
  const [status, setStatus] = React.useState("Ready to seed catalog data.");

  const progress = Math.round((done / TOTAL_ITEMS) * 100);

  const fileCache = React.useRef<Map<string, File>>(new Map());

  const getImageFile = React.useCallback(async (path: string, label: string): Promise<File> => {
    const cacheKey = `${path}::${label}`;
    const cached = fileCache.current.get(cacheKey);
    if (cached) return cached;

    const response = await fetch(path);
    const blob = await response.blob();
    const ext = extFromPath(path);
    const file = new File([blob], `${slugify(label)}.${ext}`, { type: mimeFromExt(ext) });
    fileCache.current.set(cacheKey, file);
    return file;
  }, []);

  const inc = () => setDone((prev) => prev + 1);

  const runSeeder = async () => {
    if (running) return;
    setRunning(true);
    setDone(0);

    try {
      const stamp = Date.now();

      for (let c = 0; c < CATEGORY_COUNT; c += 1) {
        const categorySeed = seedCatalog[c];
        const categoryName = categorySeed.category;
        const categorySlug = slugify(`${categoryName}-${stamp}`);
        setStatus(`Creating category ${c + 1}/${CATEGORY_COUNT}: ${categoryName}`);

        const categoryCover = await getImageFile(imagePool[c % imagePool.length], `${categoryName}-cover`);
        const categoryCreated = await createCategory.mutateAsync({
          title: categoryName,
          slug: categorySlug,
          description: `${categoryName} generated by temporary seeder.`,
          coverImage: categoryCover,
        });

        let categoryId = toId(categoryCreated);
        if (!categoryId) {
          const categoryLookup = await catalogApi.categories.service.list({ search: categorySlug, page: 1, limit: 20 });
          categoryId = findIdBySlug(categoryLookup.data, categorySlug);
        }
        if (!categoryId) throw new Error(`Category id missing for ${categoryName}`);
        inc();

        for (let s = 0; s < SUBCATEGORY_PER_CATEGORY; s += 1) {
          const subSeed = categorySeed.subcategories[s];
          const subcategoryName = subSeed.name;
          const subcategorySlug = slugify(`${categoryName}-${subcategoryName}-${stamp}`);
          setStatus(`Creating subcategory ${s + 1}/${SUBCATEGORY_PER_CATEGORY} under ${categoryName}`);

          const subcategoryCover = await getImageFile(
            imagePool[(c * SUBCATEGORY_PER_CATEGORY + s) % imagePool.length],
            `${subcategoryName}-cover`
          );

          const subcategoryCreated = await createSubcategory.mutateAsync({
            categoryId,
            title: subcategoryName,
            slug: subcategorySlug,
            description: `${subcategoryName} generated by temporary seeder.`,
            coverImage: subcategoryCover,
          });

          let subcategoryId = toId(subcategoryCreated);
          if (!subcategoryId) {
            const subcategoryLookup = await catalogApi.subcategories.service.list({
              search: subcategorySlug,
              page: 1,
              limit: 20,
            });
            subcategoryId = findIdBySlug(subcategoryLookup.data, subcategorySlug);
          }
          if (!subcategoryId) throw new Error(`Subcategory id missing for ${subcategoryName}`);
          inc();

          for (let p = 0; p < PRODUCTS_PER_SUBCATEGORY; p += 1) {
            const productName = subSeed.products[p];
            setStatus(`Creating product ${p + 1}/${PRODUCTS_PER_SUBCATEGORY} in ${subcategoryName}`);

            const coverPath = imagePool[(c * 15 + s * 5 + p) % imagePool.length];
            const hoverPath = imagePool[(c * 15 + s * 5 + p + 1) % imagePool.length];
            const galleryPathA = imagePool[(c * 15 + s * 5 + p + 2) % imagePool.length];
            const galleryPathB = imagePool[(c * 15 + s * 5 + p + 3) % imagePool.length];

            const coverImage = await getImageFile(coverPath, `${productName}-cover`);
            const hoverImage = await getImageFile(hoverPath, `${productName}-hover`);
            const galleryA = await getImageFile(galleryPathA, `${productName}-gallery-a`);
            const galleryB = await getImageFile(galleryPathB, `${productName}-gallery-b`);

            await createProduct.mutateAsync({
              subcategoryId,
              title: productName,
              slug: slugify(`${categoryName}-${subcategoryName}-${productName}-${stamp}`),
              sku: `SEED-${stamp}-${c + 1}${s + 1}${p + 1}`,
              price: String(999 + p * 100),
              weight: String(20 + p),
              productType: "OTHERS",
              descriptionJson: { text: `${productName} generated by temporary seeder.` },
              coverImage,
              hoverImage,
              gallery: [galleryA, galleryB],
            });

            inc();
          }
        }
      }

      setStatus("Seed completed successfully.");
      toast.success("Seeder finished: 5 categories, 15 subcategories, 75 products.");
    } catch (error) {
      setStatus("Seed failed.");
      toast.error(parseApiError(error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <PageLayout title="Temporary Catalog Seeder" subtitle="Creates 5 categories, 3 subcategories each, and 5 products per subcategory using public/KANWEBSITE images.">
      <div className="max-w-[760px] rounded-xl border border-[#e5e5e7] bg-white p-5">
        <div className="mb-3 flex items-center gap-2 text-[14px] text-[#1d1d1f]">
          <Beaker size={16} className="text-[#0071e3]" />
          This is a temporary utility route for local seeding.
        </div>

        <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-[#f0f0f2]">
          <div
            className="h-full rounded-full bg-[#0071e3] transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <div className="mb-4 flex items-center justify-between text-[12px] text-[#6e6e73]">
          <span>{status}</span>
          <span>
            {done}/{TOTAL_ITEMS} ({progress}%)
          </span>
        </div>

        <button
          type="button"
          disabled={running}
          onClick={() => void runSeeder()}
          className="inline-flex h-[34px] items-center gap-2 rounded-full bg-[#0071e3] px-[21px] text-[13px] font-medium text-white transition-colors hover:bg-[#0066cc] disabled:opacity-50"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Beaker size={14} />}
          {running ? "Seeding..." : "Run Temporary Seeder"}
        </button>
      </div>
    </PageLayout>
  );
};
