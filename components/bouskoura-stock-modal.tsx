import React, { useState, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { FiX, FiSearch, FiFilter, FiChevronDown } from 'react-icons/fi';
import { Input } from './ui/input';
import { Spinner } from './spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { cn } from '../lib/utils';

// Add the predefined categories
const CATEGORIES = [
  'Toutes',
  'Salon en L',
  'Salon en U',
  'Canapé 2 Places',
  'Canapé 3 Places',
  'Fauteuil',
  'Chaise',
  'Table de Salle à Manger',
  'Table Basse',
  'Meubles TV',
  "Table d'Appoint",
  'Buffet',
  'Console',
  'Bibliothèque',
  'Lit',
  'Table de Chevet',
  "Ensemble d'Extérieur",
  'Transat',
  'Table Extérieur',
  'Chaise Extérieur',
  'Miroirs',
  'Pouf',
  'Tableaux',
  'Couettes',
  'Matelas',
  'Oreillers',
  'Tapis',
  'Objets deco'
];

// Add the number formatting function at the top level
const formatNumber = (num: number): string => {
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

interface BouskouraStockItem {
  'Ref. produit': string;
  'Libellé': string;
  'Total Stock': number;
  'Prix Promo': number;
}

interface BouskouraStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BouskouraStockModal({ isOpen, onClose }: BouskouraStockModalProps) {
  const [items, setItems] = useState<BouskouraStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toutes');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://phpstack-937973-4763176.cloudwaysapps.com/data1.php?type=category&query=Bouskoura-Temp');
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const categoriesWithCounts = useMemo(() => {
    // Count items in each category by matching the product name
    const counts = items.reduce((acc, item) => {
      // Find which category matches this item's name
      const matchingCategory = CATEGORIES.find(cat => 
        item['Libellé'].toUpperCase().includes(cat.toUpperCase())
      ) || 'Autres';
      
      acc[matchingCategory] = (acc[matchingCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Create array of all categories with their counts (including 0)
    const categoriesArray = CATEGORIES.map(category => ({
      name: category === 'Toutes' ? category : category,
      count: category === 'Toutes' ? items.length : (counts[category] || 0)
    }));

    // Filter out categories with 0 items (except 'Toutes')
    return categoriesArray.filter(cat => cat.name === 'Toutes' || cat.count > 0);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item['Ref. produit'].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item['Libellé'].toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'Toutes' || 
        item['Libellé'].toUpperCase().includes(selectedCategory.toUpperCase());
      
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, selectedCategory]);

  const stats = useMemo(() => {
    const total = filteredItems.length;
    const inStock = filteredItems.filter(item => item['Total Stock'] > 0).length;
    const outOfStock = total - inStock;
    const totalValue = filteredItems.reduce((sum, item) => 
      sum + (item['Total Stock'] * item['Prix Promo']), 0
    );

    return { total, inStock, outOfStock, totalValue };
  }, [filteredItems]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-[1200px] h-[85vh] bg-white rounded-xl shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex-none p-6 bg-gradient-to-r from-emerald-600 to-emerald-400">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h2 className="text-xl font-bold">Entrepôt Bouskoura</h2>
                <p className="text-sm text-emerald-100">Stock dédié au nouveau magasin</p>
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" className="text-white hover:bg-emerald-500/20">
                  <FiX className="h-5 w-5" />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          {/* Stats Section */}
          <div className="flex-none px-6 py-4 grid grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-blue-600 font-medium">Total Produits</div>
              <div className="text-2xl font-bold text-blue-700">{formatNumber(stats.total)}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm text-green-600 font-medium">En Stock</div>
              <div className="text-2xl font-bold text-green-700">{formatNumber(stats.inStock)}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-sm text-red-600 font-medium">En Rupture</div>
              <div className="text-2xl font-bold text-red-700">{formatNumber(stats.outOfStock)}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-sm text-purple-600 font-medium">Valeur Totale</div>
              <div className="text-2xl font-bold text-purple-700">{formatNumber(stats.totalValue)} DH</div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex-none px-6 py-3 flex gap-4 items-center border-b border-gray-200">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Rechercher par référence ou nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            
            <div className="relative">
              <Button
                variant="outline"
                className={cn(
                  "flex items-center gap-2 min-w-[200px] justify-between",
                  isDropdownOpen && "border-blue-500 ring-2 ring-blue-200"
                )}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="flex items-center gap-2">
                  <FiFilter className="h-4 w-4 text-gray-500" />
                  <span className="truncate">{selectedCategory}</span>
                </div>
                <FiChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isDropdownOpen && "transform rotate-180"
                )} />
              </Button>
              
              {isDropdownOpen && (
                <div className="absolute top-full mt-1 right-0 w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  {categoriesWithCounts.map((category) => (
                    <button
                      key={category.name}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between",
                        selectedCategory === category.name && "bg-blue-50 text-blue-600 font-medium"
                      )}
                      onClick={() => {
                        setSelectedCategory(category.name);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span>{category.name}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        selectedCategory === category.name 
                          ? "bg-blue-100 text-blue-600" 
                          : "bg-gray-100 text-gray-600"
                      )}>
                        {category.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table Section */}
          <div className="flex-1 overflow-auto px-6 py-3">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Spinner size="large" />
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-red-500">
                {error}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Référence</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-right">Prix Promo</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead className="text-right">Valeur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item['Ref. produit']}>
                      <TableCell className="font-medium">{item['Ref. produit']}</TableCell>
                      <TableCell>{item['Libellé']}</TableCell>
                      <TableCell className="text-right">{formatNumber(item['Prix Promo'])} DH</TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-sm font-medium",
                          item['Total Stock'] > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {formatNumber(item['Total Stock'])}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(item['Total Stock'] * item['Prix Promo'])} DH
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 