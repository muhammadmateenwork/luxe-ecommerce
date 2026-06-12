'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, Tag, Truck } from 'lucide-react';
import { useRouterStore } from '@/stores/useRouterStore';
import { useCartStore } from '@/stores/useCartStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function CartPage() {
  const { navigate } = useRouterStore();
  const { items, fetchCart, updateItem, removeItem, getTotal, getItemCount, isLoading } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'international'>('standard');

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  const subtotal = getTotal();
  const shippingCost = shippingMethod === 'express' ? 19.99 : shippingMethod === 'international' ? 24.99 : (subtotal > 100 ? 0 : 9.99);
  const total = subtotal + shippingCost - discount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch(apiUrl('/api/coupons/validate'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code: couponCode }),
      });
      const data = await res.json();
      if (data.success) {
        const coupon = data.data;
        let disc = 0;
        if (coupon.discountType === 'percentage') {
          disc = subtotal * (coupon.discount / 100);
          if (coupon.maxDiscount && disc > coupon.maxDiscount) {
            disc = coupon.maxDiscount;
          }
        } else {
          disc = coupon.discount;
        }
        setDiscount(disc);
        setAppliedCoupon(coupon.code);
        toast.success(`Coupon applied! You save $${disc.toFixed(2)}`);
      } else {
        toast.error(data.error || 'Invalid coupon code');
      }
    } catch {
      toast.error('Failed to validate coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleQuantityChange = async (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateItem(id, newQuantity);
    } catch {
      toast.error('Failed to update quantity');
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      await removeItem(id);
      toast.success('Item removed from cart');
    } catch {
      toast.error('Failed to remove item');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
        <h2 className="text-2xl font-serif text-neutral-900 mb-2">Sign in to view your cart</h2>
        <p className="text-neutral-500 mb-6">You need to be logged in to see your shopping cart.</p>
        <Button
          className="bg-neutral-900 hover:bg-neutral-800 text-white"
          onClick={() => navigate('auth', { mode: 'login' })}
        >
          Sign In
        </Button>
      </div>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 p-4">
                <Skeleton className="w-24 h-24 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ShoppingBag className="w-20 h-20 mx-auto text-neutral-200 mb-6" />
          <h2 className="text-3xl font-serif text-neutral-900 mb-3">Your cart is empty</h2>
          <p className="text-neutral-500 mb-8 max-w-md mx-auto">
            Looks like you haven&apos;t added anything to your cart yet. Explore our collection and find something you love.
          </p>
          <Button
            className="bg-neutral-900 hover:bg-neutral-800 text-white"
            onClick={() => navigate('shop')}
          >
            Start Shopping
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-serif text-neutral-900">Shopping Cart</h1>
        <span className="text-sm text-neutral-500">{getItemCount()} item{getItemCount() !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {items.map((item) => {
              const price = item.product.salePrice ?? item.product.price;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex gap-4 p-4 bg-white border border-neutral-100 rounded-lg"
                >
                  <div
                    className="w-24 h-24 md:w-32 md:h-32 rounded-md overflow-hidden bg-neutral-100 flex-shrink-0 cursor-pointer"
                    onClick={() => navigate('product', { id: item.productId })}
                  >
                    <img
                      src={item.product.images?.[0] || '/placeholder.jpg'}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <div>
                        <h3
                          className="font-medium text-neutral-900 cursor-pointer hover:underline"
                          onClick={() => navigate('product', { id: item.productId })}
                        >
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-neutral-500">{item.product.brand}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500">
                          {item.size && <span>Size: {item.size}</span>}
                          {item.color && <span>Color: {item.color}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-neutral-200 rounded-md">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-neutral-50 transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-neutral-50 transition-colors"
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-neutral-900">${(price * item.quantity).toFixed(2)}</p>
                        {item.product.salePrice && (
                          <p className="text-xs text-neutral-400 line-through">
                            ${(item.product.price * item.quantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <button
            onClick={() => navigate('shop')}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors mt-4"
          >
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </button>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-neutral-50 rounded-lg p-6 sticky top-4">
            <h2 className="text-lg font-serif text-neutral-900 mb-4">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-medium text-neutral-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Shipping
                </span>
                <span className="font-medium text-neutral-900">
                  {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Discount ({appliedCoupon})
                  </span>
                  <span className="font-medium">-${discount.toFixed(2)}</span>
                </div>
              )}
              {shippingMethod === 'standard' && shippingCost > 0 && (
                <p className="text-xs text-neutral-400">
                  Add ${(100 - subtotal).toFixed(2)} more for free shipping
                </p>
              )}
            </div>

            {/* Shipping Method Selector */}
            <div className="mt-4">
              <p className="text-sm font-medium text-neutral-900 mb-2">Delivery Method</p>
              <div className="space-y-2">
                {[
                  { value: 'standard' as const, label: 'Standard Shipping', price: subtotal > 100 ? 0 : 9.99, priceLabel: subtotal > 100 ? 'Free' : '$9.99', estimate: '3-5 business days' },
                  { value: 'express' as const, label: 'Express Shipping', price: 19.99, priceLabel: '$19.99', estimate: '1-2 business days' },
                  { value: 'international' as const, label: 'International Shipping', price: 24.99, priceLabel: '$24.99', estimate: '7-14 business days' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                      shippingMethod === option.value
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping-method"
                        value={option.value}
                        checked={shippingMethod === option.value}
                        onChange={() => setShippingMethod(option.value)}
                        className="w-4 h-4 accent-neutral-900"
                      />
                      <div>
                        <span className="text-sm font-medium text-neutral-900">{option.label}</span>
                        <span className="text-xs text-neutral-500 ml-2">({option.estimate})</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-neutral-900">{option.priceLabel}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Coupon */}
            {!appliedCoupon ? (
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                >
                  {couponLoading ? '...' : 'Apply'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-4 text-sm bg-emerald-50 text-emerald-700 p-2 rounded">
                <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {appliedCoupon}</span>
                <button
                  onClick={() => { setDiscount(0); setAppliedCoupon(null); }}
                  className="text-emerald-500 hover:text-emerald-700"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex justify-between text-base font-semibold mb-6">
              <span>Total</span>
              <span className="text-neutral-900">${total.toFixed(2)}</span>
            </div>

            <Button
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white"
              size="lg"
              onClick={() => navigate('checkout')}
            >
              Proceed to Checkout
            </Button>

            <button
              onClick={() => navigate('shop')}
              className="w-full text-center text-sm text-neutral-500 hover:text-neutral-900 transition-colors mt-3"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
