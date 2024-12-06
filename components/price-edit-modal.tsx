'use client'

import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { FiX } from 'react-icons/fi'
import { Product } from '../types/product'
import { motion, AnimatePresence } from 'framer-motion'
import { PasswordModal } from './PasswordModal'

interface PriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  onUpdateBFPrice: (newBFPrice: number, newInitialPrice: number, product: Product) => void;
}

export function PriceEditModal({ isOpen, onClose, editingProduct, onUpdateBFPrice }: PriceEditModalProps) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [error, setError] = useState('');

  const handlePasswordSubmit = (password: string) => {
    if (password === process.env.NEXT_PUBLIC_AUTH_PASSWORD) {
      setIsAuthenticated(true);
      setIsPasswordModalOpen(false);
      setError('');
    } else {
      setError('Mot de passe incorrect');
    }
  };

  const handleSubmit = () => {
    if (!editingProduct) return;
    
    const parsedPrice = parseFloat(newPrice);
    if (isNaN(parsedPrice)) {
      setError('Prix invalide');
      return;
    }

    onUpdateBFPrice(parsedPrice, parsedPrice, editingProduct);
    handleClose();
  };

  const handleClose = () => {
    onClose();
    // Reset states
    setIsAuthenticated(false);
    setIsPasswordModalOpen(true);
    setNewPrice('');
    setError('');
  };

  if (!isAuthenticated) {
    return (
      <PasswordModal 
        isOpen={isPasswordModalOpen && isOpen}
        onClose={handleClose}
        onSubmit={handlePasswordSubmit}
      />
    );
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <AnimatePresence>
          {isOpen && (
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="fixed left-[50%] top-[50%] z-50 w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg"
              >
                <div className="relative">
                  <Dialog.Title className="text-lg font-bold mb-4">
                    Modifier le prix
                  </Dialog.Title>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Produit:</p>
                      <p className="text-sm">{editingProduct?.['Libellé']}</p>
                      <p className="text-xs text-gray-500">{editingProduct?.['Ref. produit']}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Nouveau prix:</p>
                      <Input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      />
                    </div>
                    <Button 
                      onClick={handleSubmit}
                      className="w-full"
                    >
                      Mettre à jour
                    </Button>
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm mt-2">{error}</p>
                  )}

                  <Dialog.Close asChild>
                    <Button
                      className="absolute right-0 top-0 p-2"
                      variant="ghost"
                      onClick={handleClose}
                    >
                      <FiX className="h-4 w-4" />
                    </Button>
                  </Dialog.Close>
                </div>
              </motion.div>
            </Dialog.Content>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

