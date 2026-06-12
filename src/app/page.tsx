'use client';

import { useEffect } from 'react';
import { useRouterStore } from '@/stores/useRouterStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { useWishlistStore } from '@/stores/useWishlistStore';
import Header from '@/components/store/Header';
import Footer from '@/components/store/Footer';
import HomePage from '@/components/store/HomePage';
import ShopPage from '@/components/store/ShopPage';
import ProductDetailPage from '@/components/store/ProductDetailPage';
import CartPage from '@/components/store/CartPage';
import CheckoutPage from '@/components/store/CheckoutPage';
import OrderConfirmationPage from '@/components/store/OrderConfirmationPage';
import OrdersPage from '@/components/store/OrdersPage';
import AuthPages from '@/components/store/AuthPages';
import AccountPage from '@/components/store/AccountPage';
import WishlistPage from '@/components/store/WishlistPage';
import AdminPage from '@/components/store/AdminPage';
import { ContactPage, ShippingPage, FAQPage, SizeGuidePage, TrackOrderPage, GiftCardsPage, AboutPage } from '@/components/store/InfoPages';

function PageRenderer() {
  const page = useRouterStore((s) => s.page);

  switch (page) {
    case 'home':
      return <HomePage />;
    case 'shop':
      return <ShopPage />;
    case 'product':
      return <ProductDetailPage />;
    case 'cart':
      return <CartPage />;
    case 'checkout':
      return <CheckoutPage />;
    case 'order-confirmation':
      return <OrderConfirmationPage />;
    case 'orders':
      return <OrdersPage />;
    case 'auth':
      return <AuthPages />;
    case 'account':
      return <AccountPage />;
    case 'wishlist':
      return <WishlistPage />;
    case 'contact':
      return <ContactPage />;
    case 'shipping':
      return <ShippingPage />;
    case 'faq':
      return <FAQPage />;
    case 'size-guide':
      return <SizeGuidePage />;
    case 'track-order':
      return <TrackOrderPage />;
    case 'gift-cards':
      return <GiftCardsPage />;
    case 'about':
      return <AboutPage />;
    default:
      return <HomePage />;
  }
}

export default function Home() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const page = useRouterStore((s) => s.page);
  const isAdmin = page === 'admin';

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch cart and wishlist when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
      fetchWishlist();
    }
  }, [isAuthenticated, fetchCart, fetchWishlist]);

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <AdminPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <PageRenderer />
      </main>
      <Footer />
    </div>
  );
}
