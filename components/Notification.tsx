import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';

interface NotificationProps {
  isVisible: boolean;
  onClose: () => void;
  productLabel: string;
  oldBFPrice: number;
  newBFPrice: number;
}

export const Notification: React.FC<NotificationProps> = ({ isVisible, onClose, productLabel, oldBFPrice, newBFPrice }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 bg-white text-gray-800 px-4 py-3 rounded-md shadow-lg z-50 max-w-xs"
        >
          <div className="flex items-center space-x-2">
            <div className="bg-green-500 rounded-full p-1">
              <FiCheck className="text-white text-sm" />
            </div>
            <span className="text-sm font-medium">Prix Promo Updated</span>
          </div>
          <div className="mt-1 text-xs truncate">{productLabel}</div>
          <div className="mt-1 flex items-center space-x-2">
            <span className="text-gray-500 line-through">{oldBFPrice.toFixed(2)}</span>
            <span className="text-green-600 font-semibold">{newBFPrice.toFixed(2)}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
