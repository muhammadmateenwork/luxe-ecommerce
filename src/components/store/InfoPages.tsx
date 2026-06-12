'use client';

import { motion } from 'framer-motion';
import { useRouterStore } from '@/stores/useRouterStore';
import { Button } from '@/components/ui/button';
import {
  Mail, Phone, MapPin, Clock, Truck, RotateCcw, Shield, Package,
  ChevronDown, Search, Gift, CreditCard, Star, Heart, Users, Award
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/stores/useCartStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

function PageWrapper({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const navigate = useRouterStore((s) => s.navigate);
  return (
    <div className="min-h-[60vh]">
      <div className="bg-neutral-50 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl font-serif font-bold text-neutral-900"
          >
            {title}
          </motion.h1>
          <p className="text-neutral-500 mt-2 max-w-xl mx-auto">{subtitle}</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact Us                                                         */
/* ------------------------------------------------------------------ */

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <PageWrapper title="Contact Us" subtitle="We'd love to hear from you. Reach out with any questions or concerns.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-neutral-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Email</h3>
              <p className="text-sm text-neutral-600">support@luxe.com</p>
              <p className="text-xs text-neutral-400 mt-1">We reply within 24 hours</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <Phone className="h-5 w-5 text-neutral-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Phone</h3>
              <p className="text-sm text-neutral-600">+1 (555) 123-4567</p>
              <p className="text-xs text-neutral-400 mt-1">Mon-Fri, 9am-6pm EST</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-neutral-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Address</h3>
              <p className="text-sm text-neutral-600">123 Fashion Avenue</p>
              <p className="text-sm text-neutral-600">New York, NY 10001</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-neutral-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Business Hours</h3>
              <p className="text-sm text-neutral-600">Monday - Friday: 9am - 6pm</p>
              <p className="text-sm text-neutral-600">Saturday: 10am - 4pm</p>
              <p className="text-sm text-neutral-600">Sunday: Closed</p>
            </div>
          </div>
        </div>

        <div>
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-emerald-800 mb-2">Message Sent!</h3>
              <p className="text-sm text-emerald-600">Thank you for contacting us. We&apos;ll get back to you within 24 hours.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                <input type="text" required className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                <input type="email" required className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400" placeholder="your@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Subject</label>
                <select className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400">
                  <option>General Inquiry</option>
                  <option>Order Support</option>
                  <option>Returns & Exchanges</option>
                  <option>Product Question</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Message</label>
                <textarea required rows={5} className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400 resize-none" placeholder="How can we help you?" />
              </div>
              <Button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white">
                Send Message
              </Button>
            </form>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Shipping & Returns                                                 */
/* ------------------------------------------------------------------ */

interface DeliveryMethod {
  id: string;
  name: string;
  description: string | null;
  price: number;
  freeOverAmount: number | null;
  estimatedDays: string | null;
  isActive: boolean;
}

export function ShippingPage() {
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDeliveryMethods() {
      try {
        const res = await fetch(apiUrl('/api/delivery-methods'), { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
          setDeliveryMethods(data.data || []);
        }
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchDeliveryMethods();
  }, []);

  const formatPrice = (method: DeliveryMethod) => {
    if (method.freeOverAmount && method.freeOverAmount > 0) {
      return `$${method.price.toFixed(2)} / Free over $${method.freeOverAmount.toFixed(2)}`;
    }
    return method.price === 0 ? 'Free' : `$${method.price.toFixed(2)}`;
  };

  return (
    <PageWrapper title="Shipping & Returns" subtitle="Everything you need to know about delivery and returns.">
      <div className="space-y-10">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Truck className="h-6 w-6 text-amber-600" />
            <h2 className="text-xl font-serif font-bold text-neutral-900">Shipping Options</h2>
          </div>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-neutral-200 rounded-lg p-5">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))
            ) : deliveryMethods.length > 0 ? (
              deliveryMethods.map((method) => (
                <div key={method.id} className="border border-neutral-200 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-neutral-900">{method.name}</h3>
                    <span className="text-sm font-medium text-neutral-600">{formatPrice(method)}</span>
                  </div>
                  {method.description && <p className="text-sm text-neutral-600">{method.description}</p>}
                  {method.estimatedDays && <p className="text-sm text-neutral-600">{method.estimatedDays}</p>}
                </div>
              ))
            ) : (
              <div className="border border-neutral-200 rounded-lg p-5 text-center">
                <p className="text-sm text-neutral-500">No shipping options configured yet.</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <RotateCcw className="h-6 w-6 text-amber-600" />
            <h2 className="text-xl font-serif font-bold text-neutral-900">Returns & Exchanges</h2>
          </div>
          <div className="bg-neutral-50 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm">30-Day Return Policy</h3>
                <p className="text-sm text-neutral-600">Items must be returned within 30 days of delivery in their original condition with tags attached.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm">Free Returns</h3>
                <p className="text-sm text-neutral-600">We offer free return shipping on all orders. A prepaid shipping label will be provided.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm">Refund Processing</h3>
                <p className="text-sm text-neutral-600">Refunds are processed within 5-7 business days after we receive the returned item.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */

const faqData = [
  { q: 'How do I track my order?', a: 'Once your order ships, you\'ll receive an email with a tracking number. You can also view your order status in the "My Orders" section of your account.' },
  { q: 'What is your return policy?', a: 'We offer free returns within 30 days of delivery. Items must be in their original condition with tags attached. Visit our Shipping & Returns page for full details.' },
  { q: 'How long does shipping take?', a: 'Standard shipping takes 3-5 business days. Express shipping delivers in 1-2 business days. International orders take 7-14 business days.' },
  { q: 'Do you ship internationally?', a: 'Yes! We ship to over 50 countries worldwide. International shipping rates and delivery times vary by destination.' },
  { q: 'How do I find my size?', a: 'Check our Size Guide for detailed measurements and fit recommendations for each product category. If you\'re between sizes, we recommend sizing up.' },
  { q: 'Can I change or cancel my order?', a: 'You can modify or cancel your order within 1 hour of placing it. After that, we begin processing and changes may not be possible. Contact us immediately if you need help.' },
  { q: 'Do you offer gift wrapping?', a: 'Yes! Select the gift wrapping option at checkout for $5.99. Your items will be beautifully wrapped with a personalized message card.' },
  { q: 'How do I use a promo code?', a: 'Enter your promo code in the "Coupon Code" field during checkout. The discount will be applied to your order total automatically.' },
  { q: 'Is my payment information secure?', a: 'Absolutely. We use SSL encryption and never store your credit card information. All payments are processed through secure, PCI-compliant payment gateways.' },
  { q: 'How do I contact customer support?', a: 'You can reach us by email at support@luxe.com, by phone at +1 (555) 123-4567 (Mon-Fri, 9am-6pm EST), or through our Contact Us page.' },
];

export function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <PageWrapper title="Frequently Asked Questions" subtitle="Find answers to common questions about orders, shipping, returns, and more.">
      <div className="space-y-3">
        {faqData.map((item, i) => (
          <div key={i} className="border border-neutral-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-neutral-50 transition-colors"
            >
              <span className="font-medium text-neutral-900 text-sm pr-4">{item.q}</span>
              <ChevronDown className={`h-4 w-4 text-neutral-400 flex-shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
            </button>
            {openIndex === i && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="px-5 pb-5"
              >
                <p className="text-sm text-neutral-600 leading-relaxed">{item.a}</p>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Size Guide                                                         */
/* ------------------------------------------------------------------ */

export function SizeGuidePage() {
  const [activeTab, setActiveTab] = useState<'women' | 'men' | 'kids'>('women');

  const sizeCharts: Record<string, { size: string; bust: string; waist: string; hips: string }[]> = {
    women: [
      { size: 'XS', bust: '31-32"', waist: '23-24"', hips: '33-34"' },
      { size: 'S', bust: '33-34"', waist: '25-26"', hips: '35-36"' },
      { size: 'M', bust: '35-36"', waist: '27-28"', hips: '37-38"' },
      { size: 'L', bust: '37-39"', waist: '29-31"', hips: '39-41"' },
      { size: 'XL', bust: '40-42"', waist: '32-34"', hips: '42-44"' },
    ],
    men: [
      { size: 'S', bust: '34-36"', waist: '28-30"', hips: '35-37"' },
      { size: 'M', bust: '38-40"', waist: '32-34"', hips: '38-40"' },
      { size: 'L', bust: '42-44"', waist: '36-38"', hips: '41-43"' },
      { size: 'XL', bust: '46-48"', waist: '40-42"', hips: '44-46"' },
      { size: 'XXL', bust: '50-52"', waist: '44-46"', hips: '48-50"' },
    ],
    kids: [
      { size: '2T', bust: '20"', waist: '19"', hips: '20"' },
      { size: '3T', bust: '21"', waist: '20"', hips: '21"' },
      { size: '4T', bust: '22"', waist: '21"', hips: '22"' },
      { size: '5T', bust: '23"', waist: '22"', hips: '23"' },
      { size: '6', bust: '24"', waist: '22.5"', hips: '24"' },
    ],
  };

  return (
    <PageWrapper title="Size Guide" subtitle="Find your perfect fit with our comprehensive sizing charts.">
      <div className="space-y-8">
        {/* Tab Selector */}
        <div className="flex gap-2">
          {(['women', 'men', 'kids'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Size Chart */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="py-3 px-4 text-left font-semibold text-neutral-900">Size</th>
                <th className="py-3 px-4 text-left font-semibold text-neutral-900">Bust/Chest</th>
                <th className="py-3 px-4 text-left font-semibold text-neutral-900">Waist</th>
                <th className="py-3 px-4 text-left font-semibold text-neutral-900">Hips</th>
              </tr>
            </thead>
            <tbody>
              {sizeCharts[activeTab].map((row, i) => (
                <tr key={row.size} className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-neutral-50' : ''}`}>
                  <td className="py-3 px-4 font-medium text-neutral-900">{row.size}</td>
                  <td className="py-3 px-4 text-neutral-600">{row.bust}</td>
                  <td className="py-3 px-4 text-neutral-600">{row.waist}</td>
                  <td className="py-3 px-4 text-neutral-600">{row.hips}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tips */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="font-semibold text-amber-800 mb-3">How to Measure</h3>
          <ul className="space-y-2 text-sm text-amber-700">
            <li>• <strong>Bust:</strong> Measure around the fullest part of your chest</li>
            <li>• <strong>Waist:</strong> Measure around your natural waistline</li>
            <li>• <strong>Hips:</strong> Measure around the fullest part of your hips</li>
            <li>• If you&apos;re between sizes, we recommend sizing up for a comfortable fit</li>
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Track Order                                                        */
/* ------------------------------------------------------------------ */

export function TrackOrderPage() {
  const navigate = useRouterStore((s) => s.navigate);
  const [orderNumber, setOrderNumber] = useState('');

  return (
    <PageWrapper title="Track Your Order" subtitle="Enter your order number to check the status of your delivery.">
      <div className="max-w-lg mx-auto">
        <div className="bg-neutral-50 rounded-lg p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Search className="h-7 w-7 text-neutral-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Enter Order Number</h3>
            <p className="text-sm text-neutral-500">You can find your order number in your confirmation email or in My Orders.</p>
          </div>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. ORD-12345-ABC"
            className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400"
          />
          <Button
            onClick={() => navigate('orders')}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            Track Order
          </Button>
          <p className="text-xs text-neutral-400">
            Or view all your orders in <button onClick={() => navigate('orders')} className="text-amber-600 hover:underline">My Orders</button>
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Gift Cards                                                         */
/* ------------------------------------------------------------------ */

interface GiftCardProduct {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  images: string[];
  stock: number;
  description: string | null;
}

export function GiftCardsPage() {
  const navigate = useRouterStore((s) => s.navigate);
  const addItem = useCartStore((s) => s.addItem);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [giftCards, setGiftCards] = useState<GiftCardProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGiftCards() {
      try {
        const res = await fetch(apiUrl('/api/gift-cards'), { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
          // Map GiftCard model to the expected GiftCardProduct interface
          const cards = (data.data || []).map((gc: any) => ({
            id: gc.id,
            name: gc.name,
            price: gc.price,
            salePrice: gc.salePrice || null,
            images: gc.image ? [gc.image] : [],
            stock: 999, // Gift cards are digital, always available
            description: gc.description || null,
          }));
          setGiftCards(cards);
        }
      } catch {
        // silently fail – empty state will be shown
      } finally {
        setIsLoading(false);
      }
    }
    fetchGiftCards();
  }, []);

  const handleAddToCart = async (product: GiftCardProduct) => {
    if (!isAuthenticated) {
      toast.error('Please login to add to cart');
      navigate('auth');
      return;
    }
    try {
      setAddingId(product.id);
      await addItem(product.id, 1);
      toast.success(`${product.name} added to cart`);
    } catch {
      toast.error('Failed to add to cart. Please try again.');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <PageWrapper title="Gift Cards" subtitle="Give the gift of choice with a LUXE gift card.">
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-neutral-200 rounded-xl overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-10 w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : giftCards.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="h-7 w-7 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Gift Cards Available</h3>
          <p className="text-sm text-neutral-500 max-w-md mx-auto">
            No gift cards available at the moment. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {giftCards.map((product) => {
            const displayPrice = product.salePrice ?? product.price;
            const isOnSale = product.salePrice !== null && product.salePrice < product.price;
            const truncatedDescription = product.description
              ? product.description.length > 80
                ? product.description.slice(0, 80) + '…'
                : product.description
              : 'Perfect for any occasion. Never expires.';

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group border border-neutral-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={product.images[0] || '/placeholder.png'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <Gift className="h-6 w-6 text-amber-400 mb-1" />
                    <p className="text-white text-2xl font-bold">
                      {isOnSale ? (
                        <>
                          <span className="line-through text-white/60 text-base mr-1">{`$${product.price.toFixed(2)}`}</span>
                          {`$${displayPrice.toFixed(2)}`}
                        </>
                      ) : (
                        `$${displayPrice.toFixed(2)}`
                      )}
                    </p>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-neutral-900">{product.name}</h3>
                  <p className="text-sm text-neutral-500 mt-1">{truncatedDescription}</p>
                  <Button
                    onClick={() => handleAddToCart(product)}
                    disabled={addingId === product.id}
                    className="w-full mt-4 bg-neutral-900 hover:bg-neutral-800 text-white"
                  >
                    {addingId === product.id ? 'Adding…' : 'Add to Cart'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-12 bg-neutral-50 rounded-lg p-8">
        <h3 className="text-lg font-serif font-bold text-neutral-900 mb-4">Gift Card Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-neutral-600">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
            <p>Delivered by email with a personalized message</p>
          </div>
          <div className="flex items-start gap-2">
            <Star className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
            <p>Never expires. Use anytime on any product</p>
          </div>
          <div className="flex items-start gap-2">
            <CreditCard className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
            <p>Available in denominations set by our store</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  About / Our Story                                                  */
/* ------------------------------------------------------------------ */

export function AboutPage() {
  const navigate = useRouterStore((s) => s.navigate);

  return (
    <PageWrapper title="Our Story" subtitle="The journey behind LUXE and our passion for timeless fashion.">
      <div className="space-y-12">
        {/* Hero Image */}
        <div className="aspect-[16/9] overflow-hidden rounded-2xl">
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80"
            alt="Our Story - LUXE Fashion"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Story Content */}
        <div className="prose max-w-none">
          <h2 className="text-2xl font-serif font-bold text-neutral-900">Crafting Timeless Fashion Since 2018</h2>
          <p className="text-neutral-600 leading-relaxed">
            At LUXE, we believe that fashion is more than just clothing — it&apos;s a statement of who you are.
            Our journey began with a simple vision: to make premium fashion accessible to everyone who values
            quality, sustainability, and timeless design.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Every piece in our collection is carefully curated and crafted with attention to detail, using
            only the finest materials sourced from responsible suppliers around the world.
          </p>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Award className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Premium Quality</h3>
            <p className="text-sm text-neutral-600">We never compromise on materials or craftsmanship. Every piece is made to last.</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Heart className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Sustainable Fashion</h3>
            <p className="text-sm text-neutral-600">We&apos;re committed to ethical sourcing and environmentally conscious practices.</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-violet-600" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Community First</h3>
            <p className="text-sm text-neutral-600">Our customers are at the heart of everything we do. Your satisfaction is our priority.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-neutral-900 rounded-xl p-8 text-center text-white">
          <h3 className="text-xl font-serif font-bold mb-3">Join the LUXE Family</h3>
          <p className="text-neutral-400 mb-6 text-sm max-w-md mx-auto">Discover our curated collections and experience fashion that makes a statement.</p>
          <Button onClick={() => navigate('shop')} className="bg-amber-500 hover:bg-amber-600 text-neutral-900 font-semibold">
            Shop Now
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
