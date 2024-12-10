import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from "./ui/button";
import { FiX, FiDollarSign, FiTag, FiPackage, FiTrendingDown, FiShoppingBag, FiPercent, FiBox, FiTrendingUp, FiBarChart2, FiActivity, FiSun, FiMoon, FiCalendar, FiClock, FiArchive, FiAlertTriangle, FiRotateCcw } from 'react-icons/fi';
import Image from 'next/image';
import { Product } from '../types/product';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from './spinner';
import { cn } from '../lib/utils';
import { LineChart, BarChart, BarPlot } from '@mui/x-charts';

interface PriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  onUpdateBFPrice: (newBFPrice: number, newInitialPrice: number, updatedProduct: Product) => Promise<void>;
}

interface DailySalesData {
  date: string;
  units: number;
  revenue: number;
}

interface SalesMetrics {
  dailyData: DailySalesData[];
  salesVelocity: number;
  totals: {
    units: number;
    revenue: number;
  };
}

type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month';

interface PeriodOption {
  label: string;
  value: Period;
  icon: React.ReactNode;
}

const periodOptions: PeriodOption[] = [
  { label: "Aujourd&apos;hui", value: 'today', icon: <FiSun className="h-4 w-4" /> },
  { label: 'Hier', value: 'yesterday', icon: <FiMoon className="h-4 w-4" /> },
  { label: 'Cette semaine', value: 'this_week', icon: <FiCalendar className="h-4 w-4" /> },
  { label: 'Semaine dernière', value: 'last_week', icon: <FiClock className="h-4 w-4" /> },
  { label: 'Ce mois', value: 'this_month', icon: <FiCalendar className="h-4 w-4" /> },
  { label: 'Mois dernier', value: 'last_month', icon: <FiArchive className="h-4 w-4" /> },
];

const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

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

const fetchCRValue = async (ref: string): Promise<number | null> => {
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/1sKmPzOUdKgez1CJtk4_smU3kNZ0vFKmX6vpHzjtrjLA/gviz/tq?tqx=out:json`);
    const text = await response.text();
    const data = JSON.parse(text.substr(47).slice(0, -2));
    
    // Clean and normalize the reference for comparison
    const cleanRef = ref.trim().toUpperCase();
    
    const row = data.table.rows.find((row: { c: Array<{ v: string | null }> }) => {
      const sheetRef = row.c[0]?.v?.toString().trim().toUpperCase();
      return sheetRef === cleanRef;
    });
    
    // CR value is in the 3rd column (index 2)
    return row ? Number(row.c[2]?.v) || null : null;
  } catch (error) {
    console.error('Error fetching CR value:', error);
    return null;
  }
};

const fetchSalesMetrics = async (ref: string): Promise<SalesMetrics> => {
  try {
    const response = await fetch(`https://phpstack-937973-4763176.cloudwaysapps.com/fetch-sales-charts.php?ref=${encodeURIComponent(ref)}`);
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Failed to fetch sales data');
    }

    // Fill in any missing dates with zero sales
    const allDates = generateLast28Days();
    const dailyData = allDates.map(date => {
      const salesData = data.salesMetrics.dailySales.find((d: any) => d.date === date);
      return {
        date,
        units: salesData ? Number(salesData.qty_sold) : 0,
        revenue: salesData ? Number(salesData.revenue) : 0
      };
    });

    return {
      dailyData,
      salesVelocity: Number(data.salesMetrics.salesVelocity) || 0,
      totals: {
        units: Number(data.salesMetrics.totals.units) || 0,
        revenue: Number(data.salesMetrics.totals.revenue) || 0
      }
    };

  } catch (error) {
    console.error('Error fetching sales metrics:', error);
    return {
      dailyData: generateLast28Days().map(date => ({
        date,
        units: 0,
        revenue: 0
      })),
      salesVelocity: 0,
      totals: {
        units: 0,
        revenue: 0
      }
    };
  }
};

const generateChartData = (metrics: SalesMetrics | null) => {
  if (!metrics) return [];
  
  return [
    { name: 'Lun', sales: Math.floor(Math.random() * 100) },
    { name: 'Mar', sales: Math.floor(Math.random() * 100) },
    { name: 'Mer', sales: Math.floor(Math.random() * 100) },
    { name: 'Jeu', sales: Math.floor(Math.random() * 100) },
    { name: 'Ven', sales: Math.floor(Math.random() * 100) },
    { name: 'Sam', sales: Math.floor(Math.random() * 100) },
    { name: 'Dim', sales: Math.floor(Math.random() * 100) },
  ];
};

const generateLast28Days = () => {
  const dates = [];
  for (let i = 27; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const SalesChart: React.FC<{ metrics: SalesMetrics; editingProduct: Product }> = ({ metrics, editingProduct }) => {
  return (
    <div className="space-y-6">
      {/* Units Sold Line Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-sm font-medium text-gray-700">Unités vendues (4 dernières semaines)</h4>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              Total: {metrics.totals.units} unités
            </span>
          </div>
        </div>
        <div className="h-[250px]">
          <LineChart
            series={[
              {
                data: metrics.dailyData.map(d => d.units),
                label: 'Unités vendues',
                color: '#3b82f6',
                showMark: true,
                curve: "natural",
                valueFormatter: (value) => `${value} unités`,
              }
            ]}
            xAxis={[{
              data: metrics.dailyData.map(d => new Date(d.date).toLocaleDateString('fr-FR', { 
                day: '2-digit',
                month: 'short'
              })),
              scaleType: 'point',
              tickLabelStyle: {
                angle: 45,
                textAnchor: 'start',
                fontSize: 12,
              }
            }]}
            yAxis={[{
              min: 0,
              tickNumber: 5,
              tickLabelStyle: {
                fontSize: 12,
              }
            }]}
            height={400}
            margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
            slotProps={{
              legend: { hidden: true }
            }}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {/* Stock Coverage SKE Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Couverture SKE</span>
            <FiBox className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.salesVelocity && editingProduct['Stock Frimoda']
              ? Math.round(editingProduct['Stock Frimoda'] / metrics.salesVelocity)
              : 0}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            jours SKE
          </div>
        </div>

        {/* Total Stock Coverage Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Couverture Totale</span>
            <FiPackage className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.salesVelocity && editingProduct['Total Stock']
              ? Math.round(editingProduct['Total Stock'] / metrics.salesVelocity)
              : 0}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            jours total
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">CA (28j)</span>
            <FiDollarSign className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(metrics.totals.revenue)} DH
          </div>
          <div className="mt-0.5 text-xs text-gray-500">
            {formatNumber(Math.round(metrics.totals.revenue / 28))} DH/jour
          </div>
        </div>

        {/* Sales Velocity Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Vélocité</span>
            <FiActivity className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.salesVelocity.toFixed(2)}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            unités/jour
          </div>
        </div>
      </div>
    </div>
  );
};

// Add new interface for supplier reception data
interface SupplierReception {
  date_reception: string;
  qte_recus: number;
}

// Update the fetchSupplierReceptions function
const fetchSupplierReceptions = async (ref: string): Promise<SupplierReception[]> => {
  try {
    const response = await fetch(`https://phpstack-937973-4763176.cloudwaysapps.com/supplier.php?ref=${encodeURIComponent(ref)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];

  } catch (error) {
    console.error('Error fetching supplier receptions:', error);
    return [];
  }
};

// Add helper function to aggregate data by week
const aggregateByWeek = (data: SupplierReception[]): SupplierReception[] => {
  const weeklyData = data.reduce((acc: { [key: string]: number }, curr) => {
    const date = new Date(curr.date_reception);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
    const weekKey = weekStart.toISOString().split('T')[0];
    
    acc[weekKey] = (acc[weekKey] || 0) + curr.qte_recus;
    return acc;
  }, {});

  return Object.entries(weeklyData)
    .map(([weekKey, total]) => ({
      date_reception: weekKey,
      qte_recus: total
    }))
    .sort((a, b) => a.date_reception.localeCompare(b.date_reception));
};

// Add helper function to get week number
const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Update the helper function to include week range
const getWeekRange = (date: string) => {
  const d = new Date(date);
  const firstDay = new Date(d);
  firstDay.setDate(d.getDate() - d.getDay() + 1); // Monday
  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 6); // Sunday

  return {
    start: firstDay.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    end: lastDay.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    weekNum: getWeekNumber(d)
  };
};

// Add new type for time aggregation
type TimeAggregation = 'day' | 'week' | 'month';

// Update the getLastThirtyDays function to show last 15 days instead
const getLastFifteenDays = (data: SupplierReception[]): SupplierReception[] => {
  const sortedData = [...data].sort((a, b) => 
    new Date(b.date_reception).getTime() - new Date(a.date_reception).getTime()
  );
  return sortedData.slice(0, 15).reverse(); // Show last 15 days
};

// Add this new interface for the combined chart data
interface CombinedReceptionData {
  date_reception: string;
  qte_recus: number;
  cumulative: number;
}

// Add this new helper function to calculate cumulative data
const calculateCumulativeData = (data: SupplierReception[]): CombinedReceptionData[] => {
  let cumulative = 0;
  return data
    .sort((a, b) => new Date(a.date_reception).getTime() - new Date(b.date_reception).getTime())
    .map(item => {
      cumulative += item.qte_recus;
      return {
        ...item,
        cumulative
      };
    });
};

// Update the getAggregatedData function with new ranges
const getAggregatedData = (data: SupplierReception[], aggregation: TimeAggregation): SupplierReception[] => {
  switch (aggregation) {
    case 'month':
      return aggregateByMonth(data).slice(-6); // Show last 6 months
    case 'week':
      return aggregateByWeek(data).slice(-18); // Show last 18 weeks
    case 'day':
      return getLastFifteenDays(data); // Use new 15 days function
    default:
      return data;
  }
};

// Function to aggregate data by month
const aggregateByMonth = (data: SupplierReception[]): SupplierReception[] => {
  const monthlyData = data.reduce((acc: { [key: string]: number }, curr) => {
    const date = new Date(curr.date_reception);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
    acc[monthKey] = (acc[monthKey] || 0) + curr.qte_recus;
    return acc;
  }, {});

  return Object.entries(monthlyData)
    .map(([monthKey, total]) => ({
      date_reception: `${monthKey}-01`, // First day of month
      qte_recus: total
    }))
    .sort((a, b) => a.date_reception.localeCompare(b.date_reception));
};

// Add this new interface for AI pricing recommendation
interface PricingRecommendation {
  recommendedPrice: number | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
  priceChange: number;
  impact: {
    margin: number;
    expectedSales: number;
  };
}

// Add this new function to generate pricing recommendations
const generatePricingRecommendation = (
  product: Product,
  salesMetrics: SalesMetrics | null,
  crValue: number | null,
  supplierReceptions: SupplierReception[]
): PricingRecommendation => {
  const reasons: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  let recommendedPrice = null;
  
  // Current price and costs
  const currentPrice = product['Prix Promo'];
  const costPrice = crValue || 0;
  
  // Sales velocity analysis
  const salesVelocity = salesMetrics?.salesVelocity || 0;
  const totalStock = product['Total Stock'] || 0;
  const stockCoverage = salesVelocity ? Math.round(totalStock / salesVelocity) : 0;
  
  // Stock level analysis
  if (stockCoverage > 120) {
    reasons.push("Stock élevé : La couverture de stock actuelle est supérieure à 120 jours");
    confidence = 'high';
  } else if (stockCoverage < 30 && salesVelocity > 0) {
    reasons.push("Stock bas : La couverture de stock est inférieure à 30 jours");
  }

  // Sales velocity analysis
  if (salesVelocity < 0.5 && totalStock > 50) {
    reasons.push("Faible rotation : Vélocité des ventes inférieure à 0.5 unités/jour");
    confidence = 'high';
  }

  // Margin analysis
  if (crValue) {
    const currentMargin = ((currentPrice - crValue) / currentPrice) * 100;
    if (currentMargin > 65) {
      reasons.push(`Marge élevée : La marge actuelle est de ${currentMargin.toFixed(0)}%`);
    } else if (currentMargin < 35) {
      reasons.push(`Marge faible : La marge actuelle est de ${currentMargin.toFixed(0)}%`);
    }
  }

  // Calculate recommended price based on conditions
  if (reasons.length > 0) {
    if (stockCoverage > 120 || (salesVelocity < 0.5 && totalStock > 50)) {
      // Suggest price reduction for slow-moving items
      const reduction = currentPrice * 0.15; // 15% reduction
      recommendedPrice = Math.round(currentPrice - reduction);
    } else if (stockCoverage < 30 && salesVelocity > 1) {
      // Suggest price increase for fast-moving items
      const increase = currentPrice * 0.10; // 10% increase
      recommendedPrice = Math.round(currentPrice + increase);
    }
  }

  return {
    recommendedPrice,
    confidence,
    reasoning: reasons,
    priceChange: recommendedPrice ? recommendedPrice - currentPrice : 0,
    impact: {
      margin: recommendedPrice && crValue ? 
        ((recommendedPrice - crValue) / recommendedPrice) * 100 : 0,
      expectedSales: recommendedPrice ? 
        salesVelocity * (1 + (currentPrice - recommendedPrice) / currentPrice) : 0
    }
  };
};

// Add new interface for AI response
interface AIPricingAnalysis {
  recommendedPrice: number | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
  impact: {
    margin: number;
    expectedSales: number;
  };
  risks: string[];
}

export const PriceEditModal: React.FC<PriceEditModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  onUpdateBFPrice,
}) => {
  // Existing states
  const [timeAggregation, setTimeAggregation] = useState<TimeAggregation>('week');
  const [newBFPrice, setNewBFPrice] = useState(0);
  const [newInitialPrice, setNewInitialPrice] = useState(0);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [crValue, setCRValue] = useState<number | null>(null);
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('this_week');
  const [supplierReceptions, setSupplierReceptions] = useState<SupplierReception[]>([]);
  
  // Add new AI-related states here
  const [aiAnalysis, setAiAnalysis] = useState<AIPricingAnalysis | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const newPriceInputRef = useRef<HTMLInputElement>(null);

  // Update the fetchAIPricingAnalysis function
  const fetchAIPricingAnalysis = async (retryCount = 0) => {
    if (!editingProduct || !salesMetrics) return;
    
    setIsAiLoading(true);
    try {
      // Validate data before sending
      const validatedData = {
        product: {
          ...editingProduct,
          'Prix Promo': Number(editingProduct['Prix Promo']),
          'Total Stock': Number(editingProduct['Total Stock'])
        },
        salesMetrics: {
          ...salesMetrics,
          salesVelocity: Number(salesMetrics.salesVelocity),
          totals: {
            units: Number(salesMetrics.totals.units),
            revenue: Number(salesMetrics.totals.revenue)
          }
        },
        crValue: crValue ? Number(crValue) : null,
        supplierReceptions: supplierReceptions.map(r => ({
          ...r,
          qte_recus: Number(r.qte_recus)
        }))
      };

      console.log('Sending data to AI:', validatedData);

      const response = await fetch('/api/ai-pricing-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('AI Analysis Error Response:', data);
        throw new Error(data.error || 'AI analysis failed');
      }

      // Validate AI response
      if (!isValidAIResponse(data)) {
        console.error('Invalid AI Response:', data);
        throw new Error('Invalid AI response format');
      }

      setAiAnalysis(data);
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      
      // Retry logic (max 2 retries)
      if (retryCount < 2) {
        console.log(`Retrying AI analysis (attempt ${retryCount + 1})...`);
        setTimeout(() => fetchAIPricingAnalysis(retryCount + 1), 1000);
        return;
      }
      
      setAiAnalysis(null);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Add validation function for AI response
  const isValidAIResponse = (response: any): response is AIPricingAnalysis => {
    return (
      response &&
      (typeof response.recommendedPrice === 'number' || response.recommendedPrice === null) &&
      ['high', 'medium', 'low'].includes(response.confidence) &&
      Array.isArray(response.reasoning) &&
      typeof response.impact === 'object' &&
      typeof response.impact.margin === 'number' &&
      typeof response.impact.expectedSales === 'number' &&
      Array.isArray(response.risks)
    );
  };

  // Update the useEffect that triggers AI analysis
  useEffect(() => {
    const shouldFetchAI = 
      isOpen && // Only when modal is open
      editingProduct && 
      salesMetrics && 
      supplierReceptions.length > 0 &&
      typeof editingProduct['Prix Promo'] === 'number' &&
      typeof salesMetrics.salesVelocity === 'number' &&
      !isAiLoading; // Prevent refetch while loading

    if (shouldFetchAI) {
      fetchAIPricingAnalysis();
    }
  }, [isOpen]); // Only depend on modal open state

  useEffect(() => {
    if (isOpen && editingProduct) {
      setNewBFPrice(editingProduct['Prix Promo'] || 0);
      setNewInitialPrice(editingProduct['Prix Promo'] || 0);
      setIsImageLoading(true);
      
      // Fetch all data in parallel
      Promise.all([
        fetchProductImage(editingProduct['Ref. produit']),
        fetchCRValue(editingProduct['Ref. produit']),
        fetchSalesMetrics(editingProduct['Ref. produit'])
      ]).then(([image, cr, metrics]) => {
        setProductImage(image);
        setCRValue(cr);
        setSalesMetrics(metrics);
        setIsImageLoading(false);
      }).catch(error => {
        console.error('Error fetching data:', error);
        setIsImageLoading(false);
      });
      
      // Add supplier receptions fetch
      fetchSupplierReceptions(editingProduct['Ref. produit'])
        .then(receptions => {
          setSupplierReceptions(receptions);
        })
        .catch(error => {
          console.error('Error:', error);
        });
      
      setTimeout(() => {
        if (newPriceInputRef.current) {
          newPriceInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, editingProduct]);

  const remise = useMemo(() => {
    return ((newInitialPrice - newBFPrice) / newInitialPrice) * 100;
  }, [newInitialPrice, newBFPrice]);

  const handleUpdateBFPrice = async () => {
    if (!editingProduct) return;

    setIsUpdating(true);
    try {
      const updatedFields = {
        product_ref: editingProduct['Ref. produit'],
        product_label: editingProduct['Libellé'],
        old_price: editingProduct['Prix Promo'],
        new_price: newBFPrice
      };

      // Update Dolibarr price
      const response = await fetch('https://phpstack-937973-4763176.cloudwaysapps.com/update_price_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_price',
          ...updatedFields,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update price');
      }

      const updatedProduct = {
        ...editingProduct,
        'Prix Promo': newBFPrice,
      };

      await onUpdateBFPrice(newBFPrice, newInitialPrice, updatedProduct);
      onClose();
    } catch (error) {
      console.error('Error updating price:', error);
      alert(`Error updating price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setter(value === '' ? 0 : parseInt(value, 10));
  };

  const handleRestorePrice = () => {
    if (editingProduct) {
      setNewBFPrice(editingProduct['Prix Promo']);
    }
  };

  // Add this handler for overlay clicks
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!editingProduct) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" 
          onClick={handleOverlayClick}
        />
        <Dialog.Content 
          className="fixed inset-0 z-[60] overflow-y-auto"
          onPointerDownOutside={onClose}
          onEscapeKeyDown={onClose}
        >
          <div className="min-h-full flex items-center justify-center p-4" onClick={handleOverlayClick}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white w-full max-w-[90vw] rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <h2 className="text-sm font-semibold">{editingProduct['Libellé']}</h2>
                    <div className="mt-0.5 flex items-center space-x-2 text-xs text-white/80">
                      <span className="flex items-center">
                        <FiTag className="mr-1 h-3 w-3" />
                        {editingProduct['Ref. produit']}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClose}
                    className="text-white hover:bg-white/10"
                  >
                    <FiX className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-12 gap-4">
                  {/* Left Column - Image, Stock, and Supplier Receptions */}
                  <div className="col-span-3 space-y-4">
                    {/* Product Image */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="h-[200px] rounded-lg overflow-hidden bg-white border border-gray-200 shadow-sm"
                    >
                      {isImageLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <Spinner size="large" />
                        </div>
                      ) : (
                        <div className="relative w-full h-full">
                          <Image
                            src={productImage || 'https://via.placeholder.com/400'}
                            alt={editingProduct['Libellé']}
                            fill
                            className="object-contain"
                            priority
                          />
                        </div>
                      )}
                    </motion.div>

                    {/* Stock Distribution */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 overflow-hidden h-[232px]"
                    >
                      <div className="px-3 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <FiBox className="h-3.5 w-3.5" />
                            <h3 className="text-xs font-medium">Distribution du stock</h3>
                          </div>
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                            Stock Total: {editingProduct['Total Stock']}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 space-y-4 h-[calc(100%-36px)]">
                        {/* SKE Stock - Full Width */}
                        <motion.div 
                          className={cn(
                            "flex items-center justify-between p-3 h-[44px] rounded-md text-xs w-full",
                            editingProduct['Stock Frimoda'] === 0
                              ? "bg-gradient-to-br from-red-500 to-red-600 border border-red-400 text-white" 
                              : "bg-gradient-to-br from-blue-50 to-indigo-100/80 border border-blue-200 hover:from-blue-100 hover:to-indigo-200/80 transition-colors"
                          )}
                        >
                          <div className="flex items-center space-x-1.5">
                            <span className={cn(
                              "font-medium",
                              editingProduct['Stock Frimoda'] === 0 ? "text-white" : "text-blue-800"
                            )}>Stock SKE</span>
                            {editingProduct['Stock Frimoda'] === 0 && (
                              <FiAlertTriangle className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span className={cn(
                            "font-bold px-2 py-0.5 rounded",
                            editingProduct['Stock Frimoda'] === 0
                              ? "bg-white/20 text-white" 
                              : "bg-white/50 text-blue-700"
                          )}>
                            {editingProduct['Stock Frimoda']}
                          </span>
                        </motion.div>

                        {/* Other Stocks - Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          {['Casa', 'Rabat', 'Marrakech', 'Tanger'].map((store) => {
                            const stockKey = `Stock ${store}` as keyof Product;
                            const stockValue = editingProduct[stockKey];
                            const isZeroStock = typeof stockValue === 'number' && stockValue === 0;
                            
                            return (
                              <motion.div 
                                key={store}
                                className={cn(
                                  "flex items-center justify-between p-3 h-[44px] rounded-md text-xs",
                                  isZeroStock 
                                    ? "bg-gradient-to-br from-red-500 to-red-600 border border-red-400 text-white" 
                                    : "bg-gradient-to-br from-blue-50 to-indigo-100/80 border border-blue-200 hover:from-blue-100 hover:to-indigo-200/80 transition-colors"
                                )}
                              >
                                <div className="flex items-center space-x-1.5">
                                  <span className={cn(
                                    "font-medium",
                                    isZeroStock ? "text-white" : "text-blue-800"
                                  )}>{store}</span>
                                  {isZeroStock && (
                                    <FiAlertTriangle className="h-3 w-3 text-white" />
                                  )}
                                </div>
                                <span className={cn(
                                  "font-bold px-2 py-0.5 rounded",
                                  isZeroStock 
                                    ? "bg-white/20 text-white" 
                                    : "bg-white/50 text-blue-700"
                                )}>
                                  {typeof stockValue === 'number' ? stockValue : 0}
                                </span>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>

                    {/* Factory Reception Chart */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <FiPackage className="h-3.5 w-3.5" />
                            <h3 className="text-xs font-medium">Réceptions usine</h3>
                          </div>
                          <div className="flex items-center space-x-2">
                            <select
                              value={timeAggregation}
                              onChange={(e) => setTimeAggregation(e.target.value as TimeAggregation)}
                              className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                            >
                              <option value="day">Jours</option>
                              <option value="week">Semaines</option>
                              <option value="month">Mois</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="h-[200px]">
                          {supplierReceptions.length > 0 ? (
                            <BarChart
                              series={[
                                {
                                  data: getAggregatedData(supplierReceptions, timeAggregation).map(r => r.qte_recus),
                                  label: 'Quantité reçue',
                                  color: '#8b5cf6',
                                  valueFormatter: (value: number | null, index: number) => {
                                    if (value === null || index === undefined) return '';
                                    const data = getAggregatedData(supplierReceptions, timeAggregation);
                                    const item = data[index];
                                    if (!item) return '';

                                    const date = new Date(item.date_reception);
                                    let dateStr = '';

                                    switch (timeAggregation) {
                                      case 'month':
                                        dateStr = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                                        break;
                                      case 'week':
                                        const weekRange = getWeekRange(item.date_reception);
                                        dateStr = `Semaine ${weekRange.weekNum}\nDu ${weekRange.start} au ${weekRange.end}`;
                                        break;
                                      case 'day':
                                        dateStr = date.toLocaleDateString('fr-FR', { 
                                          weekday: 'long',
                                          day: 'numeric',
                                          month: 'long'
                                        });
                                        break;
                                    }

                                    return `${value} unités\n${dateStr}`;
                                  },
                                }
                              ]}
                              xAxis={[{
                                data: getAggregatedData(supplierReceptions, timeAggregation).map(r => {
                                  const date = new Date(r.date_reception);
                                  switch (timeAggregation) {
                                    case 'month':
                                      return date.toLocaleDateString('fr-FR', { 
                                        month: 'short'
                                      }).replace('.', '');
                                    case 'week':
                                      return `S${getWeekNumber(date)}`;
                                    case 'day':
                                      return date.toLocaleDateString('fr-FR', { 
                                        day: '2-digit',
                                        month: '2-digit'
                                      });
                                  }
                                }),
                                scaleType: 'band',
                                tickLabelStyle: {
                                  fontSize: 9,
                                  angle: 0, // Remove the angle for better readability
                                  textAnchor: 'middle'
                                }
                              }]}
                              yAxis={[{
                                min: 0,
                                max: Math.max(
                                  ...getAggregatedData(supplierReceptions, timeAggregation).map(r => r.qte_recus)
                                ) * 1.2,
                                tickNumber: 5,
                                tickLabelStyle: {
                                  fontSize: 10,
                                }
                              }]}
                              height={200}
                              margin={{ left: 35, right: 10, top: 20, bottom: 25 }} // Reduced bottom margin
                              slotProps={{
                                legend: { hidden: true }
                              }}
                              tooltip={{
                                trigger: 'item'
                              }}
                            >
                              <BarPlot />
                            </BarChart>
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                              Aucune réception usine dans les 3 derniers mois
                            </div>
                          )}
                        </div>
                        {/* Total Reception Summary */}
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                          <span>
                            Total reçu: {
                              getAggregatedData(supplierReceptions, timeAggregation)
                                .reduce((sum, item) => sum + item.qte_recus, 0)
                            } unités
                          </span>
                          <span>
                            {timeAggregation === 'day' ? '15 derniers jours' : 
                             timeAggregation === 'week' ? '18 dernières semaines' : 
                             '6 derniers mois'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Right Column - Now only has Performance and Price Analysis */}
                  <div className="col-span-9 space-y-4">
                    {/* Performance Section */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        <div className="flex items-center space-x-1.5">
                          <FiBarChart2 className="h-3.5 w-3.5" />
                          <h3 className="text-xs font-medium">Performance des ventes</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Chart and Metrics in a grid */}
                        <div className="grid grid-cols-4 gap-4">
                          {/* Chart takes 3 columns */}
                          <div className="col-span-3">
                            {salesMetrics && (
                              <div className="h-[300px]">
                                <LineChart
                                  series={[
                                    {
                                      data: salesMetrics.dailyData.map(d => d.units),
                                      label: 'Unités vendues',
                                      color: '#3b82f6',
                                      showMark: true,
                                      curve: "natural",
                                      valueFormatter: (value) => `${value} unités`,
                                    }
                                  ]}
                                  xAxis={[{
                                    data: salesMetrics.dailyData.map(d => new Date(d.date).toLocaleDateString('fr-FR', { 
                                      day: '2-digit',
                                      month: 'short'
                                    })),
                                    scaleType: 'point',
                                    tickLabelStyle: {
                                      angle: 45,
                                      textAnchor: 'start',
                                      fontSize: 12,
                                    }
                                  }]}
                                  yAxis={[{
                                    min: 0,
                                    max: Math.max(...salesMetrics.dailyData.map(d => d.units)) * 1.2,
                                    tickNumber: 5,
                                    tickLabelStyle: {
                                      fontSize: 12,
                                    }
                                  }]}
                                  height={400}
                                  margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
                                  slotProps={{
                                    legend: { hidden: true }
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Metrics Cards take 1 column, stacked vertically */}
                          <div className="space-y-3">
                            {/* SKE Coverage Card */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100 p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-blue-900">Couverture SKE</span>
                                <FiBox className="h-3 w-3 text-blue-500" />
                              </div>
                              <div className="text-xl font-bold text-blue-900">
                                {salesMetrics?.salesVelocity && editingProduct['Stock Frimoda']
                                  ? Math.round(editingProduct['Stock Frimoda'] / salesMetrics.salesVelocity)
                                  : 0}
                              </div>
                              <div className="mt-0.5 text-xs text-blue-600">jours SKE</div>
                            </div>

                            {/* Total Coverage Card */}
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100 p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-purple-900">Couverture Totale</span>
                                <FiPackage className="h-3 w-3 text-purple-500" />
                              </div>
                              <div className="text-xl font-bold text-purple-900">
                                {salesMetrics?.salesVelocity && editingProduct['Total Stock']
                                  ? Math.round(editingProduct['Total Stock'] / salesMetrics.salesVelocity)
                                  : 0}
                              </div>
                              <div className="mt-0.5 text-xs text-purple-600">jours total</div>
                            </div>

                            {/* Revenue Card */}
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-100 p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-emerald-900">CA (28j)</span>
                                <FiDollarSign className="h-3 w-3 text-emerald-500" />
                              </div>
                              <div className="text-xl font-bold text-emerald-900">
                                {formatNumber(salesMetrics?.totals.revenue ?? 0)} DH
                              </div>
                              <div className="mt-0.5 text-xs text-emerald-600">
                                {formatNumber(Math.round((salesMetrics?.totals.revenue ?? 0) / 28))} DH/jour
                              </div>
                            </div>

                            {/* Velocity Card */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100 p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-amber-900">Vélocité</span>
                                <FiActivity className="h-3 w-3 text-amber-500" />
                              </div>
                              <div className="text-xl font-bold text-amber-900">
                                {salesMetrics?.salesVelocity.toFixed(1) ?? '0.0'}
                              </div>
                              <div className="mt-0.5 text-xs text-amber-600">unités/jour</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Price Analysis Section */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                        <div className="flex items-center space-x-1.5">
                          <FiTrendingUp className="h-3.5 w-3.5" />
                          <h3 className="text-xs font-medium">Analyse des prix</h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-3 gap-4">
                          {/* Current Price Card */}
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-3">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-medium text-gray-600">Prix actuel</label>
                              <FiTag className="h-3 w-3 text-gray-500" />
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {formatNumber(editingProduct['Prix Promo'])} DH
                            </div>
                          </div>

                          {/* Prix de revient Card */}
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-3">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-medium text-blue-700">Prix de revient usine TTC</label>
                              <FiPackage className="h-3 w-3 text-blue-500" />
                            </div>
                            {crValue ? (
                              <>
                                <div className="text-lg font-bold text-blue-900">
                                  {formatNumber(Math.round(crValue))} DH
                                </div>
                                <div className="mt-1 text-xs text-blue-600">
                                  Marge actuelle: {formatNumber(Math.round(editingProduct['Prix Promo'] - crValue))} DH 
                                  ({Math.round(((editingProduct['Prix Promo'] - crValue) / editingProduct['Prix Promo']) * 100)}%)
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-blue-800 mt-1">
                                Prix de revient non disponible
                              </div>
                            )}
                          </div>

                          {/* New Price Input Card */}
                          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 p-3">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-medium text-emerald-700">Nouveau prix</label>
                              <FiTrendingUp className="h-3 w-3 text-emerald-500" />
                            </div>
                            <div className="mt-1 relative">
                              <input
                                ref={newPriceInputRef}
                                type="text"
                                inputMode="numeric"
                                pattern="\d*"
                                value={newBFPrice || ''}
                                onChange={handleInputChange(setNewBFPrice)}
                                className="w-full h-8 px-2 rounded-md border-emerald-200 text-base font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-16"
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                                <button
                                  onClick={handleRestorePrice}
                                  className="p-1 hover:bg-emerald-100 rounded-md text-emerald-600 transition-colors"
                                  title="Restaurer le prix original"
                                >
                                  <FiRotateCcw className="h-3.5 w-3.5" />
                                </button>
                                <span className="text-emerald-600 text-xs">DH</span>
                              </div>
                            </div>
                            {crValue && newBFPrice !== editingProduct['Prix Promo'] && (
                              <div className="mt-1 text-xs">
                                <span className="text-gray-600">Nouvelle marge:</span>
                                <span className={cn(
                                  "ml-1 font-medium",
                                  (newBFPrice - crValue) > (editingProduct['Prix Promo'] - crValue)
                                    ? "text-emerald-600" 
                                    : "text-red-600"
                                )}>
                                  {formatNumber(Math.round(newBFPrice - crValue))} DH
                                  ({Math.round(((newBFPrice - crValue) / newBFPrice) * 100)}%)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* AI Pricing Analysis */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <FiTrendingUp className="h-3.5 w-3.5" />
                            <h3 className="text-xs font-medium">Analyse IA des prix</h3>
                          </div>
                          {!isAiLoading && (
                            <Button
                              onClick={fetchAIPricingAnalysis}
                              size="xs"
                              className="bg-white/10 hover:bg-white/20 text-white"
                            >
                              Actualiser
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        {isAiLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Spinner />
                            <span className="ml-3 text-sm text-gray-500">
                              Analyse en cours...
                            </span>
                          </div>
                        ) : aiAnalysis ? (
                          <div className="space-y-4">
                            {/* Recommendation Header */}
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">
                                  Recommandation
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Basé sur l&apos;analyse des données historiques
                                </p>
                              </div>
                              <div className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                aiAnalysis.confidence === 'high' 
                                  ? "bg-green-100 text-green-800"
                                  : aiAnalysis.confidence === 'medium'
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              )}>
                                Confiance {
                                  aiAnalysis.confidence === 'high' ? 'élevée' :
                                  aiAnalysis.confidence === 'medium' ? 'moyenne' : 'faible'
                                }
                              </div>
                            </div>

                            {/* Analysis Points */}
                            <div className="space-y-2">
                              {aiAnalysis.reasoning.map((reason, index) => (
                                <div key={index} className="flex items-start space-x-2 text-sm">
                                  <div className="mt-1">•</div>
                                  <div>{reason}</div>
                                </div>
                              ))}
                            </div>

                            {/* Price Recommendation */}
                            {aiAnalysis.recommendedPrice && (
                              <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-lg border border-violet-200 p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-violet-900">
                                      Prix recommandé
                                    </div>
                                    <div className="text-2xl font-bold text-violet-700 mt-1">
                                      {formatNumber(aiAnalysis.recommendedPrice)} DH
                                    </div>
                                    {/* Add price change indicator */}
                                    <div className={cn(
                                      "text-xs mt-1",
                                      aiAnalysis.recommendedPrice > editingProduct['Prix Promo'] 
                                        ? "text-emerald-600" 
                                        : "text-red-600"
                                    )}>
                                      {aiAnalysis.recommendedPrice > editingProduct['Prix Promo'] ? '+' : ''}
                                      {formatNumber(aiAnalysis.recommendedPrice - editingProduct['Prix Promo'])} DH
                                      ({Math.round(((aiAnalysis.recommendedPrice - editingProduct['Prix Promo']) / editingProduct['Prix Promo']) * 100)}%)
                                    </div>
                                  </div>
                                  <Button
                                    onClick={() => setNewBFPrice(aiAnalysis.recommendedPrice!)}
                                    className="bg-violet-600 hover:bg-violet-700 text-white"
                                    size="sm"
                                  >
                                    Appliquer
                                  </Button>
                                </div>
                                
                                {/* Detailed Margin Analysis */}
                                <div className="mt-4 space-y-3">
                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    {/* Current Margin */}
                                    <div className="bg-gray-50 p-2 rounded-lg">
                                      <span className="text-gray-600">Marge actuelle:</span>
                                      <div className="font-medium mt-0.5">
                                        {crValue && (
                                          <>
                                            <div>{formatNumber(Math.round(editingProduct['Prix Promo'] - crValue))} DH</div>
                                            <div className="text-gray-500">
                                              ({Math.round(((editingProduct['Prix Promo'] - crValue) / editingProduct['Prix Promo']) * 100)}%)
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* New Margin */}
                                    <div className="bg-violet-50 p-2 rounded-lg">
                                      <span className="text-violet-600">Nouvelle marge:</span>
                                      <div className="font-medium mt-0.5">
                                        {crValue && (
                                          <>
                                            <div>{formatNumber(Math.round(aiAnalysis.recommendedPrice - crValue))} DH</div>
                                            <div className={cn(
                                              ((aiAnalysis.recommendedPrice - crValue) / aiAnalysis.recommendedPrice) > 
                                              ((editingProduct['Prix Promo'] - crValue) / editingProduct['Prix Promo'])
                                                ? "text-emerald-600" 
                                                : "text-red-600"
                                              )}>
                                              ({Math.round(((aiAnalysis.recommendedPrice - crValue) / aiAnalysis.recommendedPrice) * 100)}%)
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Sales Impact */}
                                  <div className="border-t border-violet-100 pt-3 grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                      <span className="text-violet-600">Vélocité actuelle:</span>
                                      <div className="font-medium mt-0.5">
                                        {salesMetrics?.salesVelocity.toFixed(2)} unités/jour
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-violet-600">Vélocité estimée:</span>
                                      <div className="font-medium mt-0.5">
                                        {aiAnalysis.impact.expectedSales.toFixed(2)} unités/jour
                                        <span className={cn(
                                          "ml-1",
                                          aiAnalysis.impact.expectedSales > (salesMetrics?.salesVelocity || 0)
                                            ? "text-emerald-600"
                                            : "text-red-600"
                                        )}>
                                          ({((aiAnalysis.impact.expectedSales / (salesMetrics?.salesVelocity || 1)) * 100 - 100).toFixed(1)}%)
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Risks Section */}
                            {aiAnalysis.risks.length > 0 && (
                              <div className="mt-4">
                                <h5 className="text-sm font-medium text-gray-900 mb-2">
                                  Risques potentiels
                                </h5>
                                <div className="space-y-1">
                                  {aiAnalysis.risks.map((risk, index) => (
                                    <div key={index} className="flex items-start space-x-2 text-sm text-red-600">
                                      <FiAlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                      <span>{risk}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 text-center py-4">
                            Erreur lors de l&apos;analyse IA
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Dernière mise à jour: {new Date().toLocaleDateString('fr-FR', { 
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={onClose}
                    variant="outline"
                    size="sm"
                    className="text-gray-700"
                    disabled={isUpdating}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleUpdateBFPrice}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[90px]"
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Spinner size="small" /> : 'Mettre à jour'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

