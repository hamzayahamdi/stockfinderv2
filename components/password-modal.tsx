import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { FiX, FiLock, FiKey } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerification: (success: boolean) => void;
}

const AUTH_TOKEN_KEY = 'sketch_auth_token';
const AUTH_EXPIRY_KEY = 'sketch_auth_expiry';
const AUTH_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onVerification,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check for existing valid authentication when modal opens
    if (isOpen) {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
      
      if (token && expiry) {
        const expiryTime = parseInt(expiry);
        if (Date.now() < expiryTime) {
          // Valid authentication exists
          onVerification(true);
          return;
        } else {
          // Clear expired authentication
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_EXPIRY_KEY);
        }
      }
    }
  }, [isOpen, onVerification]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const masterPassword = process.env.NEXT_PUBLIC_AUTH_PASSWORD;
    
    if (password === masterPassword) {
      // Store authentication token and expiry
      localStorage.setItem(AUTH_TOKEN_KEY, 'authenticated');
      localStorage.setItem(AUTH_EXPIRY_KEY, (Date.now() + AUTH_DURATION).toString());
      
      setError('');
      onVerification(true);
      setPassword('');
    } else {
      setError('Mot de passe incorrect');
      setPassword('');
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay 
          className="fixed inset-0 bg-black/40 backdrop-blur-[3px] z-50"
        />
        <Dialog.Content 
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-[60]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-[300px] overflow-hidden"
          >
            {/* Decorative background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl rounded-lg" />
            <div className="absolute inset-0 bg-white/[0.85] backdrop-blur-xl rounded-lg border border-white/20" />
            
            {/* Content container */}
            <div className="relative rounded-lg overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg shadow-sm">
                    <FiKey className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold bg-gradient-to-br from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    Authentification
                  </span>
                </div>
                <Dialog.Close asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-gray-100/50"
                  >
                    <FiX className="h-4 w-4" />
                  </Button>
                </Dialog.Close>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3">
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 text-sm bg-white/50 border-gray-200/50 rounded-lg pl-9
                             focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30
                             transition-all duration-200"
                    autoFocus
                  />
                  <FiLock className="absolute left-3 top-[11px] h-4 w-4 text-gray-400" />
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-red-500 text-xs mt-1.5 ml-1"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <Button
                  type="submit"
                  className="w-full h-9 text-sm bg-gradient-to-r from-blue-600 to-blue-700 
                           hover:from-blue-700 hover:to-blue-800 text-white rounded-lg
                           transition-all duration-200 shadow-sm hover:shadow
                           hover:scale-[1.02] active:scale-[0.98]"
                >
                  Valider
                </Button>
              </form>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}; 