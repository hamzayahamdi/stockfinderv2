import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { FiX, FiLock } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <AnimatePresence>
          {isOpen && (
            <Dialog.Content 
              className="fixed inset-0 flex items-center justify-center z-[60]"
              onPointerDownOutside={onClose}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="bg-white/80 backdrop-blur-md rounded-2xl p-6 w-[90vw] max-w-[400px] shadow-xl border border-white/20"
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-blue-500 rounded-full p-3">
                    <FiLock className="text-white text-2xl" />
                  </div>
                </div>
                <Dialog.Title className="text-xl font-bold text-center mb-4 text-gray-800">Enter Master Password</Dialog.Title>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200"
                    >
                      Submit
                    </Button>
                  </div>
                </form>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
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
};
