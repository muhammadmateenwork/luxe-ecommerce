'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Heart, Minus, Plus, ShoppingCart, Truck, Shield, RotateCcw,
  ChevronRight, Ruler, Share2
} from 'lucide-react';
import { useRouterStore } from '@/stores/useRouterStore';
import { useCartStore } from '@/stores/useCartStore';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  price: number;
  salePrice: number | null;
  sku: string;
  stock: number;
  sizes: string[];
  colors: string[];
  images: string[];
  categoryId: string;
  category: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  averageRating: number;
  totalReviews: number;
  categoryRef?: { id: string; name: string; slug: string };
  reviews?: Review[];
}

interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  user: { id: string; name: string; avatar?: string | null };
}

export default function ProductDetailPage() {
  const { params, navigate } = useRouterStore();
  const productId = params.id;
  const { addItem } = useCartStore();
  const { items: wishlistItems, addItem: addWishlistItem, removeItem: removeWishlistItem, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const inWishlist = product ? isInWishlist(product.id) : false;

  const fetchProduct = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/products/${productId}`), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setProduct(data.data);
        if (data.data.colors?.length > 0) {
          setSelectedColor(data.data.colors[0]);
        }
        if (data.data.reviews) {
          setReviews(data.data.reviews);
        }
      }
    } catch {
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const fetchRelatedProducts = useCallback(async () => {
    if (!product) return;
    try {
      const res = await fetch(apiUrl(`/api/products?category=${product.category}&limit=5`), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setRelatedProducts(
          data.data.products.filter((p: Product) => p.id !== product.id).slice(0, 4)
        );
      }
    } catch {
      // silent
    }
  }, [product]);

  const trackRecentlyViewed = useCallback(async () => {
    if (!productId || !isAuthenticated) return;
    try {
      await fetch(apiUrl('/api/recently-viewed'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId }),
      });
    } catch {
      // silent
    }
  }, [productId, isAuthenticated]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (product) {
      fetchRelatedProducts();
      trackRecentlyViewed();
    }
  }, [product, fetchRelatedProducts, trackRecentlyViewed]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    try {
      await addItem(product.id, quantity, selectedSize || undefined, selectedColor || undefined);
      toast.success('Added to cart!', { description: `${product.name} - Size ${selectedSize}` });
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  const handleToggleWishlist = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      navigate('auth', { mode: 'login' });
      return;
    }
    try {
      if (inWishlist) {
        const item = wishlistItems.find(i => i.productId === product.id);
        if (item) await removeWishlistItem(item.id);
        toast.success('Removed from wishlist');
      } else {
        await addWishlistItem(product.id);
        toast.success('Added to wishlist');
      }
    } catch {
      toast.error('Failed to update wishlist');
    }
  };

  const handleSubmitReview = async () => {
    if (!product || !isAuthenticated) return;
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      toast.error('Please fill in all review fields');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(apiUrl('/api/reviews'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Review submitted!');
        setShowReviewForm(false);
        setReviewTitle('');
        setReviewComment('');
        setReviewRating(5);
        fetchProduct();
      } else {
        toast.error(data.error || 'Failed to submit review');
      }
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  const stockStatus = () => {
    if (!product) return { text: 'Out of Stock', color: 'text-red-500' };
    if (product.stock === 0) return { text: 'Out of Stock', color: 'text-red-500' };
    if (product.stock <= 5) return { text: 'Low Stock', color: 'text-amber-600' };
    return { text: 'In Stock', color: 'text-emerald-600' };
  };

  const savingsPercent = product?.salePrice
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(r => r.rating === star).length;
    const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { star, count, percent };
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Skeleton className="w-full aspect-square rounded-lg" />
            <div className="flex gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="w-20 h-20 rounded-md" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-serif text-neutral-900">Product not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('shop')}>
          Back to Shop
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-8">
        <button onClick={() => navigate('home')} className="hover:text-neutral-900 transition-colors">Home</button>
        <ChevronRight className="w-3 h-3" />
        <button onClick={() => navigate('shop')} className="hover:text-neutral-900 transition-colors">Shop</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-neutral-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div
            className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100 cursor-crosshair"
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleMouseMove}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={selectedImage}
                src={product.images[selectedImage] || '/placeholder.jpg'}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300"
                style={isZoomed ? {
                  transform: 'scale(2)',
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`
                } : {}}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            </AnimatePresence>
            {product.salePrice && (
              <Badge className="absolute top-4 left-4 bg-amber-500 text-white hover:bg-amber-600">
                -{savingsPercent}%
              </Badge>
            )}
          </div>

          {/* Thumbnails */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                  selectedImage === idx ? 'border-amber-500' : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <img src={img || '/placeholder.jpg'} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-neutral-500 uppercase tracking-wider mb-1">{product.brand}</p>
            <h1 className="text-3xl lg:text-4xl font-serif text-neutral-900">{product.name}</h1>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(product.averageRating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-neutral-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-neutral-600">
              {product.averageRating.toFixed(1)} ({product.totalReviews} reviews)
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-neutral-900">
              ${(product.salePrice || product.price).toFixed(2)}
            </span>
            {product.salePrice && (
              <>
                <span className="text-lg text-neutral-400 line-through">${product.price.toFixed(2)}</span>
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                  You save {savingsPercent}%
                </Badge>
              </>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              product.stock === 0 ? 'bg-red-500' : product.stock <= 5 ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            <span className={`text-sm font-medium ${stockStatus().color}`}>
              {stockStatus().text}
            </span>
            {product.stock > 0 && product.stock <= 5 && (
              <span className="text-sm text-neutral-500">Only {product.stock} left</span>
            )}
          </div>

          {/* Delivery Estimate */}
          <div className="text-sm text-neutral-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <span>Estimated delivery: 3-5 business days (Standard)</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 ml-6">
              Express (1-2 days) and International (7-14 days) options available at checkout
            </p>
          </div>

          <Separator />

          {/* Color Selector */}
          {product.colors?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-neutral-900 mb-3">
                Color: <span className="font-normal text-neutral-600">{selectedColor}</span>
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
                    title={color}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {product.sizes?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-neutral-900">
                  Size: {selectedSize && <span className="font-normal text-neutral-600">{selectedSize}</span>}
                </p>
                <button className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors">
                  <Ruler className="w-3 h-3" /> Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 text-sm border rounded-md transition-all ${
                      selectedSize === size
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 hover:border-neutral-400 text-neutral-700'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <p className="text-sm font-medium text-neutral-900 mb-3">Quantity</p>
            <div className="flex items-center border border-neutral-200 rounded-md w-fit">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 hover:bg-neutral-50 transition-colors"
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="p-2 hover:bg-neutral-50 transition-colors"
                disabled={quantity >= product.stock}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              size="lg"
              className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white"
              onClick={handleAddToCart}
              disabled={product.stock === 0 || !selectedSize}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {product.stock === 0 ? 'Out of Stock' : !selectedSize ? 'Select Size' : 'Add to Cart'}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-neutral-200"
              onClick={handleToggleWishlist}
            >
              <Heart className={`w-5 h-5 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button size="lg" variant="outline" className="border-neutral-200">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <Truck className="w-5 h-5 mx-auto text-neutral-400 mb-1" />
              <p className="text-xs text-neutral-500">Free Shipping over $100</p>
            </div>
            <div className="text-center">
              <RotateCcw className="w-5 h-5 mx-auto text-neutral-400 mb-1" />
              <p className="text-xs text-neutral-500">30-Day Returns</p>
            </div>
            <div className="text-center">
              <Shield className="w-5 h-5 mx-auto text-neutral-400 mb-1" />
              <p className="text-xs text-neutral-500">Secure Checkout</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-16">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
            <TabsTrigger
              value="description"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium"
            >
              Description
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium"
            >
              Reviews ({product.totalReviews})
            </TabsTrigger>
            <TabsTrigger
              value="shipping"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium"
            >
              Shipping
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="pt-6">
            <div className="prose max-w-none text-neutral-600">
              <p className="text-base leading-relaxed">{product.description}</p>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Rating Summary */}
              <div className="space-y-4">
                <div className="text-center p-6 bg-neutral-50 rounded-lg">
                  <p className="text-5xl font-serif text-neutral-900">{product.averageRating.toFixed(1)}</p>
                  <div className="flex items-center justify-center mt-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(product.averageRating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-neutral-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">{product.totalReviews} reviews</p>
                </div>

                {/* Rating Distribution */}
                <div className="space-y-2">
                  {ratingDistribution.map(({ star, count, percent }) => (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-neutral-600">{star}</span>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-neutral-500">{count}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white mt-4"
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error('Please login to write a review');
                      navigate('auth', { mode: 'login' });
                      return;
                    }
                    setShowReviewForm(!showReviewForm);
                  }}
                >
                  Write a Review
                </Button>
              </div>

              {/* Reviews List */}
              <div className="lg:col-span-2 space-y-6">
                <AnimatePresence>
                  {showReviewForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-neutral-200 rounded-lg p-6 space-y-4"
                    >
                      <h3 className="font-serif text-lg">Write a Review</h3>
                      <div>
                        <Label>Rating</Label>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button key={star} onClick={() => setReviewRating(star)}>
                              <Star
                                className={`w-6 h-6 ${
                                  star <= reviewRating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-neutral-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="review-title">Title</Label>
                        <Input
                          id="review-title"
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                          placeholder="Summary of your review"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="review-comment">Your Review</Label>
                        <Textarea
                          id="review-comment"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Share your experience..."
                          rows={4}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleSubmitReview}
                          disabled={submittingReview}
                          className="bg-neutral-900 hover:bg-neutral-800 text-white"
                        >
                          {submittingReview ? 'Submitting...' : 'Submit Review'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowReviewForm(false)}>Cancel</Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {reviews.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500">
                    <p>No reviews yet. Be the first to review this product!</p>
                  </div>
                ) : (
                  reviews.map(review => (
                    <div key={review.id} className="border-b border-neutral-100 pb-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-600">
                            {review.user?.name?.charAt(0) || 'U'}
                          </div>
                          <span className="text-sm font-medium text-neutral-900">{review.user?.name || 'Anonymous'}</span>
                        </div>
                        <span className="text-xs text-neutral-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="font-medium text-sm text-neutral-900 mb-1">{review.title}</p>
                      <p className="text-sm text-neutral-600">{review.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shipping" className="pt-6">
            <div className="space-y-4 text-neutral-600">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 mt-0.5 text-neutral-400" />
                <div>
                  <p className="font-medium text-neutral-900">Standard Shipping</p>
                  <p className="text-sm">3-5 business days. Free on orders over $100, otherwise $9.99</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 mt-0.5 text-neutral-400" />
                <div>
                  <p className="font-medium text-neutral-900">Express Shipping</p>
                  <p className="text-sm">1-2 business days. $19.99</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 mt-0.5 text-neutral-400" />
                <div>
                  <p className="font-medium text-neutral-900">International Shipping</p>
                  <p className="text-sm">7-14 business days. $24.99+</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RotateCcw className="w-5 h-5 mt-0.5 text-neutral-400" />
                <div>
                  <p className="font-medium text-neutral-900">Returns & Exchanges</p>
                  <p className="text-sm">Free returns within 30 days. Items must be unworn with tags attached.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 mt-0.5 text-neutral-400" />
                <div>
                  <p className="font-medium text-neutral-900">Quality Guarantee</p>
                  <p className="text-sm">All items are inspected before shipping. If you receive a defective item, contact us for a replacement.</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-serif text-neutral-900 mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map(p => (
              <motion.div
                key={p.id}
                whileHover={{ y: -4 }}
                className="group cursor-pointer"
                onClick={() => {
                  setSelectedImage(0);
                  setSelectedSize(null);
                  setQuantity(1);
                  navigate('product', { id: p.id });
                }}
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-neutral-100 mb-3">
                  <img
                    src={p.images?.[0] || '/placeholder.jpg'}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <p className="text-sm font-medium text-neutral-900 truncate">{p.name}</p>
                <p className="text-xs text-neutral-500">{p.brand}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-neutral-900">
                    ${(p.salePrice || p.price).toFixed(2)}
                  </span>
                  {p.salePrice && (
                    <span className="text-xs text-neutral-400 line-through">${p.price.toFixed(2)}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
