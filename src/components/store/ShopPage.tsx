'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  PackageOpen,
} from 'lucide-react';
import { useRouterStore } from '@/stores/useRouterStore';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import ProductCard, { type ProductData } from './ProductCard';
import QuickViewModal from './QuickViewModal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Filters {
  category: string;
  search: string;
  minPrice: string;
  maxPrice: string;
  sizes: string[];
  colors: string[];
  rating: string;
  onSale: boolean;
  sort: string;
}

const defaultFilters: Filters = {
  category: '',
  search: '',
  minPrice: '',
  maxPrice: '',
  sizes: [],
  colors: [],
  rating: '',
  onSale: false,
  sort: 'newest',
};

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const colorOptions = [
  { name: 'Black', value: 'Black' },
  { name: 'White', value: 'White' },
  { name: 'Red', value: 'Red' },
  { name: 'Blue', value: 'Blue' },
  { name: 'Green', value: 'Green' },
  { name: 'Navy', value: 'Navy' },
  { name: 'Pink', value: 'Pink' },
  { name: 'Gray', value: 'Gray' },
  { name: 'Brown', value: 'Brown' },
  { name: 'Beige', value: 'Beige' },
];

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Most Popular', value: 'popular' },
  { label: 'Top Rated', value: 'top_rated' },
];

/* ------------------------------------------------------------------ */
/*  Filter Sidebar                                                     */
/* ------------------------------------------------------------------ */

function FilterSidebar({
  filters,
  setFilters,
  categories,
  onClear,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  categories: Category[];
  onClear: () => void;
}) {
  const activeCount = [
    filters.category,
    filters.search,
    filters.minPrice,
    filters.maxPrice,
    filters.rating,
    filters.onSale,
    ...filters.sizes,
    ...filters.colors,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">{activeCount}</Badge>
          )}
        </h3>
        {activeCount > 0 && (
          <button onClick={onClear} className="text-xs text-amber-600 hover:text-amber-700 font-medium">
            Clear All
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-3">Category</h4>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={filters.category === cat.name}
                onCheckedChange={(checked) =>
                  setFilters((f) => ({ ...f, category: checked ? cat.name : '' }))
                }
                className="data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
              />
              <span className="text-sm text-neutral-600 group-hover:text-neutral-900 transition-colors">
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-3">Price Range</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-neutral-400"
          />
          <span className="text-neutral-400">—</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-neutral-400"
          />
        </div>
      </div>

      {/* Size */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-3">Size</h4>
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map((size) => (
            <button
              key={size}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  sizes: f.sizes.includes(size)
                    ? f.sizes.filter((s) => s !== size)
                    : [...f.sizes, size],
                }))
              }
              className={`px-3 py-1.5 text-xs font-medium border rounded-md transition-all ${
                filters.sizes.includes(size)
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-3">Color</h4>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  colors: f.colors.includes(color.value)
                    ? f.colors.filter((c) => c !== color.value)
                    : [...f.colors, color.value],
                }))
              }
              className={`px-3 py-1.5 text-xs font-medium border rounded-md transition-all ${
                filters.colors.includes(color.value)
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {color.name}
            </button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-3">Rating</h4>
        <div className="space-y-2">
          {['4', '3', '2', '1'].map((r) => (
            <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={filters.rating === r}
                onCheckedChange={(checked) =>
                  setFilters((f) => ({ ...f, rating: checked ? r : '' }))
                }
                className="data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
              />
              <span className="text-sm text-neutral-600 group-hover:text-neutral-900">
                {r}+ Stars
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* On Sale */}
      <div>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <Checkbox
            checked={filters.onSale}
            onCheckedChange={(checked) =>
              setFilters((f) => ({ ...f, onSale: !!checked }))
            }
            className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
          />
          <span className="text-sm text-neutral-600 group-hover:text-neutral-900 font-medium">
            On Sale Only
          </span>
        </label>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shop Page                                                          */
/* ------------------------------------------------------------------ */

export default function ShopPage() {
  const params = useRouterStore((s) => s.params);
  const navigate = useRouterStore((s) => s.navigate);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductData | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Initialize filters from URL params
  const [filters, setFilters] = useState<Filters>(() => ({
    ...defaultFilters,
    category: params.category || '',
    search: params.search || '',
    onSale: params.onSale === 'true',
    ...(params.newArrival === 'true' && { sort: 'newest' }),
  }));

  // Re-sync from router params on change
  useEffect(() => {
    setFilters((f) => ({
      ...f,
      category: params.category || '',
      search: params.search || '',
      onSale: params.onSale === 'true',
    }));
  }, [params.category, params.search, params.onSale]);

  // Fetch categories
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/categories'), { headers: getAuthHeaders() });
        const data = await res.json();
        if (!cancelled && data.success) setCategories(data.data || []);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Build query string from filters
  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    if (filters.category) q.set('category', filters.category);
    if (filters.search) q.set('search', filters.search);
    if (filters.minPrice) q.set('minPrice', filters.minPrice);
    if (filters.maxPrice) q.set('maxPrice', filters.maxPrice);
    if (filters.sizes.length) q.set('sizes', filters.sizes.join(','));
    if (filters.colors.length) q.set('colors', filters.colors.join(','));
    if (filters.rating) q.set('rating', filters.rating);
    if (filters.onSale) q.set('onSale', 'true');
    q.set('sort', filters.sort);
    q.set('page', String(pagination.page));
    q.set('limit', '12');
    return q.toString();
  }, [filters, pagination.page]);

  // Fetch products
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/products?${queryString}`), { headers: getAuthHeaders() });
        const data = await res.json();
        if (!cancelled && data.success) {
          setProducts(data.data.products || []);
          setPagination(data.data.pagination || { page: 1, limit: 12, total: 0, pages: 0 });
        }
      } catch { /* silent */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [queryString]);

  const clearFilters = () => {
    setFilters({ ...defaultFilters });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((p) => ({ ...p, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFilterCount = [
    filters.category,
    filters.search,
    filters.minPrice,
    filters.maxPrice,
    filters.rating,
    filters.onSale,
    ...filters.sizes,
    ...filters.colors,
  ].filter(Boolean).length;

  const pageTitle = filters.category
    ? `${filters.category} Collection`
    : filters.search
      ? `Search: "${filters.search}"`
      : 'All Products';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900"
        >
          {pageTitle}
        </motion.h1>
        {!loading && (
          <p className="text-sm text-neutral-500 mt-1">
            Showing {products.length} of {pagination.total} products
          </p>
        )}
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-28">
            <FilterSidebar
              filters={filters}
              setFilters={setFilters}
              categories={categories}
              onClear={clearFilters}
            />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6 gap-4">
            {/* Mobile Filter Button */}
            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] ml-1">{activeFilterCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetTitle className="sr-only">Filters</SheetTitle>
                <div className="pt-6">
                  <FilterSidebar
                    filters={filters}
                    setFilters={setFilters}
                    categories={categories}
                    onClear={clearFilters}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Search on mobile */}
            <div className="flex-1 lg:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-neutral-400"
                />
              </div>
            </div>

            {/* Sort */}
            <Select
              value={filters.sort}
              onValueChange={(v) => setFilters((f) => ({ ...f, sort: v }))}
            >
              <SelectTrigger className="w-[180px] text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {filters.category && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {filters.category}
                  <button onClick={() => setFilters((f) => ({ ...f, category: '' }))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.search && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  &quot;{filters.search}&quot;
                  <button onClick={() => setFilters((f) => ({ ...f, search: '' }))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.sizes.map((size) => (
                <Badge key={size} variant="secondary" className="gap-1 text-xs">
                  Size: {size}
                  <button onClick={() => setFilters((f) => ({ ...f, sizes: f.sizes.filter((s) => s !== size) }))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {filters.colors.map((color) => (
                <Badge key={color} variant="secondary" className="gap-1 text-xs">
                  {color}
                  <button onClick={() => setFilters((f) => ({ ...f, colors: f.colors.filter((c) => c !== color) }))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {filters.onSale && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  On Sale
                  <button onClick={() => setFilters((f) => ({ ...f, onSale: false }))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 lg:gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <ProductCard key={i} isLoading />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <PackageOpen className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">No products found</h3>
              <p className="text-sm text-neutral-500 mb-6">
                Try adjusting your filters or search criteria
              </p>
              <Button onClick={clearFilters} variant="outline">
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 lg:gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} onQuickView={setQuickViewProduct} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(pagination.pages, 7) }).map((_, i) => {
                  let pageNum: number;
                  if (pagination.pages <= 7) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 4) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.pages - 3) {
                    pageNum = pagination.pages - 6 + i;
                  } else {
                    pageNum = pagination.page - 3 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-9 h-9 p-0 ${
                        pagination.page === pageNum
                          ? 'bg-neutral-900 hover:bg-neutral-800'
                          : ''
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal product={quickViewProduct} open={!!quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </div>
  );
}
