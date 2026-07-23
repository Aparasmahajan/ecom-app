/**
 * Curated real clothing photos served from images.unsplash.com.
 * Same mapping as the web app (static/lib/images.ts) so both platforms show the
 * same catalog. See CLAUDE.md §12.7.
 */
const U = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const IDS: Record<string, string[]> = {
  shirts: [
    '1602810318383-e386cc2a3ccf',
    '1596755094514-f87e34085b2c',
    '1622519407650-3df9883f76a5',
    '1594938298603-c8148c4dae35'
  ],
  tshirts: [
    '1521572163474-6864f9cf17ab',
    '1503341504253-dff4815485f1',
    '1583743814966-8936f5b7be1a',
    '1618354691373-d851c5c3a990',
    '1576566588028-4147f3842f27'
  ],
  jeans: [
    '1542272604-787c3835535d',
    '1541099649105-f69ad21f3246',
    '1582418702059-97ebafb35d09',
    '1604176354204-9268737828e4'
  ],
  hoodies: [
    '1556821840-3a63f95609a7',
    '1620799140408-edc6dcb6d633',
    '1552374196-c4e7ffc6e126',
    '1512327428889-607dbcda2093'
  ],
  coords: [
    '1617137968427-85924c800a22',
    '1594938298603-c8148c4dae35',
    '1490481651871-ab68de25d43d',
    '1490481651871-ab68de25d43d'
  ]
};

export const HERO_IMAGE = U('1490481651871-ab68de25d43d', 1200);

export const chipImage = (categoryId: string): string => {
  const list = IDS[categoryId];
  return list ? U(list[0], 200) : U(IDS.tshirts[0], 200);
};

export const bannerImage = (categoryId: string): string => {
  const list = IDS[categoryId];
  return list ? U(list[0], 900) : U(IDS.tshirts[0], 900);
};

export const productImages = (categoryId: string, index: number): string[] => {
  const list = IDS[categoryId] || IDS.tshirts;
  const start = index % list.length;
  return [0, 1, 2].map(offset => U(list[(start + offset) % list.length]));
};
