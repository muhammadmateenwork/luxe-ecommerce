'use client';

import { useState, useEffect } from 'react';
import { useRouterStore } from '@/stores/useRouterStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { Instagram, Facebook, Twitter, Youtube, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const serviceLinks = [
  { label: 'Contact Us', page: 'contact', params: {} },
  { label: 'Shipping & Returns', page: 'shipping', params: {} },
  { label: 'FAQ', page: 'faq', params: {} },
  { label: 'Size Guide', page: 'size-guide', params: {} },
  { label: 'Track Order', page: 'track-order', params: {} },
  { label: 'Gift Cards', page: 'gift-cards', params: {} },
];

const socialLinks = [
  { icon: Instagram, label: 'Instagram' },
  { icon: Facebook, label: 'Facebook' },
  { icon: Twitter, label: 'Twitter' },
  { icon: Youtube, label: 'YouTube' },
];

export default function Footer() {
  const navigate = useRouterStore((s) => s.navigate);
  const { categories, fetchCategories } = useCategoryStore();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSaleProducts, setHasSaleProducts] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/products?onSale=true&limit=1'), { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data?.products && data.data.products.length > 0) {
          setHasSaleProducts(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Build dynamic shop links from categories
  const shopLinks = [
    ...categories.map((cat) => ({
      label: cat.name,
      page: 'shop',
      params: { category: cat.name },
    })),
    ...(hasSaleProducts ? [{ label: 'Sale', page: 'shop', params: { onSale: 'true' } }] : []),
  ];

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
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
    } catch {
      // Silently handle error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="bg-neutral-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase mb-4 text-neutral-300">
              Shop
            </h3>
            <ul className="space-y-2.5">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => navigate(link.page as any, link.params)}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase mb-4 text-neutral-300">
              Customer Service
            </h3>
            <ul className="space-y-2.5">
              {serviceLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => navigate(link.page as any, link.params)}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase mb-4 text-neutral-300">
              About LUXE
            </h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              LUXE is your destination for premium fashion that combines timeless elegance with modern design. 
              We curate collections from the world&apos;s finest designers to bring you unparalleled quality and style.
            </p>
            <button
              onClick={() => navigate('about')}
              className="mt-4 text-sm text-amber-400 hover:text-amber-300 transition-colors font-medium"
            >
              Our Story →
            </button>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase mb-4 text-neutral-300">
              Newsletter
            </h3>
            <p className="text-sm text-neutral-400 mb-4">
              Subscribe to get exclusive access to new collections, special offers, and style inspiration.
            </p>
            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-900/30 border border-green-700/50 rounded-lg p-3"
              >
                <p className="text-sm text-green-400 font-medium">
                  ✓ Thank you for subscribing!
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-900 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Subscribing...' : 'Subscribe'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-neutral-500">
              © {new Date().getFullYear()} LUXE. All rights reserved.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-4">
              {socialLinks.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  aria-label={label}
                  className="text-neutral-500 hover:text-white transition-colors"
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>

            {/* Payment Methods */}
            <div className="flex items-center gap-2">
              {['Visa', 'MC', 'Amex', 'PayPal'].map((method) => (
                <span
                  key={method}
                  className="px-2 py-1 bg-neutral-800 rounded text-[10px] font-medium text-neutral-400"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
