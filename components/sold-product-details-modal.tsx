import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from "./ui/button";
import { FiX } from 'react-icons/fi';
import { Spinner } from './spinner';
import { SoldProduct } from '../types/sold-product';
import { AnimatePresence, motion } from 'framer-motion';

type SoldProductWithDetails = SoldProduct & {
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
};

type SoldProductDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct: SoldProductWithDetails | null;
  isLoading: boolean;
};

const categories = [
  'Salon en L', 'Salon en U', 'Canapé 2 Places', 'Canapé 3 Places', 'Fauteuil', 'Chaise',
  'Table de Salle à Manger', 'Table Basse', 'Meubles TV', "Table d'Appoint", 'Buffet',
  'Console', 'Bibliothèque', 'Lit', 'Table de Chevet', "Ensemble d'Extérieur", 'Transat',
  'Table Extérieur', 'Chaise Extérieur', 'Miroirs', 'Pouf', 'Tableaux', 'Luminaire-Luxalight',
  'Couettes', 'Matelas', 'Oreillers', 'Tapis'
];

// Add this helper function for number formatting
const formatNumber = (num: number) => {
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export function SoldProductDetailsModal({ isOpen, onClose, selectedProduct, isLoading }: SoldProductDetailsModalProps) {
  const [processedProduct, setProcessedProduct] = useState<SoldProductWithDetails | null>(null);

  useEffect(() => {
    const fetchProductImage = async (ref: string) => {
      try {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/1mWNxfuTYDho--Z5qCzvBErN2w0ZNBelND6rdzPAyC90/gviz/tq?tqx=out:json`);
        const text = await response.text();
        const data = JSON.parse(text.substr(47).slice(0, -2));
        
        const imageRow = data.table.rows.find((row: { c: Array<{ v: string | null }> }) => row.c[3]?.v === ref);
        return imageRow ? imageRow.c[7]?.v : null;
      } catch (error) {
        console.error('Error fetching product image:', error);
        return null;
      }
    };

    const processProductDetails = (product: SoldProduct) => {
      const libelle = product.product_label.replace(/,/g, '').trim();
      
      const normalize = (text: string) => {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      };

      const normalizedLibelle = normalize(libelle);
      
      let category = '';
      let productName = libelle;
      let dimensions = '';

      if (normalizedLibelle.includes('canape')) {
        const canapeIndex = normalizedLibelle.indexOf('canape');
        category = 'Canapé';
        productName = libelle.slice(0, canapeIndex).trim();
        dimensions = libelle.slice(canapeIndex + 'canape'.length).trim();
      } else if (normalizedLibelle.includes('miroir')) {
        const miroirIndex = normalizedLibelle.indexOf('miroir');
        category = 'Miroirs';
        productName = libelle.slice(0, miroirIndex).trim();
        dimensions = libelle.slice(miroirIndex + 'miroir'.length).trim();
      } else if (normalizedLibelle.includes('meuble tv') || normalizedLibelle.includes('meubles tv')) {
        const meubleTvIndex = normalizedLibelle.indexOf('meuble');
        category = 'Meubles TV';
        productName = libelle.slice(0, meubleTvIndex).trim();
        dimensions = libelle.slice(meubleTvIndex + 'meuble tv'.length).trim();
      } else {
        for (const cat of categories) {
          const normalizedCategory = normalize(cat);
          if (normalizedLibelle.includes(normalizedCategory)) {
            category = cat;
            const index = normalizedLibelle.indexOf(normalizedCategory);
            productName = libelle.slice(0, index).trim();
            dimensions = libelle.slice(index + cat.length).trim();
            break;
          }
        }
      }

      return { 
        productName: productName.trim(), 
        category: category.trim(), 
        dimensions: dimensions.trim() 
      };
    };

    const loadProductDetails = async () => {
      if (selectedProduct) {
        try {
          const imageUrl = await fetchProductImage(selectedProduct.product_ref);
          const { productName, category, dimensions } = processProductDetails(selectedProduct);
          
          setProcessedProduct({
            ...selectedProduct,
            imageUrl,
            processedName: productName,
            processedCategory: category,
            processedDimensions: dimensions
          });
        } catch (error) {
          console.error('Error loading product details:', error);
        }
      }
    };

    if (selectedProduct) {
      loadProductDetails();
    }
  }, [selectedProduct]);

  if (!selectedProduct && !isLoading) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 opacity-0 data-[state=open]:opacity-100 transition-opacity duration-300 z-50" />
        <AnimatePresence>
          {(isLoading || processedProduct) && (
            <Dialog.Content className="fixed inset-0 flex items-center justify-center z-[60]" onClick={onClose}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-lg shadow-lg w-[85vw] sm:w-[300px] md:w-[400px] lg:w-[450px] h-[75vh] sm:h-[85vh] max-h-[550px] overflow-hidden flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
              >
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Spinner size="large" />
                  </div>
                ) : processedProduct ? (
                  <>
                    {/* Header - Exactly like screenshot */}
                    <div className="bg-[#4169E1] text-white p-4">
                      <div className="flex items-center gap-2">
                        <div className="text-[24px] font-bold tracking-wider">
                          {processedProduct.processedName}
                        </div>
                        <div className="bg-[#FFE500] text-black px-3 py-1 transform -skew-x-12 font-bold text-xs whitespace-nowrap flex items-center h-[24px] shadow-md">
                          {processedProduct.processedDimensions}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="text-sm opacity-80">{processedProduct.product_ref}</div>
                        <div className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                          {processedProduct.processedCategory}
                        </div>
                      </div>
                    </div>

                    {/* Product Image with Value */}
                    <div className="relative flex-grow">
                      <Image
                        src={processedProduct.imageUrl || '/placeholder-image.jpg'}
                        alt={processedProduct.product_label}
                        layout="fill"
                        objectFit="cover"
                        priority
                        className="transition-opacity duration-300"
                      />
                      <div className="absolute bottom-4 right-4 bg-gray-900/80 text-white px-4 py-2 rounded-lg">
                        <div className="text-center">
                          <div className="text-sm font-medium opacity-80">Valeur Total TTC</div>
                          <div className="text-xl font-bold">{formatNumber(processedProduct.sold_value)} DH</div>
                        </div>
                      </div>
                    </div>

                    {/* Quantities Section */}
                    <div className="bg-[#F8FAFC] p-3 space-y-2">
                      {/* Main Total Box */}
                      <div className="bg-[#4169E1] rounded-lg p-3">
                        <div className="text-center text-white">
                          <div className="text-sm font-bold">TOTAL VENDU</div>
                          <div className="text-4xl font-bold mt-1">
                            {formatNumber(processedProduct.total_sold)}
                          </div>
                        </div>
                      </div>

                      {/* Store Grid */}
                      <div className="grid grid-cols-5 gap-1.5">
                        <div className="bg-[#66CDAA] rounded-lg p-2">
                          <div className="text-center text-white">
                            <div className="text-[10px] font-bold">CASA</div>
                            <div className="text-lg font-bold">{formatNumber(processedProduct.sold_casa)}</div>
                          </div>
                        </div>
                        <div className="bg-[#F4A460] rounded-lg p-2">
                          <div className="text-center text-white">
                            <div className="text-[10px] font-bold">RABAT</div>
                            <div className="text-lg font-bold">{formatNumber(processedProduct.sold_rabat)}</div>
                          </div>
                        </div>
                        <div className="bg-[#FF69B4] rounded-lg p-2">
                          <div className="text-center text-white">
                            <div className="text-[10px] font-bold">MARRAKECH</div>
                            <div className="text-lg font-bold">{formatNumber(processedProduct.sold_marrakech)}</div>
                          </div>
                        </div>
                        <div className="bg-[#6A5ACD] rounded-lg p-2">
                          <div className="text-center text-white">
                            <div className="text-[10px] font-bold">TANGER</div>
                            <div className="text-lg font-bold">{formatNumber(processedProduct.sold_tanger)}</div>
                          </div>
                        </div>
                        <div className="bg-gray-200 rounded-lg p-2">
                          <div className="text-center">
                            <div className="text-[10px] font-bold text-gray-700">OUTLET</div>
                            <div className="text-lg font-bold text-gray-700">{formatNumber(processedProduct.sold_outlet)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
                <Dialog.Close asChild>
                  <Button 
                    className="absolute top-2 right-2 bg-white/50 hover:bg-white/70 text-gray-800 z-20" 
                    variant="ghost" 
                    size="icon"
                  >
                    <FiX className="h-4 w-4" />
                  </Button>
                </Dialog.Close>
              </motion.div>
            </Dialog.Content>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
