'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
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
import { FiX, FiPlus, FiMinus, FiArrowDown, FiMenu, FiSearch, FiDownload, FiLayout } from 'react-icons/fi'
import Link from 'next/link'
import { LoadingOverlay } from './loading-overlay'
import { useMediaQuery } from 'react-responsive'

// Define the Product type based on your backend response
type Product = {
  'Ref. produit': string;
  'Libellé': string;
  'Prix Promo': number;
  'Total Stock': number;
  'Stock Frimoda': number;
  'Stock Casa': number;
  'Stock Rabat': number;
  'Stock Marrakech': number;
  'Stock Tanger': number;
  'Catégorie'?: string;
  imageUrl?: string;
  subProducts?: Product[];
  subProductCount?: number;
  processedName?: string;
  processedCategory?: string;
  processedDimensions?: string;
  imageDetails?: {
    mainSrc: string;
    smallSrc?: string;
    label?: string;
    isCeramic?: boolean;
  };
  catalogueItem?: CatalogueItem;
  [key: string]: string | number | boolean | undefined | Product[] | CatalogueItem | { mainSrc: string; smallSrc?: string; label?: string; isCeramic?: boolean; };
}

// At the top of the file, add this type definition
type Category = {
  name: string;
  catalogue: string | null;
};

// Add this type definition at the top of the file, after other type definitions
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

// Add this function at the top of your file, outside of the component
const normalizeText = (text: string): string => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// Then update the categories constant definition
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
 
]

// Update the PulsingCell component
const PulsingCell = ({ value }: { value: number | undefined }) => {
  const isZeroValue = value === 0;
  return (
    <div className={`w-full h-full flex items-center justify-center ${isZeroValue ? 'bg-red-500' : ''}`}>
      <span className={`font-bold uppercase ${isZeroValue ? 'text-white' : ''}`}>{value ?? 0}</span>
    </div>
  );
};

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
      <div className="flex items-center">
        {row.original.subProducts && (
          <Button
            variant="outline"
            size="sm"
            className="mr-2 p-0 w-6 h-6 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
          >
            {row.getIsExpanded() ? <FiMinus className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
          </Button>
        )}
        <span className="font-medium">{row.original['Libellé']}</span>
      </div>
    ),
  },
  {
    accessorKey: "Total Stock",
    header: "Stock Total",
    cell: ({ row }) => <PulsingCell value={row.original['Total Stock']} />,
    className: "bg-yellow-300",
  },
];

// Add this function to format numbers with space as thousand separator
const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Update the desktopColumns definition
const desktopColumns: ColumnDef<Product>[] = [
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
      <div className="flex items-center">
        {row.original.subProducts && (
          <Button
            variant="outline"
            size="sm"
            className="mr-2 p-0 w-6 h-6 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
          >
            {row.getIsExpanded() ? <FiMinus className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
          </Button>
        )}
        <span className="font-medium">{row.original['Ref. produit']}</span>
      </div>
    ),
  },
  {
    accessorKey: "Libellé",
    header: "Libellé",
    cell: ({ row }) => (
      <div className="flex items-center">
        {row.original.subProductCount && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2 py-0.5 rounded-full">
            +{row.original.subProductCount}
          </span>
        )}
        <span className="font-medium">{row.original['Libellé']}</span>
      </div>
    ),
  },
  {
    accessorKey: "Total Stock",
    header: "STOCK TOTAL",
    cell: ({ row }) => <PulsingCell value={row.original['Total Stock']} />,
    meta: { 
      className: (value: number) => 
        value === 0 ? "bg-red-500 text-white p-0" : "bg-blue-50 p-0", 
      headerClassName: "bg-blue-100" 
    },
  },
  {
    accessorKey: "Prix Promo",
    header: "PRIX PROMO",
    cell: ({ row }) => {
      const amount = parseFloat(row.original['Prix Promo'].toString())
      return <div className="w-full h-full flex items-center justify-center font-bold uppercase">{formatNumber(Math.round(amount))}</div>
    },
    meta: { className: "bg-green-50 p-0", headerClassName: "bg-green-100" },
  },
  {
    accessorKey: "Stock Frimoda",
    header: "STOCK SKE",
    cell: ({ row }) => <PulsingCell value={row.original['Stock Frimoda']} />,
    meta: { 
      className: (value: number) => 
        value === 0 ? "bg-red-500 text-white p-0" : "p-0" 
    },
  },
  {
    accessorKey: "Stock Casa",
    header: "Stock Casa",
    cell: ({ row }) => <PulsingCell value={row.original['Stock Casa']} />,
    meta: { 
      className: (value: number) => 
        value === 0 ? "bg-red-500 text-white p-0" : "p-0" 
    },
  },
  {
    accessorKey: "Stock Rabat",
    header: "Stock Rabat",
    cell: ({ row }) => <PulsingCell value={row.original['Stock Rabat']} />,
    meta: { 
      className: (value: number) => 
        value === 0 ? "bg-red-500 text-white p-0" : "p-0" 
    },
  },
  {
    accessorKey: "Stock Marrakech",
    header: "Stock Marrakech",
    cell: ({ row }) => <PulsingCell value={row.original['Stock Marrakech']} />,
    meta: { 
      className: (value: number) => 
        value === 0 ? "bg-red-500 text-white p-0" : "p-0" 
    },
  },
  {
    accessorKey: "Stock Tanger",
    header: "Stock Tanger",
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

// Update the groupProducts function
const groupProducts = (products: Product[]): Product[] => {
  const groupedMap = new Map<string, Product[]>();
  
  products.forEach(product => {
    const baseLibelle = product.Libellé.split('-')[0].trim();
    const group = groupedMap.get(baseLibelle) || [];
    group.push(product);
    groupedMap.set(baseLibelle, group);
  });

  return Array.from(groupedMap.values()).map(group => {
    group.sort((a, b) => a['Ref. produit'].length - b['Ref. produit'].length);
    const mainProduct = { ...group[0] };
    if (group.length > 1) {
      mainProduct.subProducts = group.slice(1);
      mainProduct.subProductCount = group.length - 1;
      ['Total Stock', 'Stock Frimoda', 'Stock Casa', 'Stock Rabat', 'Stock Marrakech', 'Stock Tanger'].forEach(key => {
        mainProduct[key] = group.reduce((sum, product) => sum + (Number(product[key]) || 0), 0);
      });
    }
    return mainProduct;
  });
};

// Add this function to get product image details
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

export function StockFinderComponent() {
  const [selectedCategory, setSelectedCategory] = useState(categories[0].name)
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [catalogueSearchTerm, setCatalogueSearchTerm] = useState('')
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([])
  const [openCatalogueItem, setOpenCatalogueItem] = useState<CatalogueItem | null>(null);
  const [groupedProducts, setGroupedProducts] = useState<Product[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [inStockCount, setInStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isCatalogueModalLoading, setIsCatalogueModalLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const productNameRef = useRef<HTMLDivElement>(null);
  const [isCatalogueVisible, setIsCatalogueVisible] = useState(false);
  const [catalogueItemsFetched, setCatalogueItemsFetched] = useState<Record<string, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const isMobile = useMediaQuery({ maxWidth: 768 });

  const columns = isMobile ? mobileColumns : desktopColumns;

  // Update the fetchProducts function
  const fetchProducts = async (type: 'category' | 'search', query: string) => {
    // Only set loading to true for category fetches, not for searches
    if (type === 'category') setIsLoading(true);
    try {
      let url = `https://phpstack-937973-4763176.cloudwaysapps.com/data.php?type=${type}`;
      
      if (type === 'category') {
        url += `&query=${encodeURIComponent(query)}`;
      } else if (type === 'search') {
        const normalizedQuery = normalizeText(query);
        const categoryNames = categories.map(cat => encodeURIComponent(cat.name)).join(',');
        url += `&query=${encodeURIComponent(normalizedQuery)}&categories=${categoryNames}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      console.log('Received data:', data);
      if (Array.isArray(data)) {
        const transformedData = data.map(item => ({
          ...item,
          'Ref. produit': item['Ref. produit'] || item['ref'] || item['Ref produit'] || ''
        }));
        setAllProducts(transformedData);
        const grouped = groupProducts(transformedData);
        setGroupedProducts(grouped);
        setFilteredProducts(grouped);
      } else if (data.error) {
        console.error('API Error:', data.error);
        setAllProducts([]);
        setGroupedProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setAllProducts([]);
      setGroupedProducts([]);
      setFilteredProducts([]);
    } finally {
      // Only set loading to false if it was a category fetch
      if (type === 'category') setIsLoading(false);
    }
  };

  // Update the useEffect hook that handles search term changes
  useEffect(() => {
    if (searchTerm && searchTerm.length >= 3) {
      fetchProducts('search', searchTerm);
    } else if (searchTerm.length === 0) {
      // When search bar is cleared, fetch products for the selected category
      fetchProducts('category', selectedCategory);
    }
    setCatalogueItems([]);
    setCatalogueItemsFetched({});
  }, [searchTerm, selectedCategory]);

  // Update the handleSearchChange function
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length === 0) {
      // When search bar is cleared, immediately fetch products for the selected category
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

  const multiKeySearch = (product: Product, searchTerms: string[]): boolean => {
    return searchTerms.every(term => 
      Object.values(product).some(value => 
        typeof value === 'string' && value.toLowerCase().includes(term.toLowerCase())
      )
    );
  };

  useEffect(() => {
    if (searchTerm) {
      const searchTerms = searchTerm.split(' ').filter(term => term.length > 0);
      const filtered = allProducts.filter(product => multiKeySearch(product, searchTerms));
      const grouped = groupProducts(filtered);
      setGroupedProducts(grouped);
      setFilteredProducts(grouped);
    } else {
      const grouped = groupProducts(allProducts);
      setGroupedProducts(grouped);
      setFilteredProducts(grouped);
    }
  }, [searchTerm, allProducts]);

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
    data: groupedProducts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpanded,
    state: {
      sorting,
      expanded,
    },
  })

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

  function hasAccessorKey<T>(column: ColumnDef<T, unknown>): column is ColumnDef<T, unknown> & { accessorKey: keyof T } {
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

  const formatPrice = (price: number): string => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

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

  const handleProductClick = async (product: Product) => {
    setSelectedProduct(null); // Reset the selected product
    setIsModalOpen(true);
    setIsModalLoading(true);
    try {
      const { productName, category, dimensions } = processProductDetails(product);
      const imageUrl = await fetchProductImage(product['Ref. produit']);
      const imageDetails = getProductImage(product, categories.find(cat => cat.name === category));
      
      setSelectedProduct({ 
        ...product, 
        processedName: productName, 
        processedCategory: category, 
        processedDimensions: dimensions,
        imageUrl: imageUrl || undefined,
        imageDetails
      });
    } catch (error) {
      console.error('Error setting selected product:', error);
    } finally {
      setIsModalLoading(false);
    }
  };

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

        <nav className="flex-1 overflow-y-auto py-2 px-1">
          {categories.map((category) => (
            <Button
              key={category.name}
              variant={selectedCategory === category.name ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-between mb-1 text-left hover:bg-white hover:text-[#0156B3] transition-colors duration-300 text-[11px] py-1 px-2 rounded-md font-bold",
                selectedCategory === category.name && "bg-white text-[#0156B3]"
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
        <div className="lg:hidden">
          <div className="bg-[#0156B3] text-white px-2 sm:px-4 py-2 sm:py-3 sticky top-0 z-20">
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
        <div className="flex-1 overflow-auto p-4 space-y-4">
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
          <div className="bg-white rounded-xl shadow-lg">
            <div className="bg-white rounded-t-xl">
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start sm:space-y-0 p-2">
                {/* Counters (visible only on desktop) */}
                <div className="hidden lg:flex flex-wrap gap-2 text-[11px] mb-2 sm:mb-0">
                  <span className="px-2 py-1 bg-green-500 text-white rounded-full whitespace-nowrap">
                    En stock: {inStockCount}
                  </span>
                  <span className="px-2 py-1 bg-red-500 text-white rounded-full whitespace-nowrap">
                    En rupture: {outOfStockCount}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full whitespace-nowrap">
                    Total produits: {totalProductCount}
                  </span>
                </div>
                
                {/* Search and Export */}
                <div className="hidden lg:flex w-full sm:w-auto items-center space-x-2">
                  <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
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

            {/* Responsive Data Table */}
            <div className="overflow-x-auto">
              <Table className="w-full text-xs">
                <TableHeader className="bg-gray-200">
                  <TableRow>
                    {table.getHeaderGroups()[0].headers.map((header) => (
                      <TableHead 
                        key={header.id}
                        className={`font-bold ${
                          header.index === 0 || header.index === 1 ? 'text-left' : 'text-center'
                        } ${(header.column.columnDef as any).meta?.headerClassName || ''} ${
                          header.column.id === 'Ref. produit' || header.column.id === 'Libellé' || header.column.id === 'Total Stock'
                            ? ''
                            : 'hidden lg:table-cell'
                        }`}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <React.Fragment key={row.id}>
                      <TableRow 
                        className={`${
                          row.index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } hover:bg-blue-50 transition-all duration-200 cursor-pointer ${
                          row.getIsExpanded() ? 'bg-blue-100 shadow-md z-10 relative' : ''
                        }`}
                        onClick={() => handleProductClick(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const cellValue = cell.getValue();
                          const isZeroValue = cellValue === 0 || cellValue === '0';
                          const cellClassName = (cell.column.columnDef as any).meta?.className;
                          const dynamicClassName = typeof cellClassName === 'function' 
                            ? cellClassName(cellValue) 
                            : cellClassName;

                          return (
                            <TableCell 
                              key={cell.id} 
                              className={cn(
                                dynamicClassName,
                                cell.column.id?.startsWith('Stock') ? 'border-l border-gray-200' : '',
                                isZeroValue ? 'bg-red-500 text-white' : ''
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {row.getIsExpanded() && row.original.subProducts && (
                        row.original.subProducts.map((subProduct: Product, index: number) => (
                          <TableRow 
                            key={subProduct['Ref. produit']}
                            className={`bg-blue-50 hover:bg-blue-200 transition-colors duration-200 cursor-pointer ${
                              index === (row.original.subProducts?.length ?? 0) - 1 ? 'shadow-md' : ''
                            }`}
                            onClick={() => handleProductClick(subProduct)}
                          >
                            {columns.map((column, colIndex) => (
                              <TableCell 
                                key={column.accessorKey as string} 
                                className={`${colIndex === 0 ? 'text-left' : 'text-center'} ${
                                  (column.meta as Record<string, string>)?.className || ''
                                } ${column.accessorKey?.startsWith('Stock') ? 'border-l border-gray-200' : ''}`}
                              >
                                <div className={`${colIndex === 0 ? 'pl-6' : ''}`}>
                                  {colIndex === 0 ? (
                                    <span className="text-xs text-blue-600">└ {subProduct['Libellé']}</span>
                                  ) : (
                                    column.cell && typeof column.cell === 'function' ? 
                                      flexRender(column.cell, {
                                        getValue: () => subProduct[column.accessorKey as keyof Product],
                                        row: { original: subProduct },
                                      }) : null
                                  )}
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={handleCloseModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <AnimatePresence>
            {isModalOpen && (
              <Dialog.Content 
                className="fixed inset-0 flex items-center justify-center z-[60]" 
                onClick={handleCloseModal}
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
                          className="absolute bottom-4 right-4 overflow-visible z-10"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                        >
                          <div className="bg-[#ffed00] py-1 px-4 transform skew-x-[-20deg] shadow-lg">
                            <p className="text-xl font-bold text-black transform skew-x-[20deg] inline-block">
                              {formatPrice(selectedProduct['Prix Promo'])} <span className="text-xl">DH</span>
                            </p>
                          </div>
                        </motion.div>
                      </div>
                      
                      <div className="p-4 space-y-4 bg-blue-50">
                        {/* Orientation or Ceramic Section */}
                        {selectedProduct.imageDetails && (
                          <>
                            {selectedProduct.imageDetails.label && (
                              <div className="bg-blue-100 p-3 rounded-lg flex items-center justify-between">
                                <span className="text-base font-semibold text-blue-700">Orientation:</span>
                                <div className="flex items-center space-x-3">
                                  <motion.span 
                                    className={`text-base font-bold px-3 py-1 rounded-full ${
                                      selectedProduct.imageDetails.label === 'Gauchier' 
                                        ? 'bg-purple-500 text-white' 
                                        : 'bg-orange-500 text-white'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    {selectedProduct.imageDetails.label}
                                  </motion.span>
                                  {selectedProduct.imageDetails.smallSrc && (
                                    <motion.div 
                                      className="w-14 h-14 relative"
                                      whileHover={{ scale: 1.1 }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      <Image
                                        src={selectedProduct.imageDetails.smallSrc}
                                        alt="Orientation Image"
                                        layout="fill"
                                        objectFit="contain"
                                        style={{
                                          transform: selectedProduct.imageDetails.label === 'Gauchier' ? 'scaleX(-1)' : undefined,
                                        }}
                                      />
                                    </motion.div>
                                  )}
                                </div>
                              </div>
                            )}
                            {selectedProduct.imageDetails.isCeramic && !selectedProduct.catalogueItem && (
                              <div className="bg-blue-100 p-3 rounded-lg flex items-center justify-between">
                                <span className="text-base font-semibold text-blue-700">Céramique</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Catalogue Item Section */}
                        {selectedProduct.catalogueItem && (
                          <div className="bg-blue-100 p-3 rounded-lg flex items-center justify-between">
                            <span className="text-base font-semibold text-blue-700">
                              {selectedProduct.imageDetails?.isCeramic ? 'Céramique' : 'Tissu'}:
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-10 h-10 relative overflow-hidden rounded-md">
                                <Image
                                  src={selectedProduct.catalogueItem['image url']}
                                  alt={selectedProduct.catalogueItem.color || selectedProduct.catalogueItem.ref}
                                  layout="fill"
                                  objectFit="cover"
                                />
                              </div>
                              <span className="text-base font-bold text-blue-600">
                                {selectedProduct.catalogueItem.color || selectedProduct.catalogueItem.ref}
                              </span>
                              {!selectedProduct.imageDetails?.isCeramic && (
                                <span className={`text-sm font-bold px-2 py-1 rounded-full ${
                                  selectedProduct.catalogueItem.availability === 'yes' 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-red-500 text-white'
                                }`}>
                                  {selectedProduct.catalogueItem.availability === 'yes' ? 'EN STOCK' : 'ÉPUISÉ'}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Stock Information */}
                        <div className="bg-blue-100 p-3 rounded-xl shadow-lg overflow-hidden">
                          <motion.div 
                            className="bg-blue-600 p-2 rounded-lg mb-2"
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
                                  className={`${color} ${isOutOfStock ? 'opacity-50' : ''} p-2 rounded-lg flex-grow flex flex-col justify-between relative overflow-hidden`}
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
                    </div>
                  ) : null}

                  <Dialog.Close asChild>
                    <Button 
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-800 rounded-full transition-colors duration-200"
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseModal();
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
                  className="bg-white rounded-lg shadow-lg w-[85vw] sm:w-[350px] md:w-[450px] lg:w-[500px] h-[75vh] sm:h-[85vh] max-h-[550px] overflow-hidden flex flex-col relative"
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
    </div>
  )
}