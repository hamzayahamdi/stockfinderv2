import React, { useState, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Accordion from '@radix-ui/react-accordion';
import { Button } from "./ui/button";
import { FiX, FiClock, FiSearch, FiChevronDown, FiArrowUp, FiArrowDown, FiPlus } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from './spinner';
import Image from 'next/image';

interface PriceChange {
  product_ref: string;
  product_label: string;
  old_bf_price: string | number | null;
  new_bf_price: string | number | null;
  changed_at: string;
}

interface BlackFridayHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const colorPalette = [
  'bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-red-50', 'bg-indigo-50',
  'bg-purple-50', 'bg-pink-50', 'bg-gray-50', 'bg-orange-50', 'bg-teal-50'
];

export const BlackFridayHistoryModal: React.FC<BlackFridayHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openItems, setOpenItems] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchPriceChanges();
    }
  }, [isOpen]);

  const fetchPriceChanges = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('https://phpstack-937973-4763176.cloudwaysapps.com/update_price_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_price_changes',
        }),
      });

      if (!response.ok) {
        throw new Error('Échec de la récupération des changements de prix');
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setPriceChanges(data);
      } else {
        throw new Error('Format de données inattendu');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des changements de prix:', error);
      setError(error instanceof Error ? error.message : 'Une erreur inconnue est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const groupedAndFilteredChanges = useMemo(() => {
    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = priceChanges.filter(change =>
      change.product_ref.toLowerCase().includes(lowercaseSearch) ||
      change.product_label.toLowerCase().includes(lowercaseSearch)
    );

    const grouped = filtered.reduce((acc, change) => {
      const date = new Date(change.changed_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(change);
      return acc;
    }, {} as Record<string, PriceChange[]>);

    // Sort dates in descending order
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [priceChanges, searchTerm]);

  useEffect(() => {
    if (searchTerm) {
      setOpenItems(groupedAndFilteredChanges.map(([date]) => date));
    } else {
      setOpenItems([]);
    }
  }, [searchTerm, groupedAndFilteredChanges]);

  const formatPrice = (price: string | number | null): string => {
    if (price === null || price === undefined) return 'N/A';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? 'N/A' : Math.round(numPrice).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };

  const handleAccordionChange = (value: string) => {
    setOpenItems(prev => 
      prev.includes(value)
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  const isNewProduct = (change: PriceChange): boolean => {
    return change.old_bf_price === null || change.old_bf_price === 'N/A' || change.old_bf_price === '0';
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" 
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
                className="bg-gray-900 rounded-lg shadow-xl w-[95vw] max-w-[1200px] h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gray-800 text-white p-6 shadow-md relative z-10">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center flex-1">
                      <Image
                        src="/bf.png"
                        alt="Black Friday"
                        width={60}
                        height={60}
                        className="mr-4"
                      />
                      <div>
                        <h3 className="text-lg font-bold flex items-center">
                          <FiClock className="mr-2" />
                          Historique des Prix
                        </h3>
                      </div>
                    </div>
                    <div className="relative flex-1 max-w-md">
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                    <Dialog.Close asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700 ml-4">
                        <FiX className="h-6 w-6" />
                      </Button>
                    </Dialog.Close>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-gray-800 p-4">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                      <Spinner size="large" />
                    </div>
                  ) : error ? (
                    <div className="text-red-400 text-center text-sm p-4">{error}</div>
                  ) : groupedAndFilteredChanges.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm p-4">Aucun changement de prix trouvé.</div>
                  ) : (
                    <Accordion.Root 
                      type="multiple" 
                      value={openItems} 
                      onValueChange={setOpenItems}
                      className="space-y-4"
                    >
                      {groupedAndFilteredChanges.map(([date, changes]) => (
                        <Accordion.Item key={date} value={date} className="bg-gray-700 rounded-lg shadow-md overflow-hidden">
                          <Accordion.Trigger 
                            className="flex justify-between items-center w-full p-4 bg-gray-700 hover:bg-gray-600 transition-colors duration-200 focus:outline-none text-white"
                          >
                            <span className="font-medium">{formatDate(date)}</span>
                            <FiChevronDown className={`transform transition-transform duration-200 ${openItems.includes(date) ? 'rotate-180' : ''}`} />
                          </Accordion.Trigger>
                          <Accordion.Content className="p-4 bg-gray-700">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {changes.reduce((acc, change) => {
                                const existingGroup = acc.find(group => group[0].product_ref === change.product_ref);
                                if (existingGroup) {
                                  existingGroup.push(change);
                                } else {
                                  acc.push([change]);
                                }
                                return acc;
                              }, [] as PriceChange[][]).map((group, groupIndex) => (
                                <div key={group[0].product_ref} className="bg-white rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-lg">
                                  <div className={`${colorPalette[groupIndex % colorPalette.length]} p-3 shadow-md`}>
                                    <h4 className="font-medium text-sm text-gray-800 truncate" title={group[0].product_label}>{group[0].product_label}</h4>
                                    <p className="text-xs text-gray-600">Réf: {group[0].product_ref}</p>
                                  </div>
                                  <div className="p-3 space-y-2">
                                    {group.map((change, changeIndex) => (
                                      <div key={changeIndex} className="bg-gray-100 rounded-md p-2 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                            {new Date(change.changed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                          {isNewProduct(change) && (
                                            <span className="text-xs bg-[#FF0000] text-white px-2 py-1 rounded-full flex items-center">
                                              <FiPlus className="mr-1" /> NV.BF
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <div className="text-sm bg-red-100 p-2 rounded flex-1 mr-2">
                                            <p className="text-gray-600 text-center">Ancien prix</p>
                                            <p className="font-medium text-red-600 text-center">{formatPrice(change.old_bf_price)}</p>
                                          </div>
                                          {parseFloat(change.new_bf_price as string) > parseFloat(change.old_bf_price as string) ? (
                                            <FiArrowUp className="text-red-500 mx-2" />
                                          ) : (
                                            <FiArrowDown className="text-green-500 mx-2" />
                                          )}
                                          <div className="text-sm bg-green-100 p-2 rounded flex-1 ml-2">
                                            <p className="text-gray-600 text-center">Nouveau prix</p>
                                            <p className="font-medium text-green-600 text-center">{formatPrice(change.new_bf_price)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Accordion.Content>
                        </Accordion.Item>
                      ))}
                    </Accordion.Root>
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
