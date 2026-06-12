'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useRouterStore } from '@/stores/useRouterStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useCartStore } from '@/stores/useCartStore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function WishlistPage() {
  const { navigate } = useRouterStore();
  const { isAuthenticated } = useAuthStore();
  const { items, fetchWishlist, removeItem, isLoading } = useWishlistStore();
  const { addItem: addToCart } = useCartStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated, fetchWishlist]);

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart(productId, 1);
      toast.success('Added to cart!');
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  const handleAddAllToCart = async () => {
    for (const item of items) {
      try {
        await addToCart(item.productId, 1);
      } catch {
        // continue
      }
    }
    toast.success(`${items.length} items added to cart!`);
  };

  const handleRemove = async (id: string) => {
    try {
      await removeItem(id);
      toast.success('Removed from wishlist');
    } catch {
      toast.error('Failed to remove');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Heart className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
        <h2 className="text-2xl font-serif text-neutral-900 mb-2">Sign in to view your wishlist</h2>
        <Button className="bg-neutral-900 text-white mt-4" onClick={() => navigate('auth', { mode: 'login' })}>
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-serif text-neutral-900">Wishlist</h1>
        {items.length > 0 && (
          <Button className="bg-neutral-900 text-white" onClick={handleAddAllToCart}>
            <ShoppingBag className="w-4 h-4 mr-2" /> Add All to Cart
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <Heart className="w-20 h-20 mx-auto text-neutral-200 mb-6" />
          <h2 className="text-2xl font-serif text-neutral-900 mb-3">Your wishlist is empty</h2>
          <p className="text-neutral-500 mb-8 max-w-md mx-auto">
            Save items you love for later. Click the heart icon on any product to add it here.
          </p>
          <Button className="bg-neutral-900 text-white" onClick={() => navigate('shop')}>
            Explore Products <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group border border-neutral-100 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
            >
              <div
                className="relative aspect-square bg-neutral-100 cursor-pointer"
                onClick={() => navigate('product', { id: item.productId })}
              >
                <img
                  src={item.product.images?.[0] || '/placeholder.jpg'}
                  alt={item.product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.id);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors"
                >
                  <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                </button>
                {item.product.salePrice && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded">
                    Sale
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <p className="text-sm font-medium text-neutral-900 truncate">{item.product.name}</p>
                  <p className="text-xs text-neutral-500">{item.product.brand}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-900">
                    ${(item.product.salePrice || item.product.price).toFixed(2)}
                  </span>
                  {item.product.salePrice && (
                    <span className="text-xs text-neutral-400 line-through">
                      ${item.product.price.toFixed(2)}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full bg-neutral-900 text-white text-xs h-8"
                  onClick={() => handleAddToCart(item.productId)}
                >
                  <ShoppingBag className="w-3 h-3 mr-1" /> Add to Cart
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
