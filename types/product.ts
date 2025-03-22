export interface Product {
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
  bf_price?: number;
  prix_initial?: number;
  imageUrl?: string;
  processedName?: string;
  processedCategory?: string;
  processedDimensions?: string;
  imageDetails?: any;
  catalogueItem?: any;
  remise?: number;
}
