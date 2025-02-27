import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from "./ui/button";
import { FiX, FiDollarSign, FiTag, FiPackage, FiTrendingDown, FiShoppingBag, FiPercent, FiBox } from 'react-icons/fi';
import Image from 'next/image';
import { Product } from '../types/product';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from './spinner';
import { cn } from '../lib/utils';

interface PriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  onUpdateBFPrice: (newBFPrice: number, newInitialPrice: number, updatedProduct: Product) => Promise<void>;
}

const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const fetchProductImage = async (ref: string) => {
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/1mWNxfuTYDho--Z5qCzvBErN2w0ZNBelND6rdzPAyC90/gviz/tq?tqx=out:json`)
    const text = await response.text()
    const data = JSON.parse(text.substr(47).slice(0, -2))
    
    const imageRow = data.table.rows.find((row: { c: Array<{ v: string | null }> }) => row.c[3]?.v === ref)
    return imageRow ? imageRow.c[7]?.v : null // Image URL is in the 8th column (index 7)
  } catch (error) {
    console.error('Error fetching product image:', error)
    return null
  }
}

export const PriceEditModal: React.FC<PriceEditModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  onUpdateBFPrice,
}) => {
  const [newBFPrice, setNewBFPrice] = useState(0);
  const [newInitialPrice, setNewInitialPrice] = useState(0);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const newPriceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && editingProduct) {
      setNewBFPrice(editingProduct['Prix Promo'] || 0);
      setNewInitialPrice(editingProduct['Prix Promo'] || 0);
      setIsImageLoading(true);
      fetchProductImage(editingProduct['Ref. produit']).then((image) => {
        setProductImage(image);
        setIsImageLoading(false);
      });
      
      setTimeout(() => {
        if (newPriceInputRef.current) {
          newPriceInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, editingProduct]);

  const remise = useMemo(() => {
    return ((newInitialPrice - newBFPrice) / newInitialPrice) * 100;
  }, [newInitialPrice, newBFPrice]);

  const handleUpdateBFPrice = async () => {
    if (!editingProduct) return;

    setIsUpdating(true);
    try {
      const updatedFields = {
        product_ref: editingProduct['Ref. produit'],
        product_label: editingProduct['Libellé'],
        old_price: editingProduct['Prix Promo'],
        new_price: newBFPrice
      };

      // Update Dolibarr price
      const response = await fetch('https://phpstack-937973-4763176.cloudwaysapps.com/update_price_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_price',
          ...updatedFields,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update price');
      }

      const updatedProduct = {
        ...editingProduct,
        'Prix Promo': newBFPrice,
      };

      await onUpdateBFPrice(newBFPrice, newInitialPrice, updatedProduct);
      onClose();
    } catch (error) {
      console.error('Error updating price:', error);
      alert(`Error updating price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setter(value === '' ? 0 : parseInt(value, 10));
  };

  if (!editingProduct) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
        <AnimatePresence>
          {isOpen && (
            <Dialog.Content className="fixed inset-0 flex items-center justify-center z-[60]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-[450px] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold truncate">{editingProduct['Libellé']}</h3>
                      <p className="text-xs opacity-80 mt-0.5">{editingProduct['Ref. produit']}</p>
                    </div>
                    <Dialog.Close asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-6 w-6">
                        <FiX className="h-4 w-4" />
                      </Button>
                    </Dialog.Close>
                  </div>
                </div>

                <div className="relative w-full h-[200px]">
                  {isImageLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <Spinner size="large" />
                    </div>
                  ) : (
                    <Image
                      src={productImage || 'https://via.placeholder.com/600x338'}
                      alt={editingProduct['Libellé']}
                      layout="fill"
                      objectFit="cover"
                      className="w-full"
                      priority
                    />
                  )}
                </div>

                <div className="p-2 space-y-2">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <FiPackage className="h-4 w-4 text-blue-700" />
                        <span className="text-sm font-medium text-blue-700">Stock Total</span>
                      </div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-sm font-bold shadow-sm",
                        editingProduct['Total Stock'] === 0
                          ? "bg-red-500 text-white"
                          : "bg-emerald-500 text-white"
                      )}>
                        {editingProduct['Total Stock']}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {['SKE', 'Casa', 'Rabat', 'Marrakech', 'Tanger'].map((store) => {
                        const stockKey = `Stock ${store === 'SKE' ? 'Frimoda' : store}` as keyof Product;
                        const stockValue = editingProduct[stockKey];
                        const isZeroStock = typeof stockValue === 'number' && stockValue === 0;
                        
                        return (
                          <div key={store} 
                            className={cn(
                              "rounded-lg text-center py-1.5 px-2 transition-all duration-200",
                              isZeroStock
                                ? "bg-red-500 text-white shadow-md scale-105"
                                : "bg-white text-blue-700 shadow-sm hover:bg-blue-50"
                            )}
                          >
                            <div className={cn(
                              "text-[10px] mb-0.5",
                              isZeroStock ? "text-white/90" : "text-blue-500"
                            )}>
                              {store}
                            </div>
                            <div className={cn(
                              "text-sm font-bold",
                              isZeroStock ? "text-white" : "text-blue-700"
                            )}>
                              {typeof stockValue === 'number' ? stockValue : 0}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-white/80 mb-1">
                          <div className="flex items-center space-x-1">
                            <FiTag className="h-3 w-3" />
                            <span>Prix Actuel</span>
                          </div>
                        </label>
                        <div className="bg-white/10 rounded-lg px-3 py-2 text-white">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold">
                              {formatNumber(Math.round(parseFloat(editingProduct['Prix Promo'].toString())))}
                            </span>
                            <span className="text-xs opacity-70">DH</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="promoPrice" className="block text-xs font-medium text-white/80 mb-1">
                          <div className="flex items-center space-x-1">
                            <FiTrendingDown className="h-3 w-3" />
                            <span>Nouveau Prix</span>
                          </div>
                        </label>
                        <div className="relative">
                          <input
                            id="promoPrice"
                            ref={newPriceInputRef}
                            type="text"
                            inputMode="numeric"
                            pattern="\d*"
                            value={newBFPrice}
                            onChange={handleInputChange(setNewBFPrice)}
                            className="text-sm font-bold w-full rounded-lg border-0 bg-white/90 focus:bg-white text-gray-900 focus:ring-2 focus:ring-white pl-3 pr-8 py-2"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                            DH
                          </span>
                        </div>
                      </div>
                    </div>
                    {remise > 0 && (
                      <div className="mt-3 bg-white/10 rounded-lg p-2 flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <FiPercent className="h-3 w-3 text-white" />
                          <span className="text-xs text-white">Réduction</span>
                        </div>
                        <span className="text-sm font-bold text-white">-{remise.toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-2 flex justify-end space-x-2">
                  <Button 
                    onClick={onClose}
                    variant="outline"
                    size="sm"
                    className="text-gray-700 border-gray-300 hover:bg-gray-50"
                    disabled={isUpdating}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleUpdateBFPrice}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Spinner size="small" /> : 'Mettre à jour'}
                  </Button>
                </div>
              </motion.div>
            </Dialog.Content>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

