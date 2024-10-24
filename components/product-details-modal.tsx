import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from "./ui/button";
import { FiX } from 'react-icons/fi';
import { Spinner } from './spinner';

// Import the Product type from a shared types file instead of stock-finder
import { Product } from '../types/product';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct: Product | null;
  isLoading: boolean;
}

const formatPrice = (num: number): string => {
  return num.toLocaleString('fr-FR');
};

const formatPercentage = (num: number): string => {
  return `-${(num * 100).toFixed(0)}%`;
};

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onClose,
  selectedProduct,
  isLoading,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <AnimatePresence>
          {isOpen && (
            <Dialog.Content 
              className="fixed inset-0 flex items-center justify-center z-[60]" 
              onClick={onClose}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl shadow-2xl w-[90vw] sm:w-[85vw] max-w-[400px] overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <Dialog.Title className="sr-only">Product Details</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Detailed information about the selected product
                </Dialog.Description>
                
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <Spinner size="large" />
                  </div>
                ) : selectedProduct ? (
                  <div className="product-modal-content relative flex-grow flex flex-col overflow-auto custom-scrollbar">
                    {/* Product Name and Dimensions Section */}
                    <div className="bg-blue-600 p-4 rounded-t-2xl">
                      <div className="flex flex-wrap items-center justify-between mb-2">
                        <div className="flex-grow flex items-center space-x-2 mr-8">
                          <motion.h2 
                            className="text-2xl font-bold text-white truncate"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {selectedProduct.processedName?.toUpperCase()}
                          </motion.h2>
                          {selectedProduct.processedDimensions && (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                            >
                              <div className="bg-[#ffed00] py-1 px-2 transform skew-x-[-20deg] shadow-lg">
                                <p className="text-sm font-bold text-black transform skew-x-[20deg] inline-block">
                                  {selectedProduct.processedDimensions.toUpperCase()}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <motion.div 
                        className="flex items-center gap-2 mt-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        <span className="text-sm text-blue-100">
                          {selectedProduct['Ref. produit']?.toUpperCase() || 'N/A'}
                        </span>
                        {selectedProduct.processedCategory && (
                          <span className="inline-block bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {selectedProduct.processedCategory.toUpperCase()}
                          </span>
                        )}
                      </motion.div>
                    </div>

                    {/* Product Image and Prix Promo */}
                    <div className="relative h-64 bg-white">
                      <Image
                        src={selectedProduct.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}
                        alt={selectedProduct['Libellé']}
                        layout="fill"
                        objectFit="contain"
                        className="rounded-t-2xl"
                        quality={75}
                        placeholder="blur"
                        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                      />
                      <motion.div 
                        className="absolute bottom-4 right-4 overflow-visible z-10"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                      >
                        <div className={`py-1 px-4 transform skew-x-[-20deg] shadow-lg ${selectedProduct.bf_price ? 'bg-gray-400' : 'bg-[#ffed00]'}`}>
                          <p className={`text-xl font-bold transform skew-x-[20deg] inline-block ${selectedProduct.bf_price ? 'text-white' : 'text-black'}`}>
                            {formatPrice(selectedProduct['Prix Promo'])} <span className="text-xl">DH</span>
                          </p>
                        </div>
                      </motion.div>
                    </div>

                    {/* Black Friday Section */}
                    {selectedProduct.bf_price && (
                      <div className="bg-cover bg-center text-white p-2 flex items-center justify-between" style={{
                        backgroundImage: `url('/bg.jpg')`,
                        height: '60px',
                      }}>
                        <div className="w-1/3 h-full flex items-center">
                          <Image
                            src="/bf.png"
                            alt="Black Friday"
                            width={100}
                            height={100}
                            objectFit="contain"
                          />
                        </div>
                        <div className="w-2/3 flex items-center justify-end h-full relative">
                          <motion.div 
                            className="overflow-visible z-10 flex items-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                          >
                            <div className="flex items-stretch">
                              <div className="bg-[#FF0000] py-1 px-4 transform skew-x-[-20deg] shadow-lg flex flex-col items-center justify-center">
                                <p className="text-xl font-bold text-white transform skew-x-[20deg] inline-block">
                                  {formatPrice(selectedProduct.bf_price)} DH
                                </p>
                                {selectedProduct.prix_initial && (
                                  <p className="text-xs text-gray-300 line-through transform skew-x-[20deg] -mt-1">
                                    {formatPrice(selectedProduct.prix_initial)} DH
                                  </p>
                                )}
                              </div>
                              {selectedProduct.remise !== undefined && (
                                <div className="bg-yellow-400 text-black text-xs font-bold px-2 transform skew-x-[-20deg] flex items-center ml-[-10px] mr-2">
                                  <span className="transform skew-x-[20deg]">
                                    {formatPercentage(selectedProduct.remise)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    )}

                    {/* Stock Information */}
                    <div className="bg-blue-100 p-3 rounded-xl shadow-lg overflow-hidden mt-4 mx-2 mb-2">
                      <motion.div 
                        className="bg-blue-600 p-2 rounded-lg mb-2 shadow-md"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0, type: "spring" }}
                      >
                        <p className="text-sm font-bold text-blue-100 text-center uppercase">SKE</p>
                        <p className="text-xl font-bold text-white text-center">{selectedProduct['Stock Frimoda']}</p>
                      </motion.div>
                      
                      <div className="flex justify-between items-stretch space-x-2">
                        {[
                          { city: 'Casa', color: 'bg-teal-500' },
                          { city: 'Rabat', color: 'bg-amber-500' },
                          { city: 'Marrakech', color: 'bg-rose-500' },
                          { city: 'Tanger', color: 'bg-indigo-500' }
                        ].map(({ city, color }, index) => {
                          const stockValue = selectedProduct[`Stock ${city}`];
                          const isOutOfStock = stockValue === 0;
                          return (
                            <motion.div 
                              key={city}
                              className={`${color} ${isOutOfStock ? 'opacity-50' : ''} p-2 rounded-lg flex-grow flex flex-col justify-between relative overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: (index + 1) * 0.1, type: "spring" }}
                            >
                              <p className="text-xs font-bold text-white text-center uppercase">{city}</p>
                              <p className="text-xl font-bold text-center text-white uppercase">
                                {typeof stockValue === 'number' ? stockValue : 'N/A'}
                              </p>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                <Dialog.Close asChild>
                  <Button 
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-800 rounded-full transition-colors duration-200"
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                  >
                    <FiX className="h-6 w-6" />
                  </Button>
                </Dialog.Close>
              </motion.div>
            </Dialog.Content>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
