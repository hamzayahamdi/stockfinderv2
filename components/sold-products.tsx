'use client'

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { FiMenu, FiSearch, FiDownload, FiX, FiCalendar } from 'react-icons/fi';
import Link from 'next/link';
import { useMediaQuery } from 'react-responsive';
import { cn } from "../lib/utils";
import { format, addDays, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, subMonths } from 'date-fns';
import * as XLSX from 'xlsx';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { MobileDateRangePicker } from '@mui/x-date-pickers-pro/MobileDateRangePicker';
import { DesktopDateRangePicker } from '@mui/x-date-pickers-pro/DesktopDateRangePicker';
import dayjs from 'dayjs';
import { ProductDetailsModal } from './product-details-modal'; // Import the ProductDetailsModal component
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  getSortedRowModel,
  SortingState
} from '@tanstack/react-table';
import { SoldProductDetailsModal } from './sold-product-details-modal';
import { LoadingOverlay } from './loading-overlay';
import 'dayjs/locale/fr'; // Import French locale

declare module '@tanstack/table-core' {
  interface ColumnMeta {
    headerClassName?: string;
    className?: string | ((value: any) => string);
    size?: number;
  }
}

type SoldProduct = {
  product_ref: string;
  product_label: string;
  total_sold: number;
  sold_value: number;
  sold_casa: number;
  sold_rabat: number;
  sold_tanger: number;
  sold_marrakech: number;
  sold_outlet: number;
};

type SoldProductWithImage = SoldProduct & { imageUrl?: string };

type SalesInfo = {
  total_sold: number;
  sold_value: number;
  sold_casa: number;
  sold_rabat: number;
  sold_tanger: number;
  sold_marrakech: number;
  sold_outlet: number;
};

const categories = [
  'Salon en L', 'Salon en U', 'Canapé 2 Places', 'Canapé 3 Places', 'Fauteuil', 'Chaise',
  'Table de Salle à Manger', 'Table Basse', 'Meubles TV', "Table d'Appoint", 'Buffet',
  'Console', 'Bibliothèque', 'Lit', 'Table de Chevet', "Ensemble d'Extérieur", 'Transat',
  'Table Extérieur', 'Chaise Extérieur', 'Miroirs', 'Pouf', 'Tableaux', 'Luminaire-Luxalight',
  'Couettes', 'Matelas', 'Oreillers', 'Tapis'
];

// First, add the formatNumber function at the top with the other utility functions
const formatNumber = (num: number) => {
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// Update the MobileDatePicker component
const MobileDatePicker = ({ 
  startDate, 
  endDate, 
  onChange,
  onClose 
}: { 
  startDate: Date, 
  endDate: Date, 
  onChange: (dates: { startDate: Date, endDate: Date }) => void,
  onClose: () => void
}) => {
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (start > end) {
      setError('La date de début doit être antérieure à la date de fin');
      return;
    }
    onChange({ startDate: start, endDate: end });
    onClose();
  };

  return (
    <div className="fixed inset-x-0 top-[40px] bg-white p-4 shadow-lg z-20">
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-600">Période</label>
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="date"
                value={format(start, 'yyyy-MM-dd')}
                onChange={(e) => {
                  setStart(new Date(e.target.value));
                  setError('');
                }}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div className="flex items-center text-gray-400">→</div>
            <div className="flex-1">
              <input
                type="date"
                value={format(end, 'yyyy-MM-dd')}
                onChange={(e) => {
                  setEnd(new Date(e.target.value));
                  setError('');
                }}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit}
            className="flex-1 bg-[#FF6600]"
          >
            Appliquer
          </Button>
        </div>
      </div>
    </div>
  );
};

// Update the shortcuts configuration
const dateRangeShortcuts = [
  {
    label: 'Aujourd\'hui',
    getValue: () => {
      const today = dayjs();
      return [today, today];
    },
  },
  {
    label: 'Hier',
    getValue: () => {
      const yesterday = dayjs().subtract(1, 'day');
      return [yesterday, yesterday];
    },
  },
  {
    label: 'Cette semaine',
    getValue: () => {
      const today = dayjs();
      return [today.startOf('week').add(1, 'day'), today]; // Add 1 day to start from Monday
    },
  },
  {
    label: 'Semaine dernière',
    getValue: () => {
      const lastWeek = dayjs().subtract(1, 'week');
      return [
        lastWeek.startOf('week').add(1, 'day'), // Monday
        lastWeek.endOf('week').add(1, 'day')    // Sunday
      ];
    },
  },
  {
    label: 'Ce mois',
    getValue: () => {
      const today = dayjs();
      return [today.startOf('month'), today.endOf('month')];
    },
  },
  {
    label: 'Mois dernier',
    getValue: () => {
      const lastMonth = dayjs().subtract(1, 'month');
      return [lastMonth.startOf('month'), lastMonth.endOf('month')];
    },
  },
  {
    label: 'Cette année',
    getValue: () => {
      const today = dayjs();
      return [today.startOf('year'), today];
    },
  },
];

// Add these styles at the top of your component
const scrollbarStyles = `
  /* Hide scrollbar for Chrome, Safari and Opera */
  .custom-scrollbar::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .custom-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
`;

// Add these styles at the top of your component, after the imports
const tableStyles = {
  tableWrapper: `relative max-h-[calc(100vh-115px)] overflow-auto custom-scrollbar`,
  stickyHeader: `sticky top-0 z-20 bg-[#FFF0E6]`, // Changed to match your orange theme
  table: `w-full border-collapse text-xs relative`,
  tableCell: `p-2 first:pl-4 last:pr-4`,
  tableRow: `hover:bg-blue-50 transition-all duration-200`,
};

export function SoldProducts() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]); // Set first category as default
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(), // Set start date to today
      endDate: new Date(), // Set end date to today
      key: 'selection'
    }
  ]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<SoldProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'sold_value', desc: true } // Default sort by sold_value in descending order
  ]);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Add this useEffect for handling click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setSidebarOpen(false);
      }
    }

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  const fetchProducts = async (category: string, startDate: Date, endDate: Date) => {
    try {
      const formattedStartDate = format(startDate, 'dd-MM-yyyy');
      const formattedEndDate = format(endDate, 'dd-MM-yyyy');
      
      // First, fetch all products from the category
      const productsUrl = `https://phpstack-937973-4763176.cloudwaysapps.com/data1.php?type=category&query=${encodeURIComponent(category)}`;
      const productsResponse = await fetch(productsUrl);
      const productsData = await productsResponse.json();

      // Then, fetch sales data
      const salesUrl = `https://sold.sketchdesign.ma/backend.php?start_date=${formattedStartDate}&end_date=${formattedEndDate}`;
      const salesResponse = await fetch(salesUrl);
      const salesData = await salesResponse.json();

      // Create a map of sales data by product reference
      const salesMap = new Map<string, SalesInfo>();
      salesData.forEach((item: any) => {
        salesMap.set(item.product_ref, {
          total_sold: item.total_sold || 0,
          sold_value: item.sold_value || 0,
          sold_casa: item.sold_casa || 0,
          sold_rabat: item.sold_rabat || 0,
          sold_tanger: item.sold_tanger || 0,
          sold_marrakech: item.sold_marrakech || 0,
          sold_outlet: item.sold_outlet || 0
        });
      });

      // Combine the data
      const transformedData = productsData.map((product: any) => {
        const productRef = product['Ref. produit'];
        const salesInfo = salesMap.get(productRef) || {
          total_sold: 0,
          sold_value: 0,
          sold_casa: 0,
          sold_rabat: 0,
          sold_tanger: 0,
          sold_marrakech: 0,
          sold_outlet: 0
        };
        
        return {
          product_ref: productRef,
          product_label: product['Libellé'],
          ...salesInfo
        };
      });

      setSoldProducts(transformedData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the initial load useEffect
  useEffect(() => {
    // Initial load with first category and current date
    fetchProducts(categories[0], dateRange[0].startDate, dateRange[0].endDate);
  }, []); // Empty dependency array for initial load only

  // Update the handleCategorySelect function
  const handleCategorySelect = (category: string) => {
    setIsLoading(true);
    setSelectedCategory(category);
    setSearchTerm('');
    setSidebarOpen(false);
    
    // Always fetch data when category is selected
    const { startDate, endDate } = dateRange[0];
    fetchProducts(category, startDate, endDate);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearchTerm(searchValue);

    if (searchValue.length >= 3) {
      setIsLoading(true);
      const { startDate, endDate } = dateRange[0];
      const formattedStartDate = format(startDate, 'dd-MM-yyyy');
      const formattedEndDate = format(endDate, 'dd-MM-yyyy');

      // First, fetch all products that match the search
      const productsUrl = `https://phpstack-937973-4763176.cloudwaysapps.com/data1.php?type=search&query=${encodeURIComponent(searchValue)}`;

      fetch(productsUrl)
        .then(response => response.json())
        .then(async (productsData) => {
          // Then fetch sales data
          const salesUrl = `https://sold.sketchdesign.ma/backend.php?start_date=${formattedStartDate}&end_date=${formattedEndDate}`;
          const salesResponse = await fetch(salesUrl);
          const salesData = await salesResponse.json();

          // Create sales map
          const salesMap = new Map<string, SalesInfo>();
          salesData.forEach((item: any) => {
            salesMap.set(item.product_ref, {
              total_sold: item.total_sold || 0,
              sold_value: item.sold_value || 0,
              sold_casa: item.sold_casa || 0,
              sold_rabat: item.sold_rabat || 0,
              sold_tanger: item.sold_tanger || 0,
              sold_marrakech: item.sold_marrakech || 0,
              sold_outlet: item.sold_outlet || 0
            });
          });

          // Combine product and sales data, defaulting to 0 for products with no sales
          const transformedData = productsData.map((product: any) => {
            const productRef = product['Ref. produit'];
            const salesInfo = salesMap.get(productRef) || {
              total_sold: 0,
              sold_value: 0,
              sold_casa: 0,
              sold_rabat: 0,
              sold_tanger: 0,
              sold_marrakech: 0,
              sold_outlet: 0
            };
            
            return {
              product_ref: productRef,
              product_label: product['Libellé'],
              ...salesInfo // This will use 0 values if no sales data exists
            };
          });

          setSoldProducts(transformedData);
        })
        .catch(error => {
          console.error('Error fetching search results:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (searchValue.length === 0) {
      // Reset to selected category if search is cleared
      fetchProducts(selectedCategory, dateRange[0].startDate, dateRange[0].endDate);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(soldProducts);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sold Products");
    XLSX.writeFile(workbook, "sold_products_export.xlsx");
  };

  // Update the handleDateChange function
  const handleDateChange = (newValue: any) => {
    if (newValue[0] && newValue[1]) {
      const newStartDate = newValue[0].toDate();
      const newEndDate = newValue[1].toDate();
      
      setDateRange([{
        startDate: newStartDate,
        endDate: newEndDate,
        key: 'selection'
      }]);
      setIsDatePickerOpen(false);
      
      // Always fetch data when dates change
      setIsLoading(true);
      fetchProducts(selectedCategory, newStartDate, newEndDate);
    }
  };

  const fetchProductImage = async (productRef: string): Promise<string> => {
    // Implement this function to fetch the product image
    // For now, we'll return a placeholder
    return '/placeholder-image.jpg';
  };

  const handleProductClick = async (product: SoldProduct) => {
    setIsModalOpen(true);
    setIsModalLoading(true); // Set loading to true immediately
    setSelectedProduct(product);
    
    // Add a small delay before setting loading to false to ensure spinner is visible
    setTimeout(() => {
      setIsModalLoading(false);
    }, 500);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // Update the mobileColumns definition
  const mobileColumns = [
    {
      id: "product_label",
      accessorKey: "product_label",
      header: () => <div className="text-left font-bold">Produit</div>,
      cell: ({ row }: { row: { original: SoldProduct } }) => (
        <div className="flex flex-col text-left">
          <span className="font-medium text-xs truncate">{row.original.product_label}</span>
          <span className="text-[10px] text-gray-500 truncate">{row.original.product_ref}</span>
        </div>
      ),
      className: "w-auto pr-2 pl-2 text-left",
    },
    {
      id: "total_sold", // Changed from sold_value to total_sold
      accessorKey: "total_sold", // Changed from sold_value to total_sold
      header: () => <div className="text-center font-bold">Vendu</div>,
      cell: ({ row }: { row: { original: SoldProduct } }) => (
        <div className="text-center font-bold">
          {formatNumber(row.original.total_sold)} {/* Changed from sold_value to total_sold */}
        </div>
      ),
      meta: { 
        className: (value: number) => 
          value === 0 ? "bg-[#FF0000] text-white p-0" : "p-0" 
      },
    },
  ];

  const columns: ColumnDef<SoldProduct>[] = React.useMemo(
    () => [
      {
        accessorKey: 'product_ref',
        header: () => (
          <div className="text-left font-bold">Référence</div>
        ),
        cell: ({ row }) => (
          <div className="text-left font-bold">
            {row.original.product_ref}
          </div>
        ),
      },
      {
        accessorKey: 'product_label',
        header: 'Libellé',
        cell: ({ row }) => (
          <div className="text-left font-bold">
            {row.original.product_label}
          </div>
        ),
      },
      {
        accessorKey: 'total_sold',
        header: 'Total Vendu',
        cell: ({ row }) => (
          <div className="text-center font-bold">
            {formatNumber(row.original.total_sold)}
          </div>
        ),
        meta: { 
          className: (value: number) => 
            value === 0 
              ? "bg-[#FF0000] text-white p-0" // Zero value styling
              : "bg-blue-50 p-0" // Normal styling with background
        },
        headerClassName: "bg-blue-100"
      },
      {
        accessorKey: 'sold_value',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="hover:bg-slate-100 text-slate-700 font-bold w-full h-full text-center justify-center bg-green-100"
            >
              Valeur Totale
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className="text-center font-bold">
            {formatNumber(row.original.sold_value)} DH
          </div>
        ),
        meta: { 
          className: (value: number) => 
            value === 0 
              ? "bg-[#FF0000] text-white p-0" // Zero value styling
              : "bg-green-50 p-0" // Normal styling with background
        },
        headerClassName: "bg-green-100"
      },
      {
        accessorKey: 'sold_casa',
        header: 'Casa',
        cell: ({ row }) => (
          <div className="text-center font-bold">
            {formatNumber(row.original.sold_casa)}
          </div>
        ),
        meta: { 
          className: (value: number) => 
            value === 0 ? "bg-[#FF0000] text-white p-0" : "p-0" 
        },
      },
      {
        accessorKey: 'sold_rabat',
        header: 'Rabat',
        cell: ({ row }) => (
          <div className="text-center font-bold">
            {formatNumber(row.original.sold_rabat)}
          </div>
        ),
        meta: { 
          className: (value: number) => 
            value === 0 ? "bg-[#FF0000] text-white p-0" : "p-0" 
        },
      },
      {
        accessorKey: 'sold_tanger',
        header: 'Tanger',
        cell: ({ row }) => (
          <div className="text-center font-bold">
            {formatNumber(row.original.sold_tanger)}
          </div>
        ),
        meta: { 
          className: (value: number) => 
            value === 0 ? "bg-[#FF0000] text-white p-0" : "p-0" 
        },
      },
      {
        accessorKey: 'sold_marrakech',
        header: 'Marrakech',
        cell: ({ row }) => (
          <div className="text-center font-bold">
            {formatNumber(row.original.sold_marrakech)}
          </div>
        ),
        meta: { 
          className: (value: number) => 
            value === 0 ? "bg-[#FF0000] text-white p-0" : "p-0" 
        },
      },
      {
        accessorKey: 'sold_outlet',
        header: 'Outlet',
        cell: ({ row }) => (
          <div className="text-center font-bold">
            {formatNumber(row.original.sold_outlet)}
          </div>
        ),
        meta: { 
          className: (value: number) => 
            value === 0 ? "bg-[#FF0000] text-white p-0" : "p-0" 
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: isMobile 
      ? [...soldProducts].sort((a, b) => b.total_sold - a.total_sold) // Changed from sold_value to total_sold
      : soldProducts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <>
      <style jsx global>{scrollbarStyles}</style>
      <div className="flex h-screen bg-gray-100 font-sans uppercase">
        {/* Sidebar */}
        <div 
          ref={sidebarRef}
          className={`fixed inset-y-0 left-0 z-50 w-48 bg-[#FF6600] text-white shadow-lg transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col`}
        >
          <div className="bg-[#FF6600] z-20 p-3 shadow-md">
            <Image 
              src="/sold.svg"
              alt="Sold Products Logo" 
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
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg p-3 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <span className="font-bold text-sm relative z-10 uppercase">SKETCH APPS</span>
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
                key={category}
                variant={selectedCategory === category ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-between mb-1 text-left hover:bg-white hover:text-[#FF6600] transition-colors duration-300 text-[11px] py-1 px-2 rounded-md font-bold",
                  selectedCategory === category && "bg-white text-[#FF6600]" // Changed from text-[#0156B3]
                )}
                onClick={() => handleCategorySelect(category)}
              >
                <span>{category.toUpperCase()}</span>
              </Button>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Mobile header */}
          <div className="lg:hidden">
            <div className="bg-[#FF6600] text-white px-2 sm:px-4 py-2 sm:py-3 sticky top-0 z-20">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSidebarOpen(!sidebarOpen)} 
                  className="text-white p-1"
                >
                  <FiMenu className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
                <h1 className="text-xs sm:text-sm font-bold truncate">
                  {selectedCategory}
                </h1>
              </div>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
            {/* Search, Export, and Date Picker Section */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                  <LocalizationProvider 
                    dateAdapter={AdapterDayjs}
                    adapterLocale="fr"
                    localeText={{ start: 'Début', end: 'Fin' }}
                    dateLibInstance={dayjs}
                  >
                    <div className="w-full sm:w-auto">
                      {isMobile ? (
                        <MobileDateRangePicker
                          value={[
                            dayjs(dateRange[0].startDate),
                            dayjs(dateRange[0].endDate)
                          ]}
                          onChange={handleDateChange}
                          slotProps={{
                            textField: { size: 'small' },
                            toolbar: {
                              hidden: false,
                            }
                          }}
                          localeText={{ start: 'Début', end: 'Fin' }}
                        />
                      ) : (
                        <DesktopDateRangePicker
                          value={[
                            dayjs(dateRange[0].startDate),
                            dayjs(dateRange[0].endDate)
                          ]}
                          onChange={handleDateChange}
                          slotProps={{
                            textField: { size: 'small' },
                            popper: {
                              placement: 'bottom-start',
                            },
                            shortcuts: {
                              items: dateRangeShortcuts,
                            },
                          }}
                          sx={{
                            width: '100%',
                            '& .MuiInputBase-root': {
                              borderRadius: 1,
                              backgroundColor: 'white',
                            }
                          }}
                          localeText={{ start: 'Début', end: 'Fin' }}
                        />
                      )}
                    </div>
                  </LocalizationProvider>

                  <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
                    {/* Search input */}
                    <div className="relative w-full">
                      <Input
                        type="text"
                        placeholder="Rechercher..."
                        className="pl-10 pr-10 py-2 w-full"
                        value={searchTerm}
                        onChange={handleSearchChange}
                      />
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <FiX size={20} />
                        </button>
                      )}
                    </div>
                    
                    {/* Export button */}
                    <Button 
                      onClick={exportToExcel} 
                      className="hidden sm:flex bg-[#FF6600] hover:bg-[#FF8533] text-white transition-colors duration-300 font-bold"
                    >
                      <FiDownload className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Responsive Data Table */}
            {!isMobile ? (
              <div className="bg-white rounded-xl shadow-lg">
                <div className={tableStyles.tableWrapper}>
                  <table className={tableStyles.table}>
                    <thead>
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th
                              key={header.id}
                              className={cn(
                                tableStyles.tableCell,
                                'font-bold text-[#FF6600]',
                                'sticky top-0 z-20 bg-[#FFF0E6]',
                                'shadow-[0_1px_3px_rgba(0,0,0,0.1)]',
                                'border border-gray-200',
                                header.column.id === 'product_ref' || header.column.id === 'product_label'
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
                            tableStyles.tableRow,
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
                                  'border border-gray-200',
                                  isZeroValue ? 'bg-[#FF0000] text-white' : '',
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
              // Keep existing mobile table code
              <div className="overflow-hidden">
                <Table className="w-full text-xs">
                  <TableHeader className="bg-[#FFF0E6]">
                    <TableRow>
                      {(isMobile ? mobileColumns : table.getHeaderGroups()[0].headers).map((header: any) => {
                        const headerContent = isMobile 
                          ? typeof header.header === 'function' 
                            ? header.header()
                            : header.header
                          : flexRender(header.column.columnDef.header, header.getContext());

                        return (
                          <TableHead 
                            key={header.id}
                            className={cn(
                              `font-bold text-[#FF6600] border border-gray-200`,
                              (header.id === 'product_label') ? 'text-left' : 'text-center',
                              'h-10 sm:h-12',
                              isMobile ? (header.id === 'product_label' ? 'px-3' : 'px-1') : '',
                              header.column?.columnDef.meta?.headerClassName // Add this line
                            )}
                          >
                            {headerContent}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(isMobile 
                      ? [...soldProducts].sort((a, b) => b.total_sold - a.total_sold) // Changed from sold_value to total_sold
                      : table.getRowModel().rows
                    ).map((row: any, index: number) => (
                      <TableRow 
                        key={isMobile ? index : row.id}
                        className={`${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } hover:bg-blue-50 transition-all duration-200 cursor-pointer`}
                        onClick={() => handleProductClick(isMobile ? row : row.original)}
                      >
                        {(isMobile ? mobileColumns : row.getVisibleCells()).map((cell: any, cellIndex: number) => {
                          const cellValue = isMobile ? row[cell.accessorKey] : cell.getValue();
                          const cellClassName = isMobile ? cell.className : cell.column.columnDef.meta?.className;
                          const dynamicClassName = typeof cellClassName === 'function' 
                            ? cellClassName(cellValue) 
                            : cellClassName;

                          return (
                            <TableCell 
                              key={isMobile ? cellIndex : cell.id} 
                              className={cn(
                                dynamicClassName,
                                'border border-gray-200',
                                isMobile ? 'px-1 py-2' : '',
                                isMobile && cell.id === 'product_label' ? 'text-left' : '',
                                isMobile && cell.accessorKey === 'Libellé' ? 'max-w-[calc(100vw-100px)]' : '',
                                // Add color coding for zero values in mobile view
                                isMobile && cell.id === 'total_sold' && row.total_sold === 0 ? 'bg-[#FF0000] text-white' : ''
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

        {/* Product Details Modal */}
        <SoldProductDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          selectedProduct={selectedProduct}
          isLoading={isModalLoading}
        />

        {/* Add Loading Overlay */}
        {isLoading && <LoadingOverlay />}
      </div>
    </>
  );
}
