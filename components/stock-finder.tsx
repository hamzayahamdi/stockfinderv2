'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import * as Dialog from '@radix-ui/react-dialog'
import { Analytics } from '@vercel/analytics/react';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  Row,
  getExpandedRowModel,
  CellContext,
} from "@tanstack/react-table"
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import { Spinner } from './spinner'
import { Column } from "@tanstack/react-table"
import { cn } from "../lib/utils"
import { FiX, FiPlus, FiMinus, FiArrowDown, FiMenu, FiSearch, FiDownload, FiLayout, FiEdit, FiPackage, FiDollarSign, FiTag, FiPercent, FiClock, FiPieChart } from 'react-icons/fi'
import Link from 'next/link'
import { LoadingOverlay } from './loading-overlay'
import { useMediaQuery } from 'react-responsive'
import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { ProductDetailsModal } from './product-details-modal';
import { PriceEditModal } from './price-edit-modal';
import { Product } from '../types/product';
import { Notification } from './Notification';
import { PrixPromoHistory } from './prix-promo-history';
import { PasswordModal } from './password-modal';
import { BlackFridayEditModal } from './black-friday-edit-modal';

type Category = {
  name: string;
  catalogue: string | null;
  isAll?: boolean;
};

type GoogleSheetCell = {
  v: string | number | boolean | null;
};

type GoogleSheetRow = {
  c: GoogleSheetCell[];
};

type CatalogueItem = {
  ref: string;
  color?: string;
  'image url': string;
  availability: 'yes' | 'no';
};

const normalizeText = (text: string): string => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const categories: Category[] = [
  { name: 'ALL', catalogue: null, isAll: true },
  { name: 'Salon en L', catalogue: 'tissues' },
  { name: 'Salon en U', catalogue: 'tissues' },
  { name: 'Canapé 2 Places', catalogue: 'tissues' },
  { name: 'Canapé 3 Places', catalogue: 'tissues' },
  { name: 'Fauteuil', catalogue: 'tissues' },
  { name: 'Chaise', catalogue: 'tissues' },
  { name: 'Table de Salle à Manger', catalogue: 'ceramique' },
  { name: 'Table Basse', catalogue: 'ceramique' },
  { name: 'Meubles TV', catalogue: null },
  { name: "Table d'Appoint", catalogue: 'ceramique' },
  { name: 'Buffet', catalogue: 'ceramique' },
  { name: 'Console', catalogue: 'ceramique' },
  { name: 'Bibliothèque', catalogue: null },
  { name: 'Lit', catalogue: 'tissues' },
  { name: 'Table de Chevet', catalogue: null },
  { name: "Ensemble d'Extérieur", catalogue: 'tissues' },
  { name: 'Transat', catalogue: null },
  { name: 'Table Extérieur', catalogue: null },
  { name: 'Chaise Extérieur', catalogue: null },
  { name: 'Miroirs', catalogue: null },
  { name: 'Pouf', catalogue: null },
  { name: 'Tableaux', catalogue: null },
  { name: 'Couettes', catalogue: null },
  { name: 'Matelas', catalogue: null },
  { name: 'Oreillers', catalogue: null },
  { name: 'Tapis', catalogue: null },
  { name: 'Objets deco', catalogue: null },
]

const PulsingCell = ({ value }: { value: number | undefined }) => {
  const isZeroValue = value === 0;
  return (
    <div className={`w-full h-full flex items-center justify-center ${isZeroValue ? 'bg-red-500' : ''}`}>
      <span className={`font-bold uppercase ${isZeroValue ? 'text-white' : ''}`}>{value ?? 0}</span>
    </div>
  );
};

const formatNumber = (num: number) => {
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Add the formatPercentage function
const formatPercentage = (decimal: number): string => {
  const percentage = Math.round(decimal * 100);
  return `-${percentage}%`;
};

const pulse = keyframes`
  0% {
    transform: scale(1);
    filter: drop-shadow(0 0 0px rgba(255, 255, 255, 0.7));
  }
  50% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.9));
  }
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 0px rgba(255, 255, 255, 0.7));
  }
`;

const PulsingImage = styled(Image)`
  @keyframes pulse {
    0% {
      transform: scale(1);
      filter: drop-shadow(0 0 0px rgba(255, 255, 255, 0.7));
    }
    50% {
      transform: scale(1.05);
      filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.9));
    }
    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 0px rgba(255, 255, 255, 0.7));
    }
  }
  animation: pulse 2s infinite ease-in-out;
`;

// Add a type to distinguish which price is being edited
type EditType = 'promo' | 'pack';

// Update the desktopColumns function
const desktopColumns = (
  setEditingProduct: React.Dispatch<React.SetStateAction<Product | null>>,
  setIsEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  handleEditClick: (product: Product, e: React.MouseEvent, editType: EditType) => void
): Array<ColumnDef<Product> & { accessorKey: keyof Product }> => [
  {
    accessorKey: "Ref. produit",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-slate-100 text-slate-700 font-bold w-full h-full text-left justify-start"
        >
          Réf.
          <FiArrowDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="flex items-center justify-between w-full">
        <span className="font-medium">{row.original['Ref. produit']}</span>
      </div>
    ),
  },
  {
    accessorKey: "Libellé",
    header: "Libellé",
    cell: ({ row }) => (
      <div className="flex items-center">
        <span className="font-medium">{row.original['Libellé']}</span>
      </div>
    ),
  },
  {
    accessorKey: "Total Stock",
    header: () => <div className="text-center w-full">STOCK TOTAL</div>,
    cell: ({ row }) => <PulsingCell value={row.original['Total Stock']} />,
    meta: { 
      className: (value: number) => 
        value === 0 ? "bg-red-500 text-white p-0" : "bg-blue-50 p-0", 
      headerClassName: "bg-blue-100" 
    },
  },
  {
    accessorKey: "Prix Promo",
    header: () => <div className="text-center w-full">PRIX PROMO</div>,
    cell: ({ row }) => {
      const promoPrice = row.original['Prix Promo']
      const amount = promoPrice ? parseFloat(promoPrice.toString()) : 0
      return (
        <div className="w-full h-full flex items-center justify-center relative">
          <div className="font-bold uppercase">
            {formatNumber(Math.round(amount))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleEditClick(row.original, e, 'promo')}
            className="absolute right-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1"
          >
            <FiEdit className="h-3 w-3" />
          </Button>
        </div>
      )
    },
    meta: { className: "bg-green-50 p-0", headerClassName: "bg-green-100" },
  },
  {
    accessorKey: "bf_price" as keyof Product,
    header: () => <div className="text-center w-full text-white">PRIX PACK</div>,
    cell: ({ row }) => {
      const bfPrice = row.original.bf_price || 0;
      
      return (
        <div className="w-full h-full flex items-center justify-center relative">
          <div className="font-bold uppercase text-white">
            {formatNumber(Math.round(bfPrice))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleEditClick(row.original, e, 'pack')}
            className="absolute right-0 text-white hover:text-white hover:bg-emerald-600/50 p-1"
          >
            <FiEdit className="h-3 w-3" />
          </Button>
        </div>
      );
    },
    meta: { 
      className: "p-0 bg-emerald-500", 
      headerClassName: "bg-emerald-600" 
    },
  },
  {
    accessorKey: "Stock Frimoda",
    header: () => <div className="text-center w-full">STOCK SKE</div>,
    cell: ({ row }) => <PulsingCell value={row.original['Stock Frimoda']} />,
    meta: { 
      className: (value: number) => 
        value === 0 ? "bg-red-500 text-white p-0" : "p-0" 
    },
  },
  {
    accessorKey: "Stock Casa",
    header: () => <div className="text-center w-full">Stock Casa</div>,
    cell: ({ row }) => <PulsingCell value={row.original['Stock Casa']} />,
    meta: { 
      className: (value: number) => 
        value === 0 ? "bg-red-500 text-white p-0" : "p-0" 
    },
  },
  {
    accessorKey: "Stock Rabat",
    header: () => <div className="text-center w-full">Stock Rabat</div>,
    cell: ({ row }) => <PulsingCell value={row.original['Stock Rabat']} />,
    meta: { 
      className: (value: number) => 
        value === 0 ? "bg-red-500 text-white p-0" : "p-0" 
    },
  },
  {
    accessorKey: "Stock Marrakech",
    header: () => <div className="text-center w-full">Stock Marrakech</div>,
    cell: ({ row }) => <PulsingCell value={row.original['Stock Marrakech']} />,
    meta: { 
      className: (value: number) => 
        value === 0 ? "bg-red-500 text-white p-0" : "p-0" 
    },
  },
  {
    accessorKey: "Stock Tanger",
    header: () => <div className="text-center w-full">Stock Tanger</div>,
    cell: ({ row }) => <PulsingCell value={row.original['Stock Tanger']} />,
    meta: { 
      className: (value: number) => 
        value === 0 ? "bg-red-500 text-white p-0" : "p-0" 
    },
  },
]


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

const getProductImage = (product: Product, categoryObj: typeof categories[0] | undefined): { mainSrc: string; smallSrc?: string; label?: string; isCeramic?: boolean } => {
  const mainSrc = product.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image';
  
  if (categoryObj?.name === 'Salon en L' && (product['Ref. produit'].endsWith('-D') || product['Ref. produit'].endsWith('-G'))) {
    const baseImageUrl = 'https://sketch-design.ma/wp-content/uploads/2024/10/Layer-0.png';
    const label = product['Ref. produit'].endsWith('-D') ? 'Droitier' : 'Gauchier';
    return { mainSrc, smallSrc: baseImageUrl, label };
  } else if (['Table Basse', 'Table de Salle à Manger', 'Console', 'Buffet'].includes(categoryObj?.name || '')) {
    // Only set isCeramic for sub-products
    return { mainSrc, isCeramic: product['Ref. produit'].includes('-') };
  }
  
  return { mainSrc };
};

// Comment out or remove CATEGORIES_WITHOUT_PACK
/*
const CATEGORIES_WITHOUT_PACK = [
  'OREILLERS',
  'COUETTES',
  'LIMINAIRE-LUXALIGHT',
  'TABLEAUX',
  'POUF',
  'TRANSAT',
  'BIBLIOTHÉQUE',
  'CONSOLE',
  'BUFFET',
  "TABLE D'APPOINT",
  'MEUBLES TV',
  'FAUTEUIL',
  'MIROIRS'
].map(cat => cat.toUpperCase());
*/

// Comment out or remove EXCLUDED_CATEGORIES
/*
const EXCLUDED_CATEGORIES = [
  'BIBLIOTHEQUE',
  'BIBLIOTHÈQUE',
  'BIBLIOTHÉQUE',
  'LUMINAIRE-LUXALIGHT',
  'LUMINAIRE-LUXALIGHT',
  'OREILLERS',
  'COUETTES',
  'TABLEAUX',
  'POUF',
  'TRANSAT',
  'CONSOLE',
  'BUFFET',
  'TABLE D\'APPOINT',
  'TABLE APPOINT',
  'MEUBLES TV',
  'FAUTEUIL',
  'MIROIRS'
];
*/

// Update the isPackExcluded function to always return false
const isPackExcluded = (category: string | undefined): boolean => {
  return false; // Now all categories can have pack prices
};

interface StoreStats {
  qty: number;
  value: number;
  uniqueProducts: number;
  avgValue: number;
  percentageOfTotal: number;
  inStock: number;
  outOfStock: number;
  inStockPercentage: number;
}

interface StoreStatCardProps {
  title: string;
  qty: number;
  value: number;
  inStock: number;
  outOfStock: number;
  uniqueProducts: number;
  percentageOfTotal?: number;
  className?: string;
}

const StoreStatCard = ({
  title,
  qty,
  value,
  inStock,
  outOfStock,
  uniqueProducts,
  percentageOfTotal,
  className
}: StoreStatCardProps) => {
  return (
    <div className={cn("p-3 rounded-lg", className)}>
      <h3 className="text-[10px] font-bold mb-2">{title}</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[9px] opacity-80">QUANTITÉ</span>
          <span className="text-[11px] font-bold">{formatNumber(qty)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] opacity-80">VALEUR DE STOCK</span>
          <span className="text-[11px] font-bold">{formatNumber(value)} DH</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] opacity-80">PRODUITS UNIQUES</span>
          <span className="text-[11px] font-bold">{formatNumber(uniqueProducts)}</span>
        </div>
        {percentageOfTotal !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-[9px] opacity-80">% DU TOTAL</span>
            <span className="text-[11px] font-bold">{formatPercentage(percentageOfTotal)}%</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-[9px] opacity-80">EN STOCK</span>
          <span className="text-[11px] font-bold">{formatNumber(inStock)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] opacity-80">EN RUPTURE</span>
          <span className="text-[11px] font-bold">{formatNumber(outOfStock)}</span>
        </div>
      </div>
    </div>
  );
};

interface StoreStatsMap {
  ske: StoreStats;
  casa: StoreStats;
  rabat: StoreStats;
  marrakech: StoreStats;
  tanger: StoreStats;
  total: Omit<StoreStats, 'percentageOfTotal'>;
}

interface CategoryCount {
  [key: string]: number;
}

export function StockFinder() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pendingEditProduct, setPendingEditProduct] = useState<Product | null>(null);
  const [pendingEditType, setPendingEditType] = useState<string>('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Salon en L');
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [inStockCount, setInStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isCatalogueModalLoading, setIsCatalogueModalLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatalogueVisible, setIsCatalogueVisible] = useState(false);
  const [catalogueSearchTerm, setCatalogueSearchTerm] = useState('');
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);
  const [openCatalogueItem, setOpenCatalogueItem] = useState<CatalogueItem | null>(null);
  const [catalogueItemsFetched, setCatalogueItemsFetched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [blackFridayPrices, setBlackFridayPrices] = useState<Record<string, { prix_initial: number; bf_price: number }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // Refs
  const sidebarRef = useRef<HTMLDivElement>(null);
  const productNameRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleEditClick = (product: Product, e: React.MouseEvent, editType: EditType) => {
    e.stopPropagation();
    setPendingEditProduct(product);
    setIsPasswordModalOpen(true);
    setPendingEditType(editType);
  };

  const isMobile = useMediaQuery({ maxWidth: 768 });

  // Update the mobileColumns definition in the StockFinder component
  const mobileColumns = useMemo(() => [
    {
      accessorKey: "Libellé" as keyof Product,
      header: "Produit",
      cell: ({ row }: { row: { original: Product } }) => (
        <div className="flex items-center space-x-2">
          <div className="flex flex-col flex-grow min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-xs truncate max-w-[75%]" title={row.original['Libellé']}>
                {row.original['Libellé']}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick(row.original, e, 'promo');
                }}
                className="flex-shrink-0 h-8 w-8 p-0 hover:bg-blue-50 text-blue-600"
              >
                <FiEdit className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-[10px] text-gray-500 truncate" title={row.original['Ref. produit']}>
              {row.original['Ref. produit']}
            </span>
          </div>
        </div>
      ),
      className: "w-auto pr-2 pl-2",
    },
    {
      accessorKey: "Total Stock" as keyof Product,
      header: "Stock",
      cell: ({ row }: { row: { original: Product } }) => <PulsingCell value={row.original['Total Stock']} />,
      className: "text-center w-[60px] bg-blue-50",
    }
  ], [handleEditClick]);

  // Move the columns definition inside the component
  const columns = useMemo(() => {
    const baseColumns = isMobile ? mobileColumns : desktopColumns(setEditingProduct, setIsEditModalOpen, handleEditClick);
    
    return baseColumns.filter(column => {
      if (column.accessorKey === 'bf_price') {
        return !isPackExcluded(selectedCategory);
      }
      return true;
    });
  }, [isMobile, selectedCategory, setEditingProduct, setIsEditModalOpen, handleEditClick]);

  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationData, setNotificationData] = useState({
    productLabel: '',
    oldBFPrice: 0,
    newBFPrice: 0
  });

  const handleUpdateBFPrice = async (newBFPrice: number, newInitialPrice: number, updatedProduct: Product) => {
    try {
      // ... existing update logic ...

      // After successful update
      setAllProducts(prevProducts =>
        prevProducts.map(product =>
          product['Ref. produit'] === updatedProduct['Ref. produit']
            ? updatedProduct
            : product
        )
      );
      setFilteredProducts(prevProducts =>
        prevProducts.map(product =>
          product['Ref. produit'] === updatedProduct['Ref. produit']
            ? updatedProduct
            : product
        )
      );

      // Show notification
      setNotificationData({
        productLabel: updatedProduct['Libellé'],
        oldBFPrice: editingProduct?.bf_price || 0,
        newBFPrice: newBFPrice
      });
      setNotificationVisible(true);
    } catch (error) {
      console.error('Error updating Black Friday price:', error);
      alert(`Error updating Black Friday price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Add this helper function to clean and parse number strings
  const parseNumberString = (str: string): number => {
    // Remove any spaces and replace commas with dots for decimals
    const cleanedStr = str.replace(/\s+/g, '').replace(',', '.');
    return parseFloat(cleanedStr);
  };

  // Update the fetchBlackFridayPrices function
  const fetchBlackFridayPrices = async () => {
    try {
      const response = await fetch('https://phpstack-937973-4763176.cloudwaysapps.com/data1.php?action=fetch_bf_prices');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (Array.isArray(data)) {
        const prices: Record<string, { prix_initial: number; bf_price: number }> = {};
        data.forEach((item: any) => {
          prices[item.product_ref] = {
            prix_initial: parseFloat(item.prix_initial),
            bf_price: parseFloat(item.bf_price),
          };
        });
        setBlackFridayPrices(prices);
      } else if (data.error) {
        console.error('API Error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching Black Friday prices:', error);
    }
  };

  // Update the fetchProducts function
  const fetchAllProducts = async () => {
    const url = 'https://phpstack-937973-4763176.cloudwaysapps.com/data1.php?type=category';
    const allProducts: any[] = [];
    const regularCategories = categories.filter(cat => !cat.isAll);
    
    const fetchPromises = regularCategories.map(async (category) => {
      const categoryUrl = `${url}&query=${encodeURIComponent(category.name)}`;
      try {
        const response = await fetch(categoryUrl);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            return data;
          }
        }
      } catch (error) {
        console.error(`Error fetching ${category.name}:`, error);
      }
      return [];
    });

    const results = await Promise.all(fetchPromises);
    results.forEach(data => allProducts.push(...data));

    // Remove duplicates based on 'Ref. produit'
    return Array.from(new Map(
      allProducts.map(item => [item['Ref. produit'], item])
    ).values());
  };

  const fetchProducts = async (type: 'category' | 'search', query: string) => {
    if (type === 'category') setIsLoading(true);
    try {
      let data;
      
      if (type === 'category' && query === 'ALL') {
        data = await fetchAllProducts();
      } else {
        const url = `https://phpstack-937973-4763176.cloudwaysapps.com/data1.php?type=${type}&query=${
          type === 'search' ? encodeURIComponent(normalizeText(query)) : encodeURIComponent(query)
        }`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        data = await response.json();
      }
      
      console.log('Received data:', data);
      if (Array.isArray(data)) {
        const transformedData = data.map(item => ({
          ...item,
          'Ref. produit': item['Ref. produit'] || item['ref'] || item['Ref produit'] || '',
          prix_initial: parseFloat(item.prix_initial) || undefined,
          bf_price: parseFloat(item.bf_price) || undefined,
        }));

        setAllProducts(transformedData);
        setFilteredProducts(transformedData);
      } else if (data.error) {
        console.error('API Error:', data.error);
        setAllProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setAllProducts([]);
      setFilteredProducts([]);
    } finally {
      if (type === 'category') setIsLoading(false);
    }
  };

  // Update the useEffect hook that handles search term changes
  // Initial load effect
  useEffect(() => {
    if (isInitialLoad) {
      fetchProducts('category', 'Salon en L');
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  useEffect(() => {
    if (searchTerm && searchTerm.length >= 3) {
      fetchProducts('search', searchTerm);
    } else if (searchTerm.length === 0) {
      fetchProducts('category', selectedCategory);
    }
    setCatalogueItems([]);
    setCatalogueItemsFetched({});
  }, [searchTerm, selectedCategory]);

  // Remove the separate call to fetchBlackFridayPrices in the useEffect hook,
  // as the Black Friday prices are now included in the main product data

  // Update the handleProductClick function
  const handleProductClick = async (product: Product) => {
    setSelectedProduct(null); // Reset the selected product
    setIsModalOpen(true);
    setIsModalLoading(true);
    try {
      const { productName, category, dimensions } = processProductDetails(product);
      const imageUrl = await fetchProductImage(product['Ref. produit']);
      const imageDetails = getProductImage(product, categories.find(cat => cat.name === category));
      
      const remise = product.prix_initial && product.bf_price
        ? (product.prix_initial - product.bf_price) / product.prix_initial
        : undefined;

      setSelectedProduct({ 
        ...product, 
        processedName: productName, 
        processedCategory: category, 
        processedDimensions: dimensions,
        imageUrl: imageUrl || undefined,
        imageDetails,
        remise,
      });
    } catch (error) {
      console.error('Error setting selected product:', error);
    } finally {
      setIsModalLoading(false);
    }
  };

  // Update the handleSearchChange function
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length === 0) {
      fetchProducts('category', selectedCategory);
    }
  };

  // Update the handleCategorySelect function
  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSearchTerm(''); // Clear the search term
    fetchProducts('category', categoryName); // Fetch products for the selected category
    setSidebarOpen(false); // Close the sidebar on mobile after selection
  };

  // Update the useEffect hook for initial load
  useEffect(() => {
    if (isInitialLoad) {
      fetchProducts('category', 'Salon en L');
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [filteredProducts]);

  const renderCell = useCallback((info: CellContext<Product, unknown>) => {
    if (!info || !info.column.columnDef.cell) {
      return null;
    }
    return typeof info.column.columnDef.cell === 'function'
      ? flexRender(info.column.columnDef.cell, info)
      : null;
  }, []);

  const table = useReactTable({
    data: filteredProducts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredProducts)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products")
    XLSX.writeFile(workbook, "stock_finder_export.xlsx")
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setSidebarOpen(false)
      }
    }

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [sidebarOpen])

  const selectedCategoryObj = categories.find(cat => cat.name === selectedCategory)

  const fetchCatalogueData = useCallback(async (catalogue: string | null) => {
    if (!catalogue || catalogueItemsFetched[catalogue]) return;

    const sheetId = catalogue === 'tissues' 
      ? '1J9-7o_xOC2g-aLJfBdYru5qMh4UbOztgWSdjaeRtnX8'
      : '1VJs3bTDNFpdw88j5XYXxbiakzT2r5yuu4yRi7FjozSQ';
    const isTissue = catalogue === 'tissues';

    try {
      setIsCatalogueModalLoading(true);
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`);
      const text = await response.text();
      const jsonText = text.substr(47).slice(0, -2);
      const data: any = JSON.parse(jsonText);
      
      const items: CatalogueItem[] = data.table.rows.slice(1).map((row: GoogleSheetRow) => {
        if (isTissue) {
          return {
            ref: row.c[0]?.v?.toString() || '',
            'image url': row.c[1]?.v?.toString() || '',
            availability: row.c[2]?.v === 'yes' ? 'yes' : 'no'
          }
        } else {
          return {
            ref: row.c[0]?.v?.toString() || '',
            color: row.c[1]?.v?.toString() || '',
            'image url': row.c[2]?.v?.toString() || '',
            availability: row.c[3]?.v === 'yes' ? 'yes' : 'no'
          }
        }
      });
      
      setCatalogueItems(items);
      setCatalogueItemsFetched(prev => ({ ...prev, [catalogue]: true }));
    } catch (error) {
      console.error('Error fetching catalogue data:', error);
    } finally {
      setIsCatalogueModalLoading(false);
    }
  }, [catalogueItemsFetched]);

  useEffect(() => {
    if (selectedCategoryObj?.catalogue) {
      fetchCatalogueData(selectedCategoryObj.catalogue);
    }
  }, [selectedCategory, fetchCatalogueData, selectedCategoryObj]);

  const filteredCatalogueItems = catalogueItems.filter(item => 
    item.ref.toLowerCase().includes(catalogueSearchTerm.toLowerCase()) ||
    (item.color && item.color.toLowerCase().includes(catalogueSearchTerm.toLowerCase()))
  );

  type CatalogueItemProps = {
    item: CatalogueItem;
    onClick: () => void;
  };

  const CatalogueItemComponent: React.FC<CatalogueItemProps> = ({ item, onClick }) => {
    const handleClick = () => {
      setIsCatalogueModalLoading(true);
      onClick();
      setTimeout(() => setIsCatalogueModalLoading(false), 100);
    };

    return (
      <div
        className="group relative w-20 h-20 flex-shrink-0 cursor-pointer overflow-hidden rounded-sm shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105"
        onClick={handleClick}
      >
        <Image
          src={item['image url']}
          alt={item.ref}
          layout="fill"
          objectFit="cover"
          className="transition-opacity duration-300 group-hover:opacity-80"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-1">
          <p className="text-[9px] font-medium text-white truncate">
            {item.color || item.ref}
          </p>
        </div>
        <div className="absolute top-1 right-1">
          <span className={`text-[7px] font-medium px-1 py-0.5 rounded-sm shadow whitespace-nowrap ${
            item.availability === 'yes' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {item.availability === 'yes' ? 'EN STOCK' : 'ÉPUISÉ'}
          </span>
        </div>
      </div>
    );
  };

  const processProductDetails = (product: Product) => {
    const libelle = product['Libellé'].replace(/,/g, '').trim();
    
    const normalize = (text: string) => {
      return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const normalizedLibelle = normalize(libelle);
    
    let category = '';
    let productName = libelle;
    let dimensions = '';

    // Special handling for common categories
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
    } else if (normalizedLibelle.includes('table') && (normalizedLibelle.includes('salle') || normalizedLibelle.includes('manger'))) {
      category = 'Table de Salle à Manger';
      // Find the full phrase in the original text to preserve accents
      const fullPhrase = 'table de salle a manger';
      const phraseIndex = normalizedLibelle.indexOf(fullPhrase);
      if (phraseIndex !== -1) {
        productName = libelle.slice(0, phraseIndex).trim();
        dimensions = libelle.slice(phraseIndex + fullPhrase.length).trim();
      } else {
        // Fallback to just finding 'table'
        const tableIndex = normalizedLibelle.indexOf('table');
        productName = libelle.slice(0, tableIndex).trim();
        // Find where the dimensions start by looking for numbers
        const dimensionMatch = libelle.slice(tableIndex).match(/\d/);
        if (dimensionMatch?.index !== undefined) {
          dimensions = libelle.slice(tableIndex + dimensionMatch.index).trim();
        } else {
          dimensions = '';
        }
      }
    } else {
      // Check for other categories
      for (const cat of categories) {
        const normalizedCategory = normalize(cat.name);
        if (normalizedLibelle.includes(normalizedCategory)) {
          category = cat.name;
          const index = normalizedLibelle.indexOf(normalizedCategory);
          productName = libelle.slice(0, index).trim();
          dimensions = libelle.slice(index + cat.name.length).trim();
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

  const findMatchingCatalogueItem = (productRef: string, catalogueItems: CatalogueItem[]): CatalogueItem | undefined => {
    const lowercaseProductRef = productRef.toLowerCase();
    return catalogueItems.find((item) => 
      lowercaseProductRef.includes(item.ref.toLowerCase())
    );
  };

  const setSelectedProductWithImage = async (product: Product | null) => {
    if (product) {
      setIsModalOpen(true);
      setIsModalLoading(true);
      try {
        const { productName, category, dimensions } = processProductDetails(product);
        const imageUrl = await fetchProductImage(product['Ref. produit']);
        const imageDetails = getProductImage(product, selectedCategoryObj);
        
        if (selectedCategoryObj?.catalogue) {
          await fetchCatalogueData(selectedCategoryObj.catalogue);
        }
        const matchingCatalogueItem = findMatchingCatalogueItem(product['Ref. produit'], catalogueItems);
        
        setSelectedProduct({ 
          ...product, 
          processedName: productName, 
          processedCategory: category, 
          processedDimensions: dimensions,
          imageUrl: imageUrl || undefined,
          imageDetails,
          catalogueItem: matchingCatalogueItem
        });
      } catch (error) {
        console.error('Error setting selected product:', error);
      } finally {
        setIsModalLoading(false);
      }
    } else {
      setSelectedProduct(null);
      setIsModalOpen(false);
    }
  };

  useEffect(() => {
    const availableCount = catalogueItems.filter(item => item.availability === 'yes').length;
    console.log('Available items:', availableCount);
  }, [catalogueItems]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleCloseCatalogueModal = () => {
    setOpenCatalogueItem(null);
    setIsCatalogueModalLoading(false);
  };

  function hasAccessorKey<T>(column: ColumnDef<T>): column is ColumnDef<T> & { accessorKey: keyof T } {
    return 'accessorKey' in column;
  }

  const updateCategoryCounts = useCallback((products: Product[]) => {
    const counts: Record<string, number> = {};
    products.forEach(product => {
      const category = product['Catégorie'] || 'Uncategorized';
      counts[category] = (counts[category] || 0) + 1;
    });
    setCategoryCounts(counts);
  }, []);

  useEffect(() => {
    updateCategoryCounts(allProducts);
  }, [allProducts, updateCategoryCounts]);

  useEffect(() => {
    const inStock = filteredProducts.filter(product => product['Total Stock'] > 0).length;
    const outOfStock = filteredProducts.filter(product => product['Total Stock'] <= 0).length;
    const total = filteredProducts.length;

    setInStockCount(inStock);
    setOutOfStockCount(outOfStock);
    setTotalProductCount(total);
  }, [filteredProducts]);

  // Calculate store statistics

const calculateStoreStats = useMemo<StoreStatsMap>(() => {
    const stats: StoreStatsMap = {
      ske: { qty: 0, value: 0, uniqueProducts: 0, avgValue: 0, percentageOfTotal: 0, inStock: 0, outOfStock: 0, inStockPercentage: 0 },
      casa: { qty: 0, value: 0, uniqueProducts: 0, avgValue: 0, percentageOfTotal: 0, inStock: 0, outOfStock: 0, inStockPercentage: 0 },
      rabat: { qty: 0, value: 0, uniqueProducts: 0, avgValue: 0, percentageOfTotal: 0, inStock: 0, outOfStock: 0, inStockPercentage: 0 },
      marrakech: { qty: 0, value: 0, uniqueProducts: 0, avgValue: 0, percentageOfTotal: 0, inStock: 0, outOfStock: 0, inStockPercentage: 0 },
      tanger: { qty: 0, value: 0, uniqueProducts: 0, avgValue: 0, percentageOfTotal: 0, inStock: 0, outOfStock: 0, inStockPercentage: 0 },
      total: { qty: 0, value: 0, uniqueProducts: 0, avgValue: 0, inStock: 0, outOfStock: 0, inStockPercentage: 0 }
    };

    // First pass: Calculate quantities and values
    const uniqueProductsByStore = {
      ske: new Set<string>(),
      casa: new Set<string>(),
      rabat: new Set<string>(),
      marrakech: new Set<string>(),
      tanger: new Set<string>()
    };

    filteredProducts.forEach(product => {
      const price = product['Prix Promo'] || product.prix_initial || 0;
      const ref = product['Ref. produit'];
      
      // SKE (Frimoda)
      if (product['Stock Frimoda'] >= 0) {
        stats.ske.qty += product['Stock Frimoda'];
        stats.ske.value += Math.round(product['Stock Frimoda'] * price);
        uniqueProductsByStore.ske.add(ref);
      }
      
      // Casa
      if (product['Stock Casa'] >= 0) {
        stats.casa.qty += product['Stock Casa'];
        stats.casa.value += Math.round(product['Stock Casa'] * price);
        uniqueProductsByStore.casa.add(ref);
      }
      
      // Rabat
      if (product['Stock Rabat'] >= 0) {
        stats.rabat.qty += product['Stock Rabat'];
        stats.rabat.value += Math.round(product['Stock Rabat'] * price);
        uniqueProductsByStore.rabat.add(ref);
      }
      
      // Marrakech
      if (product['Stock Marrakech'] >= 0) {
        stats.marrakech.qty += product['Stock Marrakech'];
        stats.marrakech.value += Math.round(product['Stock Marrakech'] * price);
        uniqueProductsByStore.marrakech.add(ref);
      }
      
      // Tanger
      if (product['Stock Tanger'] >= 0) {
        stats.tanger.qty += product['Stock Tanger'];
        stats.tanger.value += Math.round(product['Stock Tanger'] * price);
        uniqueProductsByStore.tanger.add(ref);
      }
    });

    // Calculate totals
    stats.total.qty = stats.ske.qty + stats.casa.qty + stats.rabat.qty + stats.marrakech.qty + stats.tanger.qty;
    stats.total.value = stats.ske.value + stats.casa.value + stats.rabat.value + stats.marrakech.value + stats.tanger.value;

    // Calculate unique products and averages
    stats.ske.uniqueProducts = uniqueProductsByStore.ske.size;
    stats.casa.uniqueProducts = uniqueProductsByStore.casa.size;
    stats.rabat.uniqueProducts = uniqueProductsByStore.rabat.size;
    stats.marrakech.uniqueProducts = uniqueProductsByStore.marrakech.size;
    stats.tanger.uniqueProducts = uniqueProductsByStore.tanger.size;

    // Calculate total unique products
    const allRefs = new Set<string>();
    Object.values(uniqueProductsByStore).forEach(store => {
      store.forEach(ref => allRefs.add(ref));
    });
    stats.total.uniqueProducts = allRefs.size;

    // Calculate totals
    stats.total.qty = stats.ske.qty + stats.casa.qty + stats.rabat.qty + stats.marrakech.qty + stats.tanger.qty;
    stats.total.value = stats.ske.value + stats.casa.value + stats.rabat.value + stats.marrakech.value + stats.tanger.value;

    // Calculate unique products
    stats.ske.uniqueProducts = uniqueProductsByStore.ske.size;
    stats.casa.uniqueProducts = uniqueProductsByStore.casa.size;
    stats.rabat.uniqueProducts = uniqueProductsByStore.rabat.size;
    stats.marrakech.uniqueProducts = uniqueProductsByStore.marrakech.size;
    stats.tanger.uniqueProducts = uniqueProductsByStore.tanger.size;
    stats.total.uniqueProducts = new Set(
      [...uniqueProductsByStore.ske, ...uniqueProductsByStore.casa, ...uniqueProductsByStore.rabat,
       ...uniqueProductsByStore.marrakech, ...uniqueProductsByStore.tanger]
    ).size;

    // Calculate averages, percentages, and stock status
    const calculateStoreStats = (store: keyof Omit<StoreStatsMap, 'total'>) => {
      stats[store].avgValue = stats[store].qty > 0 ? stats[store].value / stats[store].qty : 0;
      stats[store].percentageOfTotal = stats.total.qty > 0 ? (stats[store].qty / stats.total.qty) * 100 : 0;

      // Calculate in-stock/out-of-stock counts
      const stockField = store === 'ske' ? 'Stock Frimoda' :
        store === 'casa' ? 'Stock Casa' :
        store === 'rabat' ? 'Stock Rabat' :
        store === 'marrakech' ? 'Stock Marrakech' :
        'Stock Tanger';

      const storeProducts = filteredProducts.filter(product => product[stockField] !== undefined);
      
      stats[store].inStock = storeProducts.filter(product => product[stockField] > 0).length;
      stats[store].outOfStock = storeProducts.filter(product => product[stockField] === 0).length;
      stats[store].inStockPercentage = storeProducts.length > 0 ? 
        (stats[store].inStock / storeProducts.length) * 100 : 0;
    };

    (['ske', 'casa', 'rabat', 'marrakech', 'tanger'] as const).forEach(calculateStoreStats);

    // Calculate total stock stats for unique products
    const storeFields = {
      'ske': 'Stock Frimoda',
      'casa': 'Stock Casa',
      'rabat': 'Stock Rabat',
      'marrakech': 'Stock Marrakech',
      'tanger': 'Stock Tanger'
    } as const;
    
    // Count unique products that are in stock in any store
    const uniqueInStock = new Set(
      filteredProducts.filter(product => 
        Object.values(storeFields).some(field => product[field] > 0)
      ).map(p => p['Ref. produit'])
    ).size;

    // Count unique products that are out of stock in all stores
    const uniqueOutOfStock = new Set(
      filteredProducts.filter(product => 
        Object.values(storeFields).every(field => product[field] === 0)
      ).map(p => p['Ref. produit'])
    ).size;

    stats.total.inStock = uniqueInStock;
    stats.total.outOfStock = uniqueOutOfStock;
    stats.total.inStockPercentage = (uniqueInStock + uniqueOutOfStock) > 0 ?
      (uniqueInStock / (uniqueInStock + uniqueOutOfStock)) * 100 : 0;

    stats.total.avgValue = stats.total.qty > 0 ? stats.total.value / stats.total.qty : 0;

    return stats;
  }, [filteredProducts]);

  // Function to format numbers with spaces as thousand separators
  const formatPrice = (num: number): string => {
    return num.toLocaleString('fr-FR'); // Formats number with spaces as thousand separators
  };

  const StoreStatCard = ({ 
    title, 
    qty, 
    value, 
    inStock,
    outOfStock,
    percentageOfTotal,
    className 
  }: { 
    title: string; 
    qty: number; 
    value: number; 
    inStock: number;
    outOfStock: number;
    percentageOfTotal?: number;
    className?: string;
  }) => (
    <div className={`flex-1 rounded-xl p-3 ${className || 'bg-gradient-to-br from-slate-50 to-white border border-slate-200'}`}>
      <div className={`text-sm font-bold mb-2 flex items-center gap-1.5 ${className?.includes('!text-white') ? 'text-white' : 'text-slate-800'}`}>
        <span>{title}</span>
        {percentageOfTotal !== undefined && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${className?.includes('!text-white') ? 'bg-white/20' : 'bg-blue-100'} ${className?.includes('!text-white') ? 'text-white' : 'text-blue-700'}`}>
            {percentageOfTotal.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <div className={`text-base font-bold leading-none tracking-tight ${className?.includes('!text-white') ? 'text-white' : 'text-blue-600'}`}>{formatNumber(qty)}</div>
            <div className={`text-[10px] mt-0.5 font-medium ${className?.includes('!text-white') ? 'text-blue-100' : 'text-slate-500'}`}>articles</div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-bold leading-none tracking-tight ${className?.includes('!text-white') ? 'text-white' : 'text-green-600'}`}>{formatPrice(value)} DH</div>
            <div className={`text-[10px] mt-0.5 font-medium ${className?.includes('!text-white') ? 'text-blue-100' : 'text-slate-500'}`}>valeur stock</div>
          </div>
        </div>
        <div className="flex justify-between items-start pt-2 border-t border-slate-200/20">
          <div className="flex-1">
            <div className={`text-sm font-bold leading-none ${className?.includes('!text-white') ? 'text-green-300' : 'text-green-600'}`}>{formatNumber(inStock)}</div>
            <div className={`text-[10px] mt-0.5 font-medium ${className?.includes('!text-white') ? 'text-blue-100' : 'text-slate-500'}`}>en stock</div>
          </div>
          <div className="flex-1 text-right">
            <div className={`text-sm font-bold leading-none ${className?.includes('!text-white') ? 'text-red-300' : 'text-red-600'}`}>{formatNumber(outOfStock)}</div>
            <div className={`text-[10px] mt-0.5 font-medium ${className?.includes('!text-white') ? 'text-blue-100' : 'text-slate-500'}`}>en rupture</div>
          </div>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    const adjustFontSize = () => {
      if (productNameRef.current && selectedProduct) {
        let size = 20;
        productNameRef.current.style.fontSize = `${size}px`;
        
        while (productNameRef.current.scrollHeight > productNameRef.current.clientHeight && size > 10) {
          size--;
          productNameRef.current.style.fontSize = `${size}px`;
        }
      }
    };

    if (selectedProduct) {
      adjustFontSize();
    }
  }, [selectedProduct]);

  // Add these styles at the top of your file, after imports
  const tableStyles = {
    tableWrapper: `relative max-h-[calc(100vh-150px)] overflow-auto custom-scrollbar`,
    stickyHeader: `sticky top-0 z-20 bg-[#E6F0FF]`,
    table: `w-full border-collapse text-xs relative`,
    tableCell: `p-2 first:pl-4 last:pr-4`,
    tableRow: `hover:bg-blue-50 transition-all duration-200`,
  };

  const handlePasswordVerification = (success: boolean) => {
    setIsPasswordModalOpen(false);
    if (success && pendingEditProduct) {
      if (pendingEditType === 'promo') {
        setEditingProduct(pendingEditProduct);
        setIsEditModalOpen(true);
      } else if (pendingEditType === 'pack') {
        setEditingProduct(pendingEditProduct);
        setIsBlackFridayEditModalOpen(true);
      }
    }
    setPendingEditProduct(null);
    setPendingEditType('' as EditType);
  };

  // Add state for BlackFridayEditModal
  const [isBlackFridayEditModalOpen, setIsBlackFridayEditModalOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 font-sans uppercase">
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 w-48 bg-[#0156B3] text-white shadow-lg transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col`}
      >
        <div className="bg-[#0156B3] z-20 p-3 shadow-md">
          <Image 
            src="/sketch.svg"
            alt="Stock Finder Logo" 
            width={120} 
            height={40} 
            className="w-full h-auto"
          />
        </div>

        {/* Sketch Apps Button */}
        <div className="py-2 px-4">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-3 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="flex items-center space-x-3">
                <FiLayout className="w-6 h-6 relative z-10" />
                <span className="font-bold text-sm relative z-10 uppercase">SKETCH APPS</span>
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Shadow Separator */}
        <div className="h-2 relative">
          <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-b from-transparent to-black opacity-10"></div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-1 custom-scrollbar">
          {categories.map((category) => (
            <Button
              key={category.name}
              variant={selectedCategory === category.name ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-between mb-1 text-left transition-colors duration-300 text-[11px] py-1 px-2 rounded-md font-bold",
                category.isAll
                  ? "bg-gradient-to-r from-blue-600 to-blue-400 text-white hover:from-blue-700 hover:to-blue-500"
                  : "hover:bg-white hover:text-[#0156B3]",
                selectedCategory === category.name && !category.isAll && "bg-white text-[#0156B3]"
              )}
              onClick={() => handleCategorySelect(category.name)}
            >
              <span>{category.name.toUpperCase()}</span>
              {categoryCounts[category.name] !== undefined && (
                <span className="bg-white text-[#0156B3] text-[9px] px-1.5 py-0.5 rounded-full">
                  {categoryCounts[category.name]}
                </span>
              )}
            </Button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex-none">
          <div className="bg-[#0156B3] text-white px-2 sm:px-4 py-2 sm:py-3 z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSidebarOpen(!sidebarOpen)} 
                  className="text-white p-1"
                >
                  <FiMenu className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
                <h1 className="text-xs sm:text-sm font-bold truncate max-w-[120px] sm:max-w-[160px]">
                  {selectedCategory.toUpperCase()}
                </h1>
              </div>
              <div className="flex items-center space-x-1">
                <span className="px-1 py-0.5 bg-green-500 text-white rounded-full whitespace-nowrap text-[8px] sm:text-[10px]">
                  En stock: {inStockCount}
                </span>
                <span className="px-1 py-0.5 bg-red-500 text-white rounded-full whitespace-nowrap text-[8px] sm:text-[10px]">
                  En rupture: {outOfStockCount}
                </span>
                <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded-full whitespace-nowrap text-[8px] sm:text-[10px]">
                  Total: {totalProductCount}
                </span>
              </div>
            </div>
          </div>
          <div className="sticky top-[40px] sm:top-[48px] z-10 bg-white shadow-md">
            <div className="p-2">
              <div className="relative">
                <div className="relative">
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Rechercher dans toutes les catégories"
                    className="pl-10 pr-10 py-2 w-full transition-shadow duration-300 focus:shadow-md"
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        handleSearchChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FiX size={20} />
                    </button>
                  )}
                  {searchTerm.length > 0 && searchTerm.length < 3 && (
                    <div className="absolute left-0 right-0 mt-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md shadow-sm z-10">
                      <p className="text-xs text-blue-600 font-medium">Entrez au moins 3 caractères pour rechercher</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0 p-4 pb-0 space-y-4">
          {/* Stock Statistics Section - Fixed */}
          <div className="flex-none hidden md:block">
            {/* Individual Stores */}
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl shadow-lg overflow-hidden border border-slate-100">
              <div className="p-2">
                <h2 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <div className="bg-blue-600 rounded-md p-1">
                    <FiPackage className="text-white h-3 w-3" />
                  </div>
                  Statistiques des Stocks
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                  <StoreStatCard
                    title="Résumé Global"
                    qty={calculateStoreStats.total.qty}
                    value={calculateStoreStats.total.value}
                    inStock={calculateStoreStats.total.inStock}
                    outOfStock={calculateStoreStats.total.outOfStock}
                    uniqueProducts={calculateStoreStats.total.uniqueProducts}
                    className="bg-gradient-to-br from-blue-600 to-blue-700 !text-white col-span-1 shadow-lg shadow-blue-500/10 border border-blue-500/10"
                  />
                  <StoreStatCard
                    title="STOCK SKE"
                    qty={calculateStoreStats.ske.qty}
                    value={calculateStoreStats.ske.value}
                    inStock={calculateStoreStats.ske.inStock}
                    outOfStock={calculateStoreStats.ske.outOfStock}
                    uniqueProducts={calculateStoreStats.ske.uniqueProducts}
                    percentageOfTotal={calculateStoreStats.ske.percentageOfTotal}
                    className="bg-gradient-to-br from-emerald-500 to-green-600 !text-white shadow-lg shadow-green-500/10 border border-green-500/10"
                  />
                  <StoreStatCard
                    title="STOCK CASA"
                    qty={calculateStoreStats.casa.qty}
                    value={calculateStoreStats.casa.value}
                    inStock={calculateStoreStats.casa.inStock}
                    outOfStock={calculateStoreStats.casa.outOfStock}
                    uniqueProducts={calculateStoreStats.casa.uniqueProducts}
                    percentageOfTotal={calculateStoreStats.casa.percentageOfTotal}
                    className="bg-gradient-to-br from-blue-50 to-white"
                  />
                  <StoreStatCard
                    title="STOCK RABAT"
                    qty={calculateStoreStats.rabat.qty}
                    value={calculateStoreStats.rabat.value}
                    inStock={calculateStoreStats.rabat.inStock}
                    outOfStock={calculateStoreStats.rabat.outOfStock}
                    uniqueProducts={calculateStoreStats.rabat.uniqueProducts}
                    percentageOfTotal={calculateStoreStats.rabat.percentageOfTotal}
                    className="bg-gradient-to-br from-blue-50 to-white"
                  />
                  <StoreStatCard
                    title="STOCK MARRAKECH"
                    qty={calculateStoreStats.marrakech.qty}
                    value={calculateStoreStats.marrakech.value}
                    inStock={calculateStoreStats.marrakech.inStock}
                    outOfStock={calculateStoreStats.marrakech.outOfStock}
                    uniqueProducts={calculateStoreStats.marrakech.uniqueProducts}
                    percentageOfTotal={calculateStoreStats.marrakech.percentageOfTotal}
                    className="bg-gradient-to-br from-blue-50 to-white"
                  />
                  <StoreStatCard
                    title="STOCK TANGER"
                    qty={calculateStoreStats.tanger.qty}
                    value={calculateStoreStats.tanger.value}
                    inStock={calculateStoreStats.tanger.inStock}
                    outOfStock={calculateStoreStats.tanger.outOfStock}
                    uniqueProducts={calculateStoreStats.tanger.uniqueProducts}
                    percentageOfTotal={calculateStoreStats.tanger.percentageOfTotal}
                    className="bg-gradient-to-br from-blue-50 to-white"
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Redesigned Catalogue Section */}
          {selectedCategoryObj?.catalogue && (
            <div className="bg-[#E6F0FF] rounded-xl shadow-lg overflow-hidden transition-all duration-300 ease-in-out">
              <div 
                className="bg-[#0156B3] py-1 px-3 flex justify-between items-center cursor-pointer"
                onClick={() => setIsCatalogueVisible(!isCatalogueVisible)}
              >
                <h3 className="text-xs font-semibold text-white whitespace-nowrap">
                  {selectedCategoryObj.catalogue === 'tissues' ? 'TISSUS' : 'CÉRAMIQUES'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-700 transition-colors duration-200 p-1"
                >
                  {isCatalogueVisible ? <FiMinus className="h-3 w-3" /> : <FiPlus className="h-3 w-3" />}
                </Button>
              </div>
              {isCatalogueVisible && (
                <div className="p-3">
                  <div className="relative w-full sm:w-48 mb-3">
                    <Input
                      type="text"
                      placeholder="Recherche réf/couleur"
                      value={catalogueSearchTerm}
                      onChange={(e) => setCatalogueSearchTerm(e.target.value)}
                      className="w-full pl-7 pr-2 py-1 text-xs transition-shadow duration-300 focus:shadow-md"
                    />
                    <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                  </div>
                  <div className="overflow-x-auto">
                    <div className="flex space-x-2">
                      {filteredCatalogueItems.map((item, index) => (
                        <CatalogueItemComponent
                          key={index}
                          item={item}
                          onClick={() => setOpenCatalogueItem(item)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Combined Search, Export, and Data Table Section */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl shadow-lg overflow-hidden relative">
            <div className="flex-none bg-white rounded-t-xl border-b border-slate-100">
              <div className="hidden sm:flex flex-col p-4 space-y-4">
                {/* Search and controls - desktop only */}
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 relative">
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Rechercher dans toutes les catégories"
                      className="w-full pl-12 pr-12 py-3 text-base bg-slate-50 border-slate-200 rounded-xl transition-all duration-300 focus:bg-white focus:shadow-lg focus:border-blue-300"
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    {searchTerm && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          handleSearchChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
                        }}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <FiX size={20} />
                      </button>
                    )}
                  </div>
                  <Button 
                    onClick={exportToExcel} 
                    className="bg-[#0156B3] hover:bg-[#0167D3] text-white transition-all duration-300 font-medium text-base py-3 px-6 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md whitespace-nowrap"
                  >
                    <FiDownload className="h-5 w-5" />
                    Export
                  </Button>
                  <Button 
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-white transition-all duration-300 font-medium text-base py-3 px-6 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md whitespace-nowrap"
                  >
                    <FiClock className="h-5 w-5" />
                    Pricing History
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            {!isMobile && (
              <div className="bg-white rounded-xl shadow-lg flex-1 flex flex-col min-h-0 mb-1">
                <div className="flex-1 overflow-auto">
                  <table className="w-full border-collapse text-[11px]" style={{ width: '100%' }}>
                    <thead className="sticky top-0 z-20">
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th
                              key={header.id}
                              className={cn(
                                tableStyles.tableCell,
                                'font-semibold text-[#0156B3] text-[11px]',
                                'sticky top-0 z-20 bg-[#E6F0FF]',
                                'shadow-[0_1px_3px_rgba(0,0,0,0.1)]',
                                header.column.id === 'Ref. produit' || header.column.id === 'Libellé'
                                  ? 'text-left'
                                  : 'text-center',
                                header.column.columnDef.meta?.headerClassName,
                                'h-8'
                              )}
                              style={{ 
                                width: header.column.columnDef.meta?.size,
                                position: 'sticky',
                                top: 0,
                                zIndex: 20,
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row, index) => (
                        <tr
                          key={row.id}
                          className={cn(
                            'hover:bg-slate-50 transition-colors duration-150',
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          )}
                          onClick={() => handleProductClick(row.original)}
                        >
                          {row.getVisibleCells().map(cell => {
                            const cellValue = cell.getValue();
                            const isZeroValue = cellValue === 0 || cellValue === '0';
                            const cellClassName = cell.column.columnDef.meta?.className;
                            const dynamicClassName = typeof cellClassName === 'function'
                              ? cellClassName(cellValue)
                              : cellClassName;

                            return (
                              <td
                                key={cell.id}
                                className={cn(
                                  tableStyles.tableCell,
                                  dynamicClassName,
                                  cell.column.id?.startsWith('Stock') ? 'border-l border-gray-200' : '',
                                  isZeroValue ? 'bg-red-500 text-white' : '',
                                  cell.column.id === 'bf_price' ? 'cursor-default' : 'cursor-pointer'
                                )}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mobile Table (keep existing mobile table code) */}
            {isMobile && (
              <div className="flex-1 overflow-auto">
                <Table className="w-full text-xs min-w-full">
                  <TableHeader className="bg-[#E6F0FF]">
                    <TableRow>
                      {(isMobile ? mobileColumns : table.getHeaderGroups()[0].headers).map((header: any) => (
                        <TableHead 
                          key={header.id || header.accessorKey}
                          className={cn(
                            `font-bold text-[#0156B3]`,
                            header.column?.id === 'Ref. produit' || header.column?.id === 'Libellé' || 
                            (isMobile && header.accessorKey === 'Libellé')
                              ? 'text-left'
                              : 'text-center',
                            header.column?.columnDef.meta?.headerClassName,
                            'h-10 sm:h-12',
                            isMobile ? (header.accessorKey === 'Libellé' ? 'px-3' : 'px-1') : '',
                            isMobile && header.accessorKey === 'Total Stock' ? 'bg-blue-50' : '' // Added bg-blue-50 for Stock header
                          )}
                          style={{ width: header.column?.columnDef.meta?.size }}
                        >
                          {isMobile 
                            ? header.header 
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(isMobile ? filteredProducts : table.getRowModel().rows).map((row: any, index: number) => (
                      <TableRow 
                        key={isMobile ? index : row.id}
                        className={`${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } hover:bg-blue-50 transition-all duration-200`}
                        onClick={() => handleProductClick(isMobile ? row : row.original)}
                      >
                        {(isMobile ? mobileColumns : row.getVisibleCells()).map((cell: any, cellIndex: number) => {
                          const cellValue = isMobile ? row[cell.accessorKey] : cell.getValue();
                          const isZeroValue = cellValue === 0 || cellValue === '0';
                          const cellClassName = isMobile ? cell.className : cell.column.columnDef.meta?.className;
                          const dynamicClassName = typeof cellClassName === 'function' 
                            ? cellClassName(cellValue) 
                            : cellClassName;

                          return (
                            <TableCell 
                              key={isMobile ? cellIndex : cell.id} 
                              className={cn(
                                dynamicClassName,
                                isMobile ? 'px-1 py-2' : '',
                                !isMobile && cell.column.id?.startsWith('Stock') ? 'border-l border-gray-200' : '',
                                isZeroValue ? 'bg-red-500 text-white' : '',
                                !isMobile && cell.column.id === 'bf_price' ? 'cursor-default' : 'cursor-pointer',
                                isMobile && cell.accessorKey === 'Libellé' ? 'max-w-[calc(100vw-100px)]' : '',
                                isMobile && cell.accessorKey === 'Total Stock' ? 'bg-blue-50' : '' // Added bg-blue-50 for Stock cells
                              )}
                            >
                              {isMobile 
                                ? cell.cell 
                                  ? cell.cell({ row: { original: row } })
                                  : cellValue
                                : flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedProduct={selectedProduct}
        isLoading={isModalLoading}
      />

      {/* Catalogue Item Modal */}
      <Dialog.Root open={!!openCatalogueItem} onOpenChange={handleCloseCatalogueModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 opacity-0 data-[state=open]:opacity-100 transition-opacity duration-300 z-50" />
          <AnimatePresence>
            {openCatalogueItem && (
              <Dialog.Content className="fixed inset-0 flex items-center justify-center z-[60]" onClick={handleCloseCatalogueModal}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-lg shadow-lg w-[85vw] sm:w-[350px] md:w-[450px] lg:w-[500px] h-[75vh] sm:h-[85vh] max-h-[550px] overflow-hidden flex flex-col relative custom-scrollbar"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isCatalogueModalLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Spinner size="large" />
                    </div>
                  ) : (
                    <>
                      <div className="relative flex-grow">
                        <Image 
                          src={openCatalogueItem['image url']}
                          alt={openCatalogueItem.ref}
                          layout="fill"
                          objectFit="cover"
                          className="z-0"
                        />
                      </div>
                      <div className="bg-white bg-opacity-90 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center z-10">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">{openCatalogueItem.color ? openCatalogueItem.color.toUpperCase() : openCatalogueItem.ref.toUpperCase()}</h3>
                          {openCatalogueItem.color && <p className="text-sm text-gray-600 mt-1">{openCatalogueItem.ref.toUpperCase()}</p>}
                        </div>
                        <span className={`mt-2 sm:mt-0 px-3 py-1 rounded-full text-sm font-semibold ${
                          openCatalogueItem.availability === 'yes' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-red-500 text-white'
                        }`}>
                          {openCatalogueItem.availability === 'yes' ? 'EN STOCK' : 'ÉPUISÉ'}
                        </span>
                      </div>
                    </>
                  )}
                  <Dialog.Close asChild>
                    <Button className="absolute top-2 right-2 bg-white/50 hover:bg-white/70 text-gray-800 z-20" variant="ghost" size="icon">
                      <FiX className="h-4 w-4" />
                    </Button>
                  </Dialog.Close>
                </motion.div>
              </Dialog.Content>
            )}
          </AnimatePresence>
        </Dialog.Portal>
      </Dialog.Root>

      {isLoading && <LoadingOverlay />}

      <PriceEditModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        }}
        editingProduct={editingProduct}
        onUpdateBFPrice={handleUpdateBFPrice}
      />

      <Notification
        isVisible={notificationVisible}
        onClose={() => setNotificationVisible(false)}
        productLabel={notificationData.productLabel}
        oldBFPrice={notificationData.oldBFPrice}
        newBFPrice={notificationData.newBFPrice}
      />

      <PrixPromoHistory 
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      <PasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPendingEditProduct(null);
        }}
        onVerification={handlePasswordVerification}
      />

      <BlackFridayEditModal 
        isOpen={isBlackFridayEditModalOpen}
        onClose={() => {
          setIsBlackFridayEditModalOpen(false);
          setEditingProduct(null);
        }}
        editingProduct={editingProduct}
        onUpdateBFPrice={handleUpdateBFPrice}
      />
    </div>
  )
}

export default StockFinder;
