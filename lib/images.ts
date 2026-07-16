/**
 * Curated real clothing photos.
 *
 * All URLs point to the Unsplash CDN (images.unsplash.com). We pass
 * ?auto=format&fit=crop&w=<width>&q=80 so Unsplash returns a right-sized
 * WebP/AVIF crop for the caller — no Next Image loader required.
 */
const U = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/* Photo IDs grouped by category. Ordered so we can rotate — product 1 gets
   images[0..2], product 2 gets images[1..3], etc. */
const IDS: Record<string, string[]> = {
  shirts: [
    '1602810318383-e386cc2a3ccf', // white button-up on hanger
    '1596755094514-f87e34085b2c', // denim shirt
    '1622519407650-3df9883f76a5', // beige oversized shirt
    '1594938298603-c8148c4dae35'  // linen shirt look
  ],
  tshirts: [
    '1521572163474-6864f9cf17ab', // man in white tee
    '1503341504253-dff4815485f1', // stack of colorful tees
    '1583743814966-8936f5b7be1a', // black graphic tee
    '1618354691373-d851c5c3a990', // white tee flat lay
    '1576566588028-4147f3842f27'  // printed tee
  ],
  jeans: [
    '1542272604-787c3835535d',    // rolled jeans
    '1541099649105-f69ad21f3246', // blue denim
    '1582418702059-97ebafb35d09', // folded jeans
    '1604176354204-9268737828e4'  // baggy denim
  ],
  hoodies: [
    '1556821840-3a63f95609a7',    // grey hoodie
    '1620799140408-edc6dcb6d633', // streetwear hoodie
    '1552374196-c4e7ffc6e126',    // man in hoodie
    '1512327428889-607dbcda2093'  // hoodie back
  ],
  coords: [
    '1617137968427-85924c800a22', // beige co-ord set
    '1594938298603-c8148c4dae35', // matching outfit
    '1490481651871-ab68de25d43d', // styled fashion look
    '1490481651871-ab68de25d43d'  // fallback
  ]
};

/** Hero banner background (large landscape crop). */
export const HERO_IMAGE = U('1490481651871-ab68de25d43d', 1200);

/** Small circular image used for the home category-chip strip. */
export const chipImage = (categoryId: string): string => {
  const list = IDS[categoryId];
  return list ? U(list[0], 200) : U(IDS.tshirts[0], 200);
};

/** Wide banner image used on the Categories page big cards. */
export const bannerImage = (categoryId: string): string => {
  const list = IDS[categoryId];
  return list ? U(list[0], 900) : U(IDS.tshirts[0], 900);
};

/**
 * Three product images for the Nth product in a category — rotates through
 * that category's photo pool so each product looks distinct.
 */
export const productImages = (categoryId: string, index: number): string[] => {
  const list = IDS[categoryId] || IDS.tshirts;
  const start = index % list.length;
  return [0, 1, 2].map(offset => U(list[(start + offset) % list.length]));
};
