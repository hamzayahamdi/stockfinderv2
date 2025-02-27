import { useState, useCallback } from 'react';

type Product = {
  'Ref. produit': string;
  'Libellé': string;
  'Prix Promo': number;
  'Total Stock': number;
  bf_price?: number;
  prix_initial?: number;
  imageUrl?: string;
};

type PriceHistory = Array<{ old_bf_price: number, new_bf_price: number, changed_at: string }>;

export const useBlackFriday = () => {
  const [selectedBFProduct, setSelectedBFProduct] = useState<Product | null>(null);
  const [bfPriceHistory, setBfPriceHistory] = useState<PriceHistory>([]);

  const handleBFAction = useCallback(async (product: Product) => {
    setSelectedBFProduct(product);
    try {
      const response = await fetch(`https://phpstack-937973-4763176.cloudwaysapps.com/data1.php?action=fetch_bf_history&product_ref=${product['Ref. produit']}`);
      const data = await response.json();
      setBfPriceHistory(data);
    } catch (error) {
      console.error('Error fetching price history:', error);
      setBfPriceHistory([]);
    }
  }, []);

  const handleSaveBFPrice = async (product: Product) => {
    try {
      const response = await fetch('https://phpstack-937973-4763176.cloudwaysapps.com/data1.php?action=update_bf_price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_ref: product['Ref. produit'],
          prix_initial: product.prix_initial,
          bf_price: product.bf_price,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSelectedBFProduct(null);
        return true;
      } else {
        console.error('Error updating Black Friday price:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error updating Black Friday price:', error);
      return false;
    }
  };

  return {
    selectedBFProduct,
    bfPriceHistory,
    handleBFAction,
    handleSaveBFPrice,
    setSelectedBFProduct,
  };
};
