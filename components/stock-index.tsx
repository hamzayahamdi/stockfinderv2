'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import * as Dialog from '@radix-ui/react-dialog'
import { Analytics } from '@vercel/analytics/react';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table"
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import { Spinner } from './spinner'
import { cn } from "../lib/utils"
import { FiMenu, FiSearch, FiDownload, FiLayout, FiX, FiArrowDown, FiPlus, FiMinus } from 'react-icons/fi'
import { FaIndustry } from 'react-icons/fa'
import { LoadingOverlay } from './loading-overlay'
import { isMobile, isIOS } from 'react-device-detect'
import debounce from 'lodash/debounce'
import { useMediaQuery } from 'react-responsive'; // Add this import

type Product = {
  'Ref. produit': string;
  'Libellé': string;
  'Ratio SKE': number | string;
  'Stock Frimoda': number;
  'Ratio Total': number | string;
  'Total Stock': number;
  'Total Sales': number;
  'Prix Promo': number;
  'Catégorie': string;
  processedName?: string;
  processedCategory?: string;
  processedDimensions?: string;
  imageUrl?: string;
  'Stock Casa': number;
  'Stock Rabat': number;
  'Stock Marrakech': number;
  'Stock Tanger': number;
  'Original Stock Frimoda': number;
  'Original Total Stock': number;
}

type Category = {
  name: string;
  catalogue: string | null;
};

const categories: Category[] = [
  { name: 'Salon en L', catalogue: 'tissues' },
  { name: 'Salon en U', catalogue: 'tissues' },
  { name: 'Canapé 2 Places', catalogue: 'tissues' },
  { name: 'Canapé 3 Places', catalogue: 'tissues' },
  { name: 'Fauteuil', catalogue: 'tissues' },
  { name: 'Chaise', catalogue: 'tissues' },
  { name: 'Table de Salle à Manger', catalogue: 'ceramique' },
  { name: 'Table Basse', catalogue: 'ceramique' },
  { name: 'Meubles TV', catalogue: null }, // New category
  { name: "Table d'Appoint", catalogue: 'ceramique' },
  { name: 'Buffet', catalogue: 'ceramique' },
  { name: 'Console', catalogue: 'ceramique' },
  { name: 'Bibliothèque', catalogue: null },
  { name: 'Lit', catalogue: 'tissues' },
  { name: 'Table de Chevet', catalogue: null },
  { name: "Ensemble d'Extérieur", catalogue: 'tissues' },
  { name: 'Transat', catalogue: null }, // New category
  { name: 'Table Extérieur', catalogue: null },
  { name: 'Chaise Extérieur', catalogue: null },
  { name: 'Miroirs', catalogue: null },
  { name: 'Pouf', catalogue: null },
  { name: 'Tableaux', catalogue: null },
  { name: 'Luminaire-Luxalight', catalogue: null },
  { name: 'Couettes', catalogue: null },
  { name: 'Matelas', catalogue: null },
  { name: 'Oreillers', catalogue: null },
  { name: 'Tapis', catalogue: null },
 
];

const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Add this function at the top of your file, outside of the component
const normalizeText = (text: string): string => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const PeriodSelector = ({ dateRange, onPeriodChange, isChangingPeriod, weekOptions }: {
  dateRange: string;
  onPeriodChange: (newDateRange: string) => void;
  isChangingPeriod: boolean;
  weekOptions: { value: string; label: string; }[];
}) => (
  <div className="flex bg-white rounded-lg overflow-hidden shadow-lg">
    {weekOptions.map((option) => (
      <motion.button
        key={option.value}
        className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
          dateRange === option.value
            ? 'bg-yellow-400 text-blue-800'
            : 'text-blue-800 hover:bg-blue-100'
        }`}
        onClick={() => onPeriodChange(option.value)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={isChangingPeriod}
      >
        {option.label}
      </motion.button>
    ))}
  </div>
);

// Define a type for our main state
type AppState = {
  viewType: 'category' | 'factory' | 'search' | 'all';
  activeQuery: string;
  dateRange: string;
  searchTerm: string;
  selectedCategory: string;
  selectedFactory: string | null;
}

// Define weekOptions at the component level
const weekOptions = [
  { value: '4', label: '4W' },
  { value: '8', label: '8W' },
  { value: '12', label: '12W' },
  { value: '18', label: '18W' },
];

export function StockIndexComponent() {
  // Main state object
  const [appState, setAppState] = useState<AppState>({
    viewType: 'category',
    activeQuery: 'Salon en L',
    dateRange: '4',
    searchTerm: '',
    selectedCategory: 'Salon en L',
    selectedFactory: null,
  });

  // Other state variables
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const productNameRef = useRef<HTMLDivElement>(null);
  
  // ... (other state variables and refs remain the same)

  // Function to update app state
  const updateAppState = useCallback((updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  }, []);

  // Modify the fetchProducts function to accept dateRange as a parameter
  const fetchProducts = useCallback(async (type: 'category' | 'search' | 'factory', query: string, dateRange: string) => {
    setIsLoading(true);
    try {
      const timestamp = new Date().getTime();
      let url = `https://ratio.sketchdesign.ma/ratio/fetch_products.php?dateRange=${dateRange}&_=${timestamp}`;
      
      if (type === 'category') {
        url += `&type=category&query=${encodeURIComponent(query)}`;
      } else if (type === 'factory') {
        url += `&type=factory&query=${encodeURIComponent(query)}`;
      } else if (type === 'search') {
        const normalizedQuery = normalizeText(query);
        if (appState.selectedFactory) {
          url += `&type=factory&query=${appState.selectedFactory}&search=${encodeURIComponent(normalizedQuery)}`;
        } else {
          const categoryNames = categories.map(cat => encodeURIComponent(cat.name)).join(',');
          url += `&type=search&query=${encodeURIComponent(normalizedQuery)}&categories=${categoryNames}`;
        }
      }

      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      if (Array.isArray(data)) {
        let processedData = data.map(item => ({
          ...item,
          'Ratio SKE': calculateRatio(item['Stock Frimoda'], item['Total Sales']),
          'Ratio Total': calculateRatio(item['Total Stock'], item['Total Sales'])
        }));

        if (type === 'search' && query.length >= 3) {
          const searchTerms = query.toLowerCase().split(' ');
          processedData = processedData.filter(item => 
            searchTerms.every(term => 
              Object.values(item).some(value => 
                typeof value === 'string' && value.toLowerCase().includes(term)
              )
            )
          );
        }

        setProducts(processedData);
        return processedData; // Return the processed data
      } else if (data.error) {
        console.error('API Error:', data.error);
        setProducts([]);
        return []; // Return an empty array in case of error
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setProducts([]);
      return []; // Return an empty array in case of error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update debouncedFetchProducts to include dateRange
  const debouncedFetchProducts = useCallback(
    debounce((type: 'category' | 'search' | 'factory', query: string, dateRange: string) => fetchProducts(type, query, dateRange), 300),
    [fetchProducts]
  );

  // Modify handleSearchChange to use the current dateRange
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    updateAppState({ searchTerm: newValue });
    
    if (newValue.length >= 3) {
      updateAppState({
        viewType: 'search',
        activeQuery: newValue,
      });
      debouncedFetchProducts('search', newValue, appState.dateRange);
    } else if (newValue.length > 0) {
      const searchType = appState.selectedFactory ? 'factory' : 'category';
      const searchQuery = appState.selectedFactory || appState.selectedCategory;
      debouncedFetchProducts(searchType, searchQuery, appState.dateRange);
    } else {
      const type = appState.selectedFactory ? 'factory' : 'category';
      const query = appState.selectedFactory || appState.selectedCategory;
      fetchProducts(type, query, appState.dateRange);
    }
  }, [updateAppState, appState.selectedFactory, appState.selectedCategory, appState.dateRange, debouncedFetchProducts, fetchProducts]);

  // Update clearSearch to use the current dateRange
  const clearSearch = useCallback(() => {
    updateAppState({ searchTerm: '' });
    const type = appState.selectedFactory ? 'factory' : 'category';
    const query = appState.selectedFactory || appState.selectedCategory;
    fetchProducts(type, query, appState.dateRange);
  }, [appState.selectedFactory, appState.selectedCategory, appState.dateRange, fetchProducts, updateAppState]);

  // Modify handleCategorySelect and handleFactorySelect to use the current dateRange
  const handleCategorySelect = useCallback((category: string) => {
    updateAppState({
      viewType: 'category',
      activeQuery: category,
      selectedCategory: category,
      selectedFactory: null,
      searchTerm: '',
    });
    fetchProducts('category', category, appState.dateRange);
    setSidebarOpen(false);
  }, [updateAppState, fetchProducts, appState.dateRange]);

  const handleFactorySelect = useCallback((factoryId: string) => {
    updateAppState({
      viewType: 'factory',
      activeQuery: factoryId,
      selectedFactory: factoryId,
      selectedCategory: '',
      searchTerm: '',
    });
    fetchProducts('factory', factoryId, appState.dateRange);
    setSidebarOpen(false);
  }, [updateAppState, fetchProducts, appState.dateRange]);

  // Update the handlePeriodChange function
  const handlePeriodChange = useCallback((newDateRange: string) => {
    updateAppState({ dateRange: newDateRange });
    const type = appState.selectedFactory ? 'factory' : 'category';
    const query = appState.selectedFactory || appState.selectedCategory;
    
    fetchProducts(type, query, newDateRange).then(fetchedData => {
      if (Array.isArray(fetchedData)) {
        setProducts(fetchedData);
      }
    });
  }, [updateAppState, appState.selectedFactory, appState.selectedCategory, fetchProducts]);

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("Salon en L")
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalLoading, setIsModalLoading] = useState(false)

  // Add this line near the top of your component, with other state declarations
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add this new state to track the selected item type
  const [selectedItemType, setSelectedItemType] = useState<'category' | 'factory' | null>(null);

  // Add this new state near the top of your component
  const [modalDateRange, setModalDateRange] = useState('4');

  // Add this new state to store the original stock data
  const [originalStockData, setOriginalStockData] = useState<Record<string, { skeFrimoda: number, total: number }>>({});

  const isMobile = useMediaQuery({ maxWidth: 768 });

  // Add a new state to trigger reloads
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Update the column definitions
  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "Ref. produit",
      header: "Réf.",
      cell: ({ row }) => <div className="text-left">{row.original['Ref. produit']}</div>,
    },
    {
      accessorKey: "Libellé",
      header: "Libellé",
      cell: ({ row }) => <div className="text-left break-words">{row.original['Libellé']}</div>,
    },
    {
      accessorKey: "Stock Frimoda",
      header: "Stock SKE",
      cell: ({ row }) => <div className="text-center">{formatNumber(row.original['Stock Frimoda'])}</div>,
    },
    {
      accessorKey: "Ratio SKE",
      header: "Jours Stock SKE",
      cell: ({ row }) => {
        const value = row.original['Ratio SKE'];
        return <div className="text-center">{typeof value === 'number' ? value : value}</div>;
      },
    },
    {
      accessorKey: "Total Stock",
      header: "Stock Total",
      cell: ({ row }) => <div className="text-center">{formatNumber(row.original['Total Stock'])}</div>,
    },
    {
      accessorKey: "Ratio Total",
      header: "Jours Stock Total",
      cell: ({ row }) => {
        const value = row.original['Ratio Total'];
        return <div className="text-center">{typeof value === 'number' ? value : value}</div>;
      },
    },
    {
      accessorKey: "Total Sales",
      header: () => (
        <div className="text-center">
          Qté Vendue
          <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded-full">
            {`-${appState.dateRange}W`}
          </span>
        </div>
      ),
      cell: ({ row }) => <div className="text-center">{formatNumber(row.original['Total Sales'])}</div>,
    },
    {
      accessorKey: "Prix Promo",
      header: "Prix",
      cell: ({ row }) => <div className="text-center">{formatNumber(Math.round(row.original['Prix Promo']))}</div>,
    },
  ];

  // Helper function to calculate ratios
  const calculateRatio = (stock: number, sales: number): number | string => {
    if (sales === 0) {
      return stock === 0 ? 'Produit en pause' : 'Produit à ralentir';
    }
    return Math.round((stock / sales) * 28); // 28 days in 4 weeks
  };

  const updateCategoryCounts = useCallback((products: Product[]) => {
    const counts: Record<string, number> = {}
    products.forEach(product => {
      const category = product['Catégorie'] || 'Uncategorized'
      counts[category] = (counts[category] || 0) + 1
    })
    setCategoryCounts(counts)
  }, [])

  useEffect(() => {
    updateCategoryCounts(products)
  }, [products, updateCategoryCounts])

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  })

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(products)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products")
    XLSX.writeFile(workbook, "stock_index_export.xlsx")
  }

  const factories = [
    { name: "Abdelilah - Ain sbaa", id: "10" },
    { name: "Bois - Lissassfa", id: "20" },
    { name: "Tapisserie - Lissassfa", id: "30" },
    { name: "Gayal", id: "40" },
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  // Update the mobileColumns definition
  const mobileColumns: {
    accessorKey: keyof Product;
    header: string;
    cell?: (info: { row: { original: Product } }) => React.ReactNode;
    className?: string;
  }[] = [
    {
      accessorKey: "Libellé",
      header: "Libellé",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original['Libellé']}</span>
          <span className="text-xs text-gray-500">{row.original['Ref. produit']}</span>
        </div>
      ),
    },
    {
      accessorKey: "Ratio SKE",
      header: "Jours Stock SKE",
      cell: ({ row }) => {
        const value = row.original['Ratio SKE'];
        const isProduitEnPause = typeof value === 'string' && value.toLowerCase().includes('produit en pause');
        const isProduitARalentir = typeof value === 'string' && value.toLowerCase().includes('produit à ralentir');

        let cellStyle = {};
        if (typeof value === 'number' && value === 0) {
          cellStyle = { backgroundColor: '#FF0000', color: 'white' };
        } else if (isProduitEnPause) {
          cellStyle = { backgroundColor: '#FFFF00' };
        } else if (isProduitARalentir) {
          cellStyle = { backgroundColor: '#9ACD31' };
        }

        return (
          <span className="flex justify-center items-center whitespace-nowrap" style={cellStyle}>
            {value}
          </span>
        );
      },
      className: "text-center",
    },
  ];

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

  const processProductDetails = (product: Product) => {
    const libelle = product['Libellé'].replace(/,/g, '').trim();
    
    const normalize = (text: string) => {
      return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const normalizedLibelle = normalize(libelle);
    
    let category = '';
    let productName = libelle;
    let dimensions = '';

    // Special handling for 'Canapé', 'Miroirs', and 'Meubles TV'
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

  const handleProductClick = async (product: Product) => {
    const { productName, category, dimensions } = processProductDetails(product);
    setSelectedProduct({
      ...product,
      processedName: productName,
      processedCategory: category,
      processedDimensions: dimensions
    });
    setIsModalOpen(true);
    setIsModalLoading(true);
    setModalDateRange(appState.dateRange); // Set the modal's date range to the current main date range
    try {
      const imageUrl = await fetchProductImage(product['Ref. produit']);
      setSelectedProduct(prev => prev ? { ...prev, imageUrl } : null);
    } catch (error) {
      console.error('Error fetching product image:', error);
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleModalPeriodChange = async (newDateRange: string) => {
    if (!selectedProduct) return;
    setIsModalLoading(true);
    try {
      const updatedProductData = await fetchSingleProduct(selectedProduct['Ref. produit'], newDateRange);
      setSelectedProduct(prev => prev ? { ...prev, ...updatedProductData } : null);
      setModalDateRange(newDateRange); // Update the modal's date range
    } catch (error) {
      console.error('Error updating product data:', error);
    } finally {
      setIsModalLoading(false);
    }
  };

  // Update the fetchSingleProduct function to use the product's category
  const fetchSingleProduct = async (productRef: string, currentDateRange: string) => {
    const response = await fetch(`https://ratio.sketchdesign.ma/ratio/fetch_products.php?type=search&query=${productRef}&dateRange=${currentDateRange}`);
    if (!response.ok) {
      throw new Error('Failed to fetch product data');
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const product = data[0];
      return {
        ...product,
        'Ratio SKE': calculateRatio(product['Stock Frimoda'], product['Total Sales']),
        'Ratio Total': calculateRatio(product['Total Stock'], product['Total Sales'])
      };
    }
    throw new Error('Product not found');
  };

  // Add this function at the component level
  const adjustFontSize = (element: HTMLElement | null, maxSize: number, minSize: number) => {
    if (!element) return;
    let size = maxSize;
    element.style.fontSize = `${size}px`;
    while (element.scrollHeight > element.clientHeight && size > minSize) {
      size--;
      element.style.fontSize = `${size}px`;
    }
  };

  // Effect to maintain focus on the search input
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [products]); // Re-focus when products changes

  // Add this useEffect to load "Salon en L" data on first visit
  useEffect(() => {
    const initialType = appState.selectedFactory ? 'factory' : 'category';
    const initialQuery = appState.selectedFactory || appState.selectedCategory;
    fetchProducts(initialType, initialQuery, appState.dateRange).then(fetchedData => {
      if (Array.isArray(fetchedData)) {
        setProducts(fetchedData);
      }
    });
  }, [fetchProducts, appState.dateRange, appState.selectedFactory, appState.selectedCategory]);

  // Add these styles at the top of your component, after imports
  const tableStyles = {
    tableWrapper: `relative max-h-[calc(100vh-100px)] overflow-auto custom-scrollbar`,
    stickyHeader: `sticky top-0 z-20 bg-gray-100`,
    table: `w-full border-collapse text-[11px] relative`,
    tableCell: `p-2 first:pl-4 last:pr-4`,
    tableRow: `hover:bg-blue-50 transition-all duration-200`,
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans uppercase">
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-[#144271] text-white shadow-lg transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col`}
      >
        {/* Logo */}
        <div className="bg-[#144271] z-20 p-3 shadow-md">
          <Image 
            src="/index.svg"
            alt="Stock Index Logo" 
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
              className="bg-gradient-to-r from-[#144271] to-[#1e5a9e] text-white rounded-lg p-3 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="flex items-center space-x-3">
                <FiLayout className="w-6 h-6 relative z-10" />
                <span className="font-bold text-sm relative z-10 uppercase">SKETCH APPS</span>
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Factories */}
        <div className="py-2 px-4 bg-[#1e5a9e] rounded-lg mx-2 mb-2">
          <h3 className="text-xs font-semibold mb-2 text-white flex items-center uppercase">
            <FaIndustry className="mr-2" />
            FACTORIES
          </h3>
          <div className="space-y-1">
            {factories.map((factory) => (
              <motion.button
                key={factory.id}
                className={cn(
                  "text-sm py-1 px-2 rounded-md hover:bg-blue-600 transition-colors duration-200 w-full text-left uppercase",
                  appState.selectedFactory === factory.id && "bg-blue-800"
                )}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleFactorySelect(factory.id)}
              >
                <span className="truncate">{factory.name.toUpperCase()}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Shadow Separator */}
        <div className="h-2 relative">
          <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-b from-transparent to-black opacity-10"></div>
        </div>

        {/* Categories */}
        <nav className="flex-1 overflow-y-auto py-2 px-1">
          {categories.map((category) => (
            <Button
              key={category.name}
              variant={appState.selectedCategory === category.name ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-between mb-1 text-left hover:bg-white hover:text-[#144271] transition-colors duration-300 text-[11px] py-1 px-2 rounded-md font-bold uppercase",
                appState.selectedCategory === category.name && "bg-white text-[#144271]"
              )}
              onClick={() => handleCategorySelect(category.name)}
            >
              <span>{category.name.toUpperCase()}</span>
              {categoryCounts[category.name] !== undefined && (
                <span className="bg-white text-[#144271] text-[9px] px-1.5 py-0.5 rounded-full">
                  {categoryCounts[category.name]}
                </span>
              )}
            </Button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Sticky header for desktop */}
        <div className="hidden lg:block sticky top-0 z-20 bg-white shadow-md">
          <div className="p-4 flex justify-between items-center">
            {/* Counters */}
            <div className="flex gap-2 text-[11px]">
              <span className="px-2 py-1 bg-green-500 text-white rounded-full whitespace-nowrap">
                En stock: {products.filter(p => p['Total Stock'] > 0).length}
              </span>
              <span className="px-2 py-1 bg-red-500 text-white rounded-full whitespace-nowrap">
                En rupture: {products.filter(p => p['Total Stock'] <= 0).length}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full whitespace-nowrap">
                Total produits: {products.length}
              </span>
            </div>

            {/* Période Section */}
            <div className="bg-gradient-to-r from-[#144271] to-[#1e5a9e] rounded-lg p-2 shadow-md">
              <div className="flex items-center justify-center">
                <span className="text-sm font-medium text-white mr-2 whitespace-nowrap">Période:</span>
                <div className="flex bg-white rounded-md overflow-hidden">
                  {weekOptions.map((option) => (
                    <motion.button
                      key={option.value}
                      className={`px-3 py-1 text-sm font-medium transition-colors duration-200 ${
                        appState.dateRange === option.value
                          ? 'bg-yellow-400 text-blue-800'
                          : 'text-blue-800 hover:bg-blue-100'
                      }`}
                      onClick={() => handlePeriodChange(option.value)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={isLoading}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search and Export */}
            <div className="flex items-center space-x-2">
              <div className="relative w-64">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder={appState.selectedFactory 
                    ? `Rechercher dans ${factories.find(f => f.id === appState.selectedFactory)?.name}`
                    : "Rechercher dans toutes les catégories"
                  }
                  className="pl-10 pr-10 py-2 w-full transition-shadow duration-300 focus:shadow-md"
                  value={appState.searchTerm}
                  onChange={handleSearchChange}
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                {appState.searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                )}
                {appState.searchTerm.length > 0 && appState.searchTerm.length < 3 && (
                  <div className="absolute left-0 right-0 mt-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md shadow-sm z-10">
                    <p className="text-xs text-blue-600 font-medium">Entrez au moins 3 caractères pour rechercher dans toutes les catégories</p>
                  </div>
                )}
              </div>
              <Button 
                onClick={exportToExcel} 
                className="bg-[#0156B3] hover:bg-[#0167D3] text-white transition-colors duration-300 font-bold"
              >
                <FiDownload className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Sticky header for mobile */}
        <div className="lg:hidden sticky top-0 z-20 bg-[#144271] shadow-lg">
          <div className="p-2 space-y-2">
            {/* Mobile header with menu button and title */}
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                className="text-white p-1"
              >
                <FiMenu className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <h1 className="text-xs sm:text-sm font-bold truncate text-white">
                {appState.selectedFactory 
                  ? factories.find(f => f.id === appState.selectedFactory)?.name 
                  : appState.selectedCategory.toUpperCase()}
              </h1>
              <div className="flex items-center space-x-1">
                <span className="px-1 py-0.5 bg-green-500 text-white rounded-full whitespace-nowrap text-[8px] sm:text-[10px]">
                  {products.filter(p => p['Total Stock'] > 0).length}
                </span>
                <span className="px-1 py-0.5 bg-red-500 text-white rounded-full whitespace-nowrap text-[8px] sm:text-[10px]">
                  {products.filter(p => p['Total Stock'] <= 0).length}
                </span>
                <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded-full whitespace-nowrap text-[8px] sm:text-[10px]">
                  {products.length}
                </span>
              </div>
            </div>

            {/* Search bar and Période Section for mobile */}
            <div className="bg-white rounded-lg shadow-md p-2 space-y-2">
              {/* Search input for mobile */}
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder={appState.selectedFactory 
                    ? `Rechercher dans ${factories.find(f => f.id === appState.selectedFactory)?.name}`
                    : "Rechercher dans toutes les catégories"
                  }
                  className="pl-10 pr-10 py-2 w-full transition-shadow duration-300 focus:shadow-md"
                  value={appState.searchTerm}
                  onChange={handleSearchChange}
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                {appState.searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                )}
                {appState.searchTerm.length > 0 && appState.searchTerm.length < 3 && (
                  <div className="absolute left-0 right-0 mt-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md shadow-sm z-10">
                    <p className="text-xs text-blue-600 font-medium">Entrez au moins 3 caractères pour rechercher dans toutes les catégories</p>
                  </div>
                )}
              </div>

              {/* Période Section for mobile */}
              <div className="bg-gradient-to-r from-[#144271] to-[#1e5a9e] rounded-lg p-2 shadow-md">
                <div className="flex items-center justify-center">
                  <span className="text-sm font-medium text-white mr-2 whitespace-nowrap">Période:</span>
                  <div className="flex bg-white rounded-md overflow-hidden">
                    {weekOptions.map((option) => (
                      <motion.button
                        key={option.value}
                        className={`px-3 py-1 text-sm font-medium transition-colors duration-200 ${
                          appState.dateRange === option.value
                            ? 'bg-yellow-400 text-blue-800'
                            : 'text-blue-800 hover:bg-blue-100'
                        }`}
                        onClick={() => handlePeriodChange(option.value)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isLoading}
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Data Table Section */}
          {!isMobile ? (
            <div className="bg-white rounded-xl shadow-lg">
              <div className={tableStyles.tableWrapper}>
                {/* Add this loading overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                    <Spinner size="large" />
                  </div>
                )}
                <table className={tableStyles.table}>
                  <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th
                            key={header.id}
                            className={cn(
                              tableStyles.tableCell,
                              'font-semibold tracking-wider text-gray-600 uppercase',
                              'sticky top-0 z-20 bg-gray-100',
                              'shadow-[0_1px_3px_rgba(0,0,0,0.1)]',
                              header.column.id === 'Ref. produit' || header.column.id === 'Libellé'
                                ? 'text-left'
                                : 'text-center',
                              header.column.columnDef.meta?.headerClassName,
                              'h-12'
                            )}
                            style={{ 
                              width: header.column.columnDef.meta?.size,
                              position: 'sticky',
                              top: 0,
                              zIndex: 20,
                            }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
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
                          tableStyles.tableRow,
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        )}
                        onClick={() => handleProductClick(row.original)}
                      >
                        {row.getVisibleCells().map(cell => {
                          const cellValue = cell.getValue();
                          const isZeroValue = cellValue === 0 || cellValue === '0';
                          const isProduitEnPause = typeof cellValue === 'string' && cellValue.toLowerCase().includes('produit en pause');
                          const isProduitARalentir = typeof cellValue === 'string' && cellValue.toLowerCase().includes('produit à ralentir');

                          let cellStyle = {};
                          if (isZeroValue) {
                            cellStyle = { backgroundColor: '#FF0000', color: 'white' };
                          } else if (isProduitEnPause) {
                            cellStyle = { backgroundColor: '#FFFF00' };
                          } else if (isProduitARalentir) {
                            cellStyle = { backgroundColor: '#9ACD31' };
                          }

                          return (
                            <td
                              key={cell.id}
                              style={cellStyle}
                              className={cn(
                                tableStyles.tableCell,
                                'whitespace-nowrap',
                                'cursor-pointer'
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
          ) : (
            <table className="w-full border-collapse text-[11px] relative">
              {/* Add loading overlay for mobile */}
              {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                  <Spinner size="large" />
                </div>
              )}
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase">
                  {mobileColumns.map((column) => (
                    <th key={column.accessorKey} className="px-2 py-3 font-semibold tracking-wider text-left">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr 
                    key={product['Ref. produit']} 
                    className={cn(
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                      'hover:bg-blue-50 transition-all duration-200 cursor-pointer'
                    )}
                    onClick={() => handleProductClick(product)}
                  >
                    {mobileColumns.map((column) => (
                      <td 
                        key={column.accessorKey} 
                        className={`px-2 py-2 ${column.className || ''}`}
                      >
                        {column.cell 
                          ? column.cell({ row: { original: product } })
                          : product[column.accessorKey as keyof Product]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Product Details Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <AnimatePresence>
            {isModalOpen && (
              <Dialog.Content 
                className="fixed inset-0 flex items-center justify-center z-[60]" 
                onClick={() => setIsModalOpen(false)}
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
                  
                  {isModalLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <Spinner size="large" />
                    </div>
                  ) : selectedProduct ? (
                    <div className="product-modal-content relative flex-grow flex flex-col overflow-auto">
                      {/* Product Name and Dimensions Section */}
                      <div className="bg-[#144271] p-3 rounded-t-2xl">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-start justify-between">
                            <motion.div 
                              ref={productNameRef}
                              className="text-2xl font-bold text-white leading-tight"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              onAnimationComplete={() => adjustFontSize(productNameRef.current, 24, 16)}
                            >
                              {selectedProduct?.processedName?.toUpperCase()}
                            </motion.div>
                            {selectedProduct.processedDimensions && (
                              <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                                className="ml-2 flex-shrink-0"
                              >
                                <div className="bg-[#ffed00] py-1 px-2 transform skew-x-[-20deg] shadow-lg">
                                  <p className="text-sm font-bold text-black transform skew-x-[20deg] whitespace-nowrap">
                                    {selectedProduct.processedDimensions.toUpperCase()}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                        <motion.div 
                          className="flex items-center gap-2 mt-2 overflow-x-auto"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          <span className="text-sm text-blue-100 whitespace-nowrap">
                            {selectedProduct['Ref. produit']?.toUpperCase() || 'N/A'}
                          </span>
                          {selectedProduct.processedCategory && (
                            <span className="inline-block bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                              {selectedProduct.processedCategory.toUpperCase()}
                            </span>
                          )}
                        </motion.div>
                      </div>

                      {/* Product Image */}
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
                          className="absolute bottom-2 right-2 overflow-visible z-10"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                        >
                          <div className="bg-[#ffed00] py-1 px-3 transform skew-x-[-20deg] shadow-lg">
                            <p className="text-lg font-bold text-black transform skew-x-[20deg] inline-block">
                              {formatNumber(selectedProduct['Prix Promo'])} <span className="text-lg">DH</span>
                            </p>
                          </div>
                        </motion.div>
                      </div>
                      
                      {/* Period Selector */}
                      <div className="py-3 bg-blue-50 flex justify-center">
                        <PeriodSelector 
                          dateRange={modalDateRange}
                          onPeriodChange={handleModalPeriodChange}
                          isChangingPeriod={isModalLoading}
                          weekOptions={weekOptions}
                        />
                      </div>

                      {/* Product Details */}
                      <div className="p-3 space-y-3 bg-blue-50">
                        <div className="bg-blue-100 p-2 rounded-xl shadow-lg overflow-hidden">
                          <motion.div 
                            className="flex flex-col space-y-3"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0, type: "spring" }}
                          >
                            <div className="bg-blue-600 p-2 rounded-lg text-center">
                              <p className="text-xs font-semibold text-blue-200">Jours de Stock SKE</p>
                              <p className="text-2xl font-bold text-white">
                                {selectedProduct?.['Ratio SKE']}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <DetailItem label="Stock SKE" value={selectedProduct?.['Stock Frimoda']} bgColor="bg-green-500" textColor="text-white" />
                              <DetailItem 
                                label="Jours Stock Total" 
                                value={selectedProduct?.['Ratio Total']}
                                bgColor="bg-yellow-500"
                                textColor="text-white"
                              />
                              <DetailItem label="Stock Total" value={selectedProduct?.['Total Stock']} bgColor="bg-purple-500" textColor="text-white" />
                              <DetailItem 
                                label={
                                  <div className="flex items-center justify-center">
                                    Qté Vendue
                                    <span className="ml-1 px-1 py-0.5 text-[8px] bg-blue-100 text-blue-800 rounded-full">
                                      {`-${modalDateRange}W`}
                                    </span>
                                  </div>
                                }
                                value={selectedProduct?.['Total Sales']} 
                                bgColor="bg-red-500" 
                                textColor="text-white" 
                              />
                            </div>
                          </motion.div>
                        </div>
                      </div>

                      {/* Store Stock Levels */}
                      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          {selectedProduct && ['Casa', 'Rabat', 'Marrakech', 'Tanger'].map((city, index) => (
                            <motion.div 
                              key={city}
                              className="bg-gray-200 p-1 rounded flex-grow flex flex-col justify-between mx-0.5"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: index * 0.1, type: "spring" }}
                            >
                              <p className="text-[10px] font-semibold text-gray-600 text-center uppercase">{city}</p>
                              <p className="text-xs font-bold text-center text-gray-800">
                                {selectedProduct[`Stock ${city}` as keyof Product] ?? 'N/A'}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </motion.div>

                {/* Mobile close button */}
                <motion.button
                  className="fixed top-4 right-4 bg-white rounded-full p-2 shadow-lg lg:hidden"
                  onClick={() => setIsModalOpen(false)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiX className="w-6 h-6 text-gray-600" />
                </motion.button>
              </Dialog.Content>
            )}
          </AnimatePresence>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add this overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  )
}

// Update the DetailItem component
const DetailItem = ({ label, value, bgColor = "bg-white", textColor = "text-gray-800" }: { label: string | React.ReactNode, value: string | number, bgColor?: string, textColor?: string }) => (
  <div className={`${bgColor} p-2 rounded-lg text-center flex flex-col justify-center items-center h-full`}>
    <div className={`text-xs font-semibold ${textColor} opacity-80 whitespace-nowrap`}>{label}</div>
    <p className={`text-sm font-bold ${textColor} whitespace-nowrap`}>
      {typeof value === 'number' ? formatNumber(value) : value}
    </p>
  </div>
);

// Add this type definition for mobileColumns
const mobileColumns: {
  accessorKey: keyof Product;
  header: string;
  cell?: (info: { row: { original: Product } }) => React.ReactNode;
  className?: string;
}[] = [
  // Define your mobile columns here
  {
    accessorKey: "Libellé",
    header: "Libellé",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original['Libellé']}</span>
        <span className="text-xs text-gray-500">{row.original['Ref. produit']}</span>
      </div>
    ),
  },
  {
    accessorKey: "Ratio SKE",
    header: "Jours Stock SKE",
    cell: ({ row }) => {
      const value = row.original['Ratio SKE'];
      const isProduitEnPause = typeof value === 'string' && value.toLowerCase().includes('produit en pause');
      const isProduitARalentir = typeof value === 'string' && value.toLowerCase().includes('produit à ralentir');

      let cellStyle = {};
      if (typeof value === 'number' && value === 0) {
        cellStyle = { backgroundColor: '#FF0000', color: 'white' };
      } else if (isProduitEnPause) {
        cellStyle = { backgroundColor: '#FFFF00' };
      } else if (isProduitARalentir) {
        cellStyle = { backgroundColor: '#9ACD31' };
      }

      return (
        <span className="flex justify-center items-center whitespace-nowrap" style={cellStyle}>
          {value}
        </span>
      );
    },
    className: "text-center",
  },
  // Add more mobile columns as needed
];