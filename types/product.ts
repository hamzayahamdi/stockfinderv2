export type Product = {
  'Ref. produit': string;
  'Libellé': string;
  'Prix Promo': number;
  'Total Stock': number;
  'Stock Frimoda': number;
  'Stock Casa': number;
  'Stock Rabat': number;
  'Stock Marrakech': number;
  'Stock Tanger': number;
  'Catégorie'?: string;
  imageUrl?: string;
  processedName?: string;
  processedCategory?: string;
  processedDimensions?: string;
  imageDetails?: {
    mainSrc: string;
    smallSrc?: string;
    label?: string;
    isCeramic?: boolean;
  };
  catalogueItem?: CatalogueItem;
  prix_initial?: number;
  bf_price?: number;
  remise?: number;
  [key: string]: string | number | boolean | undefined | CatalogueItem | { mainSrc: string; smallSrc?: string; label?: string; isCeramic?: boolean; };
};

type CatalogueItem = {
  ref: string;
  color?: string;
  'image url': string;
  availability: 'yes' | 'no';
};
