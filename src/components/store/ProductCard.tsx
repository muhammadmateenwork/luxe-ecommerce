'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Eye, Star } from 'lucide-react';
import { useRouterStore } from '@/stores/useRouterStore';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export interface ProductData {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  images: string[];
  category: string;
  averageRating: number;
  totalReviews: number;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isFlashSale: boolean;
  brand?: string;
  description?: string;
  sizes?: string[];
  colors?: string[];
  stock?: number;
}

interface ProductCardProps {
  product?: ProductData;
  isLoading?: boolean;
  onQuickView?: (product: ProductData) => void;
}

export function ProductCardSkeleton() {
  return (
    <div className="group">
      <Skeleton className="aspect-[3/4] w-full rounded-lg" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-neutral-200 text-neutral-200'
          }`}
        />
      ))}
    </div>
  );
}

export default function ProductCard({ product, isLoading, onQuickView }: ProductCardProps) {
  const navigate = useRouterStore((s) => s.navigate);
  const { isInWishlist, addItem, removeItem, items } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  if (isLoading || !product) {
    return <ProductCardSkeleton />;
  }

  const inWishlist = isInWishlist(product.id);
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0;

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wishlistLoading) return;
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      navigate('auth', { mode: 'login' });
      return;
    }
    setWishlistLoading(true);
    try {
      if (inWishlist) {
        const wishlistItem = items.find((item) => item.productId === product.id);
        if (wishlistItem) await removeItem(wishlistItem.id);
      } else {
        await addItem(product.id);
      }
    } catch {
      toast.error('Failed to update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView?.(product);
  };

  const handleCardClick = () => {
    navigate('product', { id: product.id });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group cursor-pointer"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100">
        {/* Main Image */}
        <img
          src={product.images[0] || '/placeholder.jpg'}
          alt={product.name}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-transform duration-700 ${
            isHovered ? 'scale-110' : 'scale-100'
          } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Loading skeleton */}
        {!imageLoaded && (
          <Skeleton className="absolute inset-0" />
        )}

        {/* Hover Image (second image if available) */}
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt={product.name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {product.isNewArrival && (
            <Badge className="bg-neutral-900 text-white text-[10px] font-bold tracking-wider hover:bg-neutral-900">
              NEW
            </Badge>
          )}
          {hasDiscount && (
            <Badge className="bg-amber-500 text-white text-[10px] font-bold tracking-wider hover:bg-amber-500">
              -{discountPercent}%
            </Badge>
          )}
          {product.isBestSeller && (
            <Badge className="bg-emerald-600 text-white text-[10px] font-bold tracking-wider hover:bg-emerald-600">
              BEST SELLER
            </Badge>
          )}
          {product.isFlashSale && (
            <Badge className="bg-red-500 text-white text-[10px] font-bold tracking-wider hover:bg-red-500">
              FLASH SALE
            </Badge>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-300 ${
            isHovered || inWishlist
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-2'
          } ${inWishlist ? 'bg-red-50' : 'bg-white/90 hover:bg-white'}`}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              inWishlist ? 'fill-red-500 text-red-500' : 'text-neutral-600'
            }`}
          />
        </button>

        {/* Quick View Button */}
        <button
          onClick={handleQuickView}
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 bg-white/95 backdrop-blur-sm text-neutral-900 text-xs font-semibold tracking-wider rounded-full transition-all duration-300 hover:bg-white ${
            isHovered
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <Eye className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
          QUICK VIEW
        </button>
      </div>

      {/* Product Info */}
      <div className="mt-3 space-y-1">
        {/* Category */}
        <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium">
          {product.category}
        </p>

        {/* Name */}
        <h3 className="text-sm font-medium text-neutral-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        {product.averageRating > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={product.averageRating} />
            <span className="text-[11px] text-neutral-400">
              ({product.totalReviews})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          {hasDiscount ? (
            <>
              <span className="text-sm font-semibold text-amber-600">
                ${product.salePrice!.toFixed(2)}
              </span>
              <span className="text-sm text-neutral-400 line-through">
                ${product.price.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-sm font-semibold text-neutral-900">
              ${product.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export { StarRating };
