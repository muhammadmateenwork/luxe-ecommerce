'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, ExternalLink, Minus, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouterStore } from '@/stores/useRouterStore';
import { useCartStore } from '@/stores/useCartStore';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { StarRating } from './ProductCard';
import type { ProductData } from './ProductCard';
import { toast } from 'sonner';

interface QuickViewModalProps {
  product: ProductData | null;
  open: boolean;
  onClose: () => void;
}

export default function QuickViewModal({ product, open, onClose }: QuickViewModalProps) {
  const navigate = useRouterStore((s) => s.navigate);
  const addItem = useCartStore((s) => s.addItem);
  const { isInWishlist, addItem: addWishlist, removeItem: removeWishlist, items } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const inWishlist = isInWishlist(product.id);
  const hasDiscount = product.salePrice && product.salePrice < product.price;

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      onClose();
      navigate('auth', { mode: 'login' });
      return;
    }
    setIsAdding(true);
    try {
      await addItem(product.id, quantity, selectedSize || undefined, selectedColor || undefined);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to wishlist');
      onClose();
      navigate('auth', { mode: 'login' });
      return;
    }
    try {
      if (inWishlist) {
        const wishlistItem = items.find((item) => item.productId === product.id);
        if (wishlistItem) await removeWishlist(wishlistItem.id);
      } else {
        await addWishlist(product.id);
      }
    } catch {
      toast.error('Failed to update wishlist');
    }
  };

  const handleViewFullDetails = () => {
    onClose();
    navigate('product', { id: product.id });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">{product.name} - Quick View</DialogTitle>
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-1/2 aspect-square md:aspect-auto bg-neutral-100 relative">
            <img
              src={product.images[0] || '/placeholder.jpg'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {hasDiscount && (
              <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded">
                -{Math.round(((product.price - product.salePrice!) / product.price) * 100)}%
              </div>
            )}
          </div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="md:w-1/2 p-6 flex flex-col"
          >
            {/* Category */}
            <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium mb-1">
              {product.category}
            </p>

            {/* Name */}
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              {product.name}
            </h2>

            {/* Rating */}
            {product.averageRating > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <StarRating rating={product.averageRating} />
                <span className="text-xs text-neutral-500">
                  ({product.totalReviews} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3 mb-4">
              {hasDiscount ? (
                <>
                  <span className="text-2xl font-bold text-amber-600">
                    ${product.salePrice!.toFixed(2)}
                  </span>
                  <span className="text-lg text-neutral-400 line-through">
                    ${product.price.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-neutral-900">
                  ${product.price.toFixed(2)}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-neutral-600 leading-relaxed mb-4 line-clamp-3">
                {product.description}
              </p>
            )}

            {/* Size Selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                  Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-1.5 text-xs font-medium border rounded-md transition-all ${
                        selectedSize === size
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selector */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                  Color
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-3 py-1.5 text-xs font-medium border rounded-md transition-all ${
                        selectedColor === color
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                Quantity
              </p>
              <div className="flex items-center border border-neutral-200 rounded-md w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="px-4 py-1.5 text-sm font-medium text-neutral-900 min-w-[40px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={handleAddToCart}
                disabled={isAdding}
                className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  added
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                } disabled:opacity-50`}
              >
                <ShoppingCart className="h-4 w-4" />
                {added ? 'Added to Cart!' : isAdding ? 'Adding...' : 'Add to Cart'}
              </button>
              <button
                onClick={handleWishlistToggle}
                className={`p-3 border rounded-lg transition-all ${
                  inWishlist
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}
              >
                <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* View Full Details */}
            <button
              onClick={handleViewFullDetails}
              className="mt-4 text-sm text-neutral-500 hover:text-neutral-900 transition-colors flex items-center justify-center gap-1.5"
            >
              View Full Details
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
