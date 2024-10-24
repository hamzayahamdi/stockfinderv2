import React, { useState, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from "./ui/button";
import { FiX, FiDollarSign, FiTag, FiPackage } from 'react-icons/fi';
import Image from 'next/image';
import { Product } from '../types/product';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from './spinner';

interface BlackFridayEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  onUpdateBFPrice: (newBFPrice: number, newInitialPrice: number, updatedProduct: Product) => Promise<void>;
}

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

export const BlackFridayEditModal: React.FC<BlackFridayEditModalProps> = ({
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

  useEffect(() => {
    if (isOpen && editingProduct) {
      setNewBFPrice(editingProduct.bf_price || 0);
      setNewInitialPrice(editingProduct.prix_initial || editingProduct['Prix Promo'] || 0);
      setIsImageLoading(true);
      fetchProductImage(editingProduct['Ref. produit']).then((image) => {
        setProductImage(image);
        setIsImageLoading(false);
      });
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
        prix_initial: newInitialPrice,
        bf_price: newBFPrice
      };

      console.log('Updating product:', updatedFields);

      const response = await fetch('https://phpstack-937973-4763176.cloudwaysapps.com/black_friday_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_bf_price',
          ...updatedFields,
        }),
      });

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update Black Friday price');
      }

      const updatedProduct = {
        ...editingProduct,
        ...updatedFields,
      };

      await onUpdateBFPrice(newBFPrice, newInitialPrice, updatedProduct);
      onClose();
    } catch (error) {
      console.error('Error updating Black Friday price:', error);
      alert(`Error updating Black Friday price: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        <Dialog.Overlay 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" 
          onClick={onClose}
        />
        <AnimatePresence>
          {isOpen && (
            <Dialog.Content 
              className="fixed inset-0 flex items-center justify-center z-[60]"
              onPointerDownOutside={onClose}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[500px] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70 z-10">
                    <FiX className="h-5 w-5" />
                  </Button>
                </Dialog.Close>
                <div className="bg-[#0156B3] text-white p-4">
                  <h3 className="text-lg font-bold">{editingProduct['Libellé']}</h3>
                  <p className="text-sm opacity-80">{editingProduct['Ref. produit']}</p>
                </div>
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}> {/* 16:9 aspect ratio */}
                  {isImageLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <Spinner size="large" />
                    </div>
                  ) : (
                    <Image
                      src={productImage || 'https://via.placeholder.com/600x338'}
                      alt={editingProduct['Libellé']}
                      layout="fill"
                      objectFit="contain"
                    />
                  )}
                  <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-md">
                    <span className="text-sm">Prix Promo: {editingProduct['Prix Promo']}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-100/80 backdrop-blur-md text-gray-800 p-2">
                    <h4 className="text-xs font-semibold mb-1 text-center">STOCK LEVELS</h4>
                    <div className="flex flex-wrap justify-center gap-1 text-xs">
                      <div className="flex items-center space-x-1 bg-blue-500/80 px-1 py-0.5 rounded text-white">
                        <FiPackage className="text-white h-3 w-3" />
                        <span>Total: {editingProduct['Total Stock']}</span>
                      </div>
                      {['SKE', 'Casa', 'Rabat', 'Marrakech', 'Tanger'].map((store) => (
                        <div key={store} className="bg-gray-600/80 px-1 py-0.5 rounded text-white">
                          <span>{store}: {editingProduct[`Stock ${store === 'SKE' ? 'Frimoda' : store}` as keyof Product]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="bg-[url('/bg.jpg')] bg-cover bg-center p-4 rounded-lg shadow-md relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/50"></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <Image
                          src="/bf.png"
                          alt="Black Friday"
                          width={80}
                          height={80}
                        />
                        <div className="bg-[#FF0000] text-white w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                          -{remise.toFixed(0)}%
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="initialPrice" className="block text-sm font-medium text-white">
                            <FiDollarSign className="inline-block mr-1 text-green-500" />
                            Prix Initial
                          </label>
                          <input
                            id="initialPrice"
                            type="text"
                            inputMode="numeric"
                            pattern="\d*"
                            value={newInitialPrice}
                            onChange={handleInputChange(setNewInitialPrice)}
                            className="text-lg font-bold bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 w-full rounded-md px-3 py-2"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="bfPrice" className="block text-sm font-medium text-white">
                            <FiTag className="inline-block mr-1 text-red-500" />
                            Prix Black Friday
                          </label>
                          <input
                            id="bfPrice"
                            type="text"
                            inputMode="numeric"
                            pattern="\d*"
                            value={newBFPrice}
                            onChange={handleInputChange(setNewBFPrice)}
                            className="text-lg font-bold bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 w-full rounded-md px-3 py-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 p-4">
                    <Button 
                      onClick={onClose}
                      variant="outline"
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdateBFPrice}
                      className="bg-red-500 hover:bg-red-600 text-white transition-colors duration-200"
                      disabled={isUpdating}
                    >
                      {isUpdating ? <Spinner size="small" /> : 'Update Black Friday Price'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
