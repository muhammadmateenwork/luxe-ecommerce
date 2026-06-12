'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Heart,
  ShoppingCart,
  User,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Package,
  UserCircle,
  Shield,
} from 'lucide-react';
import { useRouterStore } from '@/stores/useRouterStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import AnnouncementBar from './AnnouncementBar';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

// Static links that don't depend on categories
const staticNavLinks = [
  { label: 'Home', page: 'home' as const, params: {} },
  { label: 'Sale', page: 'shop' as const, params: { onSale: 'true' } },
];

export default function Header() {
  const navigate = useRouterStore((s) => s.navigate);
  const page = useRouterStore((s) => s.page);
  const { isAuthenticated, user, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.getItemCount());
  const fetchCart = useCartStore((s) => s.fetchCart);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const { categories, fetchCategories } = useCategoryStore();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSaleProducts, setHasSaleProducts] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
    fetchCart();
    fetchWishlist();
    fetchCategories();
  }, [checkAuth, fetchCart, fetchWishlist, fetchCategories]);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/products?onSale=true&limit=1'), { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data?.products && data.data.products.length > 0) {
          setHasSaleProducts(true);
        }
      })
      .catch(() => {
        // Silently fail — Sale link just won't appear
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('shop', { search: searchQuery.trim() });
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const handleNavClick = (link: { label: string; page: string; params: Record<string, string> }) => {
    navigate(link.page as any, link.params || {});
    setMobileMenuOpen(false);
  };

  // Build dynamic nav links from categories
  const navLinks = [
    staticNavLinks[0], // Home
    ...categories.map((cat) => ({
      label: cat.name,
      page: 'shop' as const,
      params: { category: cat.name },
    })),
    ...(hasSaleProducts ? [staticNavLinks[1]] : []), // Sale - only if products on sale
  ];

  return (
    <>
      <AnnouncementBar />
      <header
        className={`sticky top-0 z-40 bg-white transition-shadow duration-300 ${
          isScrolled ? 'shadow-md' : ''
        }`}
      >
        {/* Main Header */}
        <div className="border-b border-neutral-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              {/* Mobile Menu Button */}
              <button
                className="lg:hidden p-2 -ml-2 text-neutral-700 hover:text-neutral-900"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Logo */}
              <button
                onClick={() => navigate('home')}
                className="flex-shrink-0"
              >
                <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-wider text-neutral-900">
                  LUXE
                </h1>
              </button>

              {/* Desktop Search Bar */}
              <form
                onSubmit={handleSearch}
                className="hidden lg:flex items-center flex-1 max-w-md mx-8"
              >
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-full text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
                  />
                </div>
              </form>

              {/* Right Icons */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Mobile Search Toggle */}
                <button
                  className="lg:hidden p-2 text-neutral-700 hover:text-neutral-900"
                  onClick={() => setSearchOpen(!searchOpen)}
                  aria-label="Search"
                >
                  <Search className="h-5 w-5" />
                </button>

                {/* Wishlist */}
                <button
                  onClick={() => navigate('wishlist')}
                  className="p-2 text-neutral-700 hover:text-neutral-900 transition-colors"
                  aria-label="Wishlist"
                >
                  <Heart className="h-5 w-5" />
                </button>

                {/* Cart */}
                <button
                  onClick={() => navigate('cart')}
                  className="p-2 text-neutral-700 hover:text-neutral-900 transition-colors relative"
                  aria-label="Cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full h-4.5 w-4.5 flex items-center justify-center min-w-[18px] h-[18px]"
                    >
                      {itemCount > 99 ? '99+' : itemCount}
                    </motion.span>
                  )}
                </button>

                {/* User */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="p-2 text-neutral-700 hover:text-neutral-900 transition-colors"
                    aria-label="Account"
                  >
                    <User className="h-5 w-5" />
                  </button>
                  <AnimatePresence>
                    {userDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-neutral-100 py-2 z-50"
                      >
                        {isAuthenticated ? (
                          <>
                            <div className="px-4 py-3 border-b border-neutral-100">
                              <p className="text-sm font-medium text-neutral-900">
                                {user?.name}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {user?.email}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                navigate('account');
                                setUserDropdownOpen(false);
                              }}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              <UserCircle className="h-4 w-4" />
                              My Profile
                            </button>
                            <button
                              onClick={() => {
                                navigate('orders');
                                setUserDropdownOpen(false);
                              }}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              <Package className="h-4 w-4" />
                              My Orders
                            </button>
                            <button
                              onClick={() => {
                                navigate('wishlist');
                                setUserDropdownOpen(false);
                              }}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              <Heart className="h-4 w-4" />
                              Wishlist
                            </button>
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => {
                                  navigate('admin');
                                  setUserDropdownOpen(false);
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                              >
                                <Shield className="h-4 w-4" />
                                Admin Panel
                              </button>
                            )}
                            <div className="border-t border-neutral-100 mt-1 pt-1">
                              <button
                                onClick={async () => {
                                  await logout();
                                  setUserDropdownOpen(false);
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                navigate('auth');
                                setUserDropdownOpen(false);
                              }}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              <User className="h-4 w-4" />
                              Sign In
                            </button>
                            <button
                              onClick={() => {
                                navigate('auth');
                                setUserDropdownOpen(false);
                              }}
                              className="w-full px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors font-medium"
                            >
                              Create Account
                            </button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-b border-neutral-100 overflow-hidden"
            >
              <form
                onSubmit={handleSearch}
                className="px-4 py-3"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    autoFocus
                    className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-full text-sm focus:outline-none focus:border-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-neutral-400" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Navigation */}
        <nav className="hidden lg:block border-b border-neutral-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ul className="flex items-center justify-center gap-8 h-12">
              {navLinks.map((link) => {
                const isActive =
                  page === link.page &&
                  (!link.params ||
                    Object.entries(link.params).every(
                      ([k, v]) =>
                        useRouterStore.getState().params[k] === v
                    ));
                return (
                  <li key={link.label}>
                    <button
                      onClick={() => handleNavClick(link)}
                      className={`text-sm font-medium tracking-wide transition-colors relative py-1 ${
                        isActive
                          ? 'text-neutral-900'
                          : 'text-neutral-500 hover:text-neutral-900'
                      } ${
                        link.label === 'Sale'
                          ? 'text-amber-600 hover:text-amber-700'
                          : ''
                      }`}
                    >
                      {link.label}
                      {link.label === 'Sale' && (
                        <span className="ml-1 inline-block px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded">
                          HOT
                        </span>
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="nav-underline"
                          className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-neutral-900"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex flex-col h-full">
            {/* Mobile Header */}
            <div className="p-6 border-b border-neutral-100">
              <h2 className="text-2xl font-serif font-bold tracking-wider text-neutral-900">
                LUXE
              </h2>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 py-4">
              <ul className="space-y-1">
                {navLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => handleNavClick(link)}
                      className={`w-full text-left px-6 py-3 text-sm font-medium transition-colors ${
                        link.label === 'Sale'
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                      }`}
                    >
                      {link.label}
                      {link.label === 'Sale' && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded">
                          HOT
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Mobile Footer */}
            <div className="p-6 border-t border-neutral-100 space-y-3">
              {isAuthenticated ? (
                <>
                  <p className="text-sm text-neutral-600">
                    Hello, <span className="font-medium text-neutral-900">{user?.name}</span>
                  </p>
                  <button
                    onClick={() => {
                      navigate('account');
                      setMobileMenuOpen(false);
                    }}
                    className="block text-sm text-neutral-700 hover:text-neutral-900"
                  >
                    My Account
                  </button>
                  <button
                    onClick={async () => {
                      await logout();
                      setMobileMenuOpen(false);
                    }}
                    className="block text-sm text-red-600 hover:text-red-700"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    navigate('auth');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
