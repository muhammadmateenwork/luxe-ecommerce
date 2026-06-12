'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Instagram, ChevronLeft, ChevronRight, Mail, Clock } from 'lucide-react';
import { useRouterStore } from '@/stores/useRouterStore';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import ProductCard, { type ProductData } from './ProductCard';
import QuickViewModal from './QuickViewModal';

/* ------------------------------------------------------------------ */
/*  Shared                                                             */
/* ------------------------------------------------------------------ */

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  _count?: { products: number };
}

function SectionTitle({ title, subtitle, actionLabel, onAction }: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900">{title}</h2>
        {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
      </div>
      {actionLabel && onAction && (
        <button onClick={onAction} className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1 whitespace-nowrap">
          {actionLabel} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6 }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

const heroSlides = [
  {
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80',
    title: 'Elevate Your Style',
    subtitle: 'Discover our curated collection of premium fashion',
    cta1: 'Shop Now',
    cta2: 'New Arrivals',
  },
  {
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&q=80',
    title: 'Summer Essentials',
    subtitle: 'Fresh looks for the season ahead',
    cta1: 'Explore Collection',
    cta2: 'View Lookbook',
  },
  {
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1600&q=80',
    title: 'Timeless Elegance',
    subtitle: 'Pieces that define your personal style',
    cta1: 'Shop Women',
    cta2: 'Shop Men',
  },
];

function HeroSection() {
  const navigate = useRouterStore((s) => s.navigate);
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((p) => (p + 1) % heroSlides.length), []);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + heroSlides.length) % heroSlides.length), []);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = heroSlides[current];

  return (
    <div className="relative h-[70vh] sm:h-[80vh] lg:h-[90vh] overflow-hidden">
      {/* Background */}
      <motion.div
        key={current}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0"
      >
        <img src={slide.image} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      </motion.div>

      {/* Content */}
      <div className="relative h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div
            key={`text-${current}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xl"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif font-bold text-white leading-tight mb-4">
              {slide.title}
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mb-8">{slide.subtitle}</p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('shop')}
                className="px-8 py-3.5 bg-white text-neutral-900 font-semibold text-sm tracking-wider rounded-lg hover:bg-neutral-100 transition-colors"
              >
                {slide.cta1}
              </button>
              <button
                onClick={() => navigate('shop', { newArrival: 'true' })}
                className="px-8 py-3.5 border-2 border-white text-white font-semibold text-sm tracking-wider rounded-lg hover:bg-white/10 transition-colors"
              >
                {slide.cta2}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === current ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Featured Collections                                               */
/* ------------------------------------------------------------------ */

const collectionImages: Record<string, string> = {
  Men: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80',
  Women: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80',
  Kids: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600&q=80',
  Shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
  Accessories: 'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=600&q=80',
};

function CollectionsSection({ categories }: { categories: Category[] }) {
  const navigate = useRouterStore((s) => s.navigate);
  // Prioritize the main fashion categories: Men, Women, Kids, Shoes
  const priorityOrder = ['Men', 'Women', 'Kids', 'Shoes'];
  const display = priorityOrder
    .map(name => categories.find(c => c.name === name))
    .filter(Boolean)
    .slice(0, 4) as Category[];

  return (
    <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
      <SectionTitle title="Curated Collections" subtitle="Explore our carefully selected categories" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {display.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            onClick={() => navigate('shop', { category: cat.name })}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl cursor-pointer"
          >
            <img
              src={collectionImages[cat.name] || cat.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80'}
              alt={cat.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-all" />
            <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform">
              <h3 className="text-white text-lg font-semibold mb-1">{cat.name}</h3>
              <span className="text-white/70 text-sm flex items-center gap-1 group-hover:text-white transition-colors">
                Explore <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </AnimatedSection>
  );
}

/* ------------------------------------------------------------------ */
/*  Product Grid Section                                               */
/* ------------------------------------------------------------------ */

function ProductGridSection({ title, subtitle, actionLabel, onAction, fetchUrl }: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  fetchUrl: string;
}) {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(fetchUrl, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!cancelled && data.success) {
          setProducts(data.data.products || []);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchUrl]);

  return (
    <>
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <SectionTitle title={title} subtitle={subtitle} actionLabel={actionLabel} onAction={onAction} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCard key={i} isLoading />)
            : products.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} onQuickView={setQuickViewProduct} />
              ))}
        </div>
      </AnimatedSection>
      <QuickViewModal product={quickViewProduct} open={!!quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Trending Horizontal Scroll                                         */
/* ------------------------------------------------------------------ */

function TrendingSection() {
  const navigate = useRouterStore((s) => s.navigate);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/products?trending=true&limit=8'), { headers: getAuthHeaders() });
        const data = await res.json();
        if (!cancelled && data.success) setProducts(data.data.products || []);
      } catch { /* silent */ } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = dir === 'left' ? -320 : 320;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <>
      <AnimatedSection className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="Trending Now"
            subtitle="What everyone is wearing"
            actionLabel="View All"
            onAction={() => navigate('shop', { trending: 'true' })}
          />
        </div>
        <div className="relative">
          <button onClick={() => scroll('left')} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-white shadow-lg rounded-full hover:shadow-xl transition-shadow" aria-label="Scroll left">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div ref={scrollRef} className="flex gap-4 lg:gap-6 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8 pb-4 scroll-smooth">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[200px] sm:w-[240px]"><ProductCard isLoading /></div>
                ))
              : products.map((p) => (
                  <div key={p.id} className="flex-shrink-0 w-[200px] sm:w-[240px]">
                    <ProductCard product={p} onQuickView={setQuickViewProduct} />
                  </div>
                ))}
          </div>
          <button onClick={() => scroll('right')} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-white shadow-lg rounded-full hover:shadow-xl transition-shadow" aria-label="Scroll right">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </AnimatedSection>
      <QuickViewModal product={quickViewProduct} open={!!quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Flash Sale                                                         */
/* ------------------------------------------------------------------ */

function FlashSaleSection() {
  const navigate = useRouterStore((s) => s.navigate);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductData | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [saleEndTime, setSaleEndTime] = useState<number | null>(null);

  // Fetch flash sale products and the server-side end time
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/products?flashSale=true&limit=4'), { headers: getAuthHeaders() });
        const data = await res.json();
        if (!cancelled && data.success) {
          setProducts(data.data.products || []);
          // Use the server-provided flash sale end time
          if (data.data.flashSaleEndsAt) {
            setSaleEndTime(new Date(data.data.flashSaleEndsAt).getTime());
          }
        }
      } catch { /* silent */ } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Countdown timer based on server-side end time
  useEffect(() => {
    if (!saleEndTime) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = Math.max(0, saleEndTime - now);
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);
    // Run immediately once
    const now = new Date().getTime();
    const diff = Math.max(0, saleEndTime - now);
    setTimeLeft({
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    });
    return () => clearInterval(interval);
  }, [saleEndTime]);

  if (!loading && products.length === 0) return null;

  return (
    <>
      <AnimatedSection className="bg-neutral-900 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                Flash Sale — Up to 50% Off
              </h2>
              <p className="text-neutral-400 text-sm mt-1">Limited time offers. Don&apos;t miss out!</p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <div className="flex gap-2">
                {[
                  { label: 'HRS', value: timeLeft.hours },
                  { label: 'MIN', value: timeLeft.minutes },
                  { label: 'SEC', value: timeLeft.seconds },
                ].map((t) => (
                  <div key={t.label} className="bg-white/10 rounded-lg px-3 py-2 text-center min-w-[50px]">
                    <span className="text-lg font-bold text-white">{String(t.value).padStart(2, '0')}</span>
                    <span className="block text-[9px] text-neutral-500 font-medium">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCard key={i} isLoading />)
              : products.map((p) => <ProductCard key={p.id} product={p} onQuickView={setQuickViewProduct} />)}
          </div>
        </div>
      </AnimatedSection>
      <QuickViewModal product={quickViewProduct} open={!!quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Promo Banner                                                       */
/* ------------------------------------------------------------------ */

function PromoBanner() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/newsletter'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscribed(true);
        setEmail('');
      }
    } catch { /* silent */ } finally { setIsLoading(false); }
  };

  return (
    <AnimatedSection className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 text-center">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-900 mb-3">
          Sign Up & Get 15% Off
        </h2>
        <p className="text-neutral-800 mb-6 max-w-md mx-auto">
          Join our newsletter and be the first to know about new arrivals, exclusive offers, and style inspiration.
        </p>
        {subscribed ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-neutral-900 font-semibold">
            ✓ Welcome aboard! Check your inbox for your discount code.
          </motion.p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-neutral-900 text-white font-semibold text-sm rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Subscribing...' : 'Get 15% Off'}
            </button>
          </form>
        )}
      </div>
    </AnimatedSection>
  );
}

/* ------------------------------------------------------------------ */
/*  Categories Grid                                                    */
/* ------------------------------------------------------------------ */

function CategoriesGrid({ categories }: { categories: Category[] }) {
  const navigate = useRouterStore((s) => s.navigate);
  const display = categories.slice(0, 5);

  return (
    <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <SectionTitle title="Shop by Category" subtitle="Find exactly what you're looking for" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {display.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            onClick={() => navigate('shop', { category: cat.name })}
            className="group cursor-pointer"
          >
            <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100 mb-3">
              <img
                src={collectionImages[cat.name] || cat.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80'}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-amber-600 transition-colors text-center">
              {cat.name}
            </h3>
            {cat._count && (
              <p className="text-xs text-neutral-400 text-center">{cat._count.products} Products</p>
            )}
          </motion.div>
        ))}
      </div>
    </AnimatedSection>
  );
}

/* ------------------------------------------------------------------ */
/*  Customer Reviews                                                   */
/* ------------------------------------------------------------------ */

const mockReviews = [
  { name: 'Sarah M.', avatar: '👩‍💼', rating: 5, comment: 'Absolutely love the quality! The fabric is so soft and the fit is perfect. Will definitely order again.', date: '2 days ago' },
  { name: 'James K.', avatar: '👨‍💻', rating: 5, comment: 'Fast shipping and excellent customer service. The jacket looks even better in person than in the photos!', date: '1 week ago' },
  { name: 'Emily R.', avatar: '👩‍🎨', rating: 4, comment: 'Beautiful design and great craftsmanship. The only reason for 4 stars is that sizing runs a bit small.', date: '2 weeks ago' },
  { name: 'Michael T.', avatar: '👨‍🔧', rating: 5, comment: 'Premium quality at a fair price. LUXE has become my go-to store for all my wardrobe essentials.', date: '3 weeks ago' },
];

function CustomerReviews() {
  const [current, setCurrent] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    const updateCount = () => {
      setVisibleCount(window.innerWidth >= 768 ? 3 : 1);
    };
    updateCount();
    window.addEventListener('resize', updateCount);
    return () => window.removeEventListener('resize', updateCount);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((p) => (p + 1) % mockReviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AnimatedSection className="bg-neutral-50 py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle title="What Our Customers Say" subtitle="Real reviews from real customers" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockReviews.slice(current, current + visibleCount).concat(
            mockReviews.slice(0, Math.max(0, current + visibleCount - mockReviews.length))
          ).slice(0, visibleCount).map((review, i) => (
            <motion.div
              key={`${review.name}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{review.avatar}</span>
                <div>
                  <p className="font-semibold text-neutral-900 text-sm">{review.name}</p>
                  <p className="text-xs text-neutral-400">{review.date}</p>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className={j < review.rating ? 'text-amber-400' : 'text-neutral-200'}>★</span>
                ))}
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">{review.comment}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

/* ------------------------------------------------------------------ */
/*  Brand Story                                                        */
/* ------------------------------------------------------------------ */

function BrandStory() {
  const navigate = useRouterStore((s) => s.navigate);
  return (
    <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl">
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80"
            alt="Our Story"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">Our Story</p>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-900 mb-6">
            Crafting Timeless Fashion Since 2018
          </h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            At LUXE, we believe that fashion is more than just clothing — it&apos;s a statement of who you are.
            Our journey began with a simple vision: to make premium fashion accessible to everyone who values
            quality, sustainability, and timeless design.
          </p>
          <p className="text-neutral-600 leading-relaxed mb-8">
            Every piece in our collection is carefully curated and crafted with attention to detail, using
            only the finest materials sourced from responsible suppliers around the world.
          </p>
          <button
            onClick={() => navigate('home')}
            className="px-8 py-3 bg-neutral-900 text-white font-semibold text-sm tracking-wider rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Learn More
          </button>
        </div>
      </div>
    </AnimatedSection>
  );
}

/* ------------------------------------------------------------------ */
/*  Instagram Gallery                                                  */
/* ------------------------------------------------------------------ */

const instagramImages = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&q=80',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80',
  'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80',
];

function InstagramGallery() {
  return (
    <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <SectionTitle title="Follow Us @luxe.fashion" subtitle="Get inspired by our community" />
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 lg:gap-3">
        {instagramImages.map((src, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            className="group relative aspect-square overflow-hidden rounded-lg cursor-pointer"
          >
            <img src={src} alt={`Instagram ${i + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
              <Instagram className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </motion.div>
        ))}
      </div>
    </AnimatedSection>
  );
}

/* ------------------------------------------------------------------ */
/*  HOME PAGE (Main)                                                   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Sale Banner (conditional)                                          */
/* ------------------------------------------------------------------ */

function SaleBanner() {
  const navigate = useRouterStore((s) => s.navigate);
  const [hasSaleProducts, setHasSaleProducts] = useState(false);
  const [saleCount, setSaleCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/products?onSale=true&limit=1'), { headers: getAuthHeaders() });
        const data = await res.json();
        if (!cancelled && data.success && data.data?.pagination) {
          const total = data.data.pagination.total || 0;
          if (total > 0) {
            setHasSaleProducts(true);
            setSaleCount(total);
          }
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!hasSaleProducts) return null;

  return (
    <AnimatedSection className="bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 text-neutral-900 font-bold text-sm px-3 py-1 rounded">SALE</div>
          <div>
            <h3 className="text-white font-semibold text-lg">Shop Our Sale</h3>
            <p className="text-neutral-400 text-sm">{saleCount} items on sale — Limited time offers</p>
          </div>
        </div>
        <button
          onClick={() => navigate('shop', { onSale: 'true' })}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-900 font-semibold text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          Shop Sale <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </AnimatedSection>
  );
}

export default function HomePage() {
  const navigate = useRouterStore((s) => s.navigate);
  const [categories, setCategories] = useState<Category[]>([]);

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

  return (
    <div>
      <HeroSection />
      <SaleBanner />
      <CollectionsSection categories={categories} />
      <ProductGridSection
        title="Best Sellers"
        subtitle="Our most popular products"
        actionLabel="View All"
        onAction={() => navigate('shop', { bestSeller: 'true' })}
        fetchUrl={apiUrl('/api/products?bestSeller=true&limit=4')}
      />
      <ProductGridSection
        title="New Arrivals"
        subtitle="Fresh drops just for you"
        actionLabel="View All"
        onAction={() => navigate('shop', { newArrival: 'true' })}
        fetchUrl={apiUrl('/api/products?newArrival=true&limit=4')}
      />
      <TrendingSection />
      <FlashSaleSection />
      <PromoBanner />
      <CategoriesGrid categories={categories} />
      <CustomerReviews />
      <BrandStory />
      <InstagramGallery />
    </div>
  );
}
