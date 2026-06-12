'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAdminStore } from '@/stores/useAdminStore';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { useRouterStore } from '@/stores/useRouterStore';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Grid3X3,
  Tag,
  Star,
  Menu,
  LogOut,
  Plus,
  Trash2,
  Edit,
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Eye,
  X,
  MoreVertical,
  Gift,
  Truck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';

// ─── Sidebar nav items ───────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'categories', label: 'Categories', icon: Grid3X3 },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'giftcards', label: 'Gift Cards', icon: Gift },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'reviews', label: 'Reviews', icon: Star },
] as const;

const CHART_COLORS = ['#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ef4444', '#ec4899'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

// ─── Main Component ──────────────────────────────────────────────────
export default function AdminPage() {
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore();
  const router = useRouterStore();
  const admin = useAdminStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name?: string } | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [editingGiftCard, setEditingGiftCard] = useState<any>(null);
  const [editingDeliveryMethod, setEditingDeliveryMethod] = useState<any>(null);
  const [giftCardModalOpen, setGiftCardModalOpen] = useState(false);
  const [deliveryMethodModalOpen, setDeliveryMethodModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusOrderId, setStatusOrderId] = useState('');
  const [currentStatus, setCurrentStatus] = useState('pending');

  // Search & filter
  const [productSearch, setProductSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Pagination
  const [productPage, setProductPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [couponPage, setCouponPage] = useState(1);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    description: '',
    brand: '',
    price: '',
    salePrice: '',
    categoryId: '',
    category: '',
    stock: '',
    sku: '',
    sizes: '',
    colors: '',
    images: '',
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: false,
    isTrending: false,
    isFlashSale: false,
  });

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
  });

  // Coupon form
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    minPurchase: '',
    maxDiscount: '',
    usageLimit: '',
    expiresAt: '',
    isActive: true,
  });

  // Gift card form
  const [giftCardForm, setGiftCardForm] = useState({
    name: '',
    description: '',
    price: '',
    salePrice: '',
    image: '',
    isActive: true,
  });

  // Delivery method form
  const [deliveryMethodForm, setDeliveryMethodForm] = useState({
    name: '',
    description: '',
    price: '',
    freeOverAmount: '',
    estimatedDays: '',
    isActive: true,
    order: '0',
  });

  // Gift cards & delivery methods state
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<any[]>([]);

  // ── Auth check ──────────────────────────────────────────────────────
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== 'admin') {
      router.navigate('home');
    }
  }, [isAuthenticated, user, router]);

  // ── Fetch data on tab change ────────────────────────────────────────
  const fetchData = useCallback(() => {
    switch (admin.activeTab) {
      case 'dashboard':
        admin.fetchStats();
        break;
      case 'products':
        admin.fetchProducts(productPage, productSearch || undefined);
        break;
      case 'orders':
        admin.fetchOrders(orderPage, orderStatusFilter !== 'all' ? orderStatusFilter : undefined);
        break;
      case 'users':
        admin.fetchUsers(userPage, userSearch || undefined);
        break;
      case 'categories':
        admin.fetchCategories();
        break;
      case 'coupons':
        admin.fetchCoupons(couponPage);
        break;
      case 'giftcards':
        fetchGiftCards();
        break;
      case 'delivery':
        fetchDeliveryMethods();
        break;
      case 'reviews':
        admin.fetchReviews(reviewPage);
        break;
    }
  }, [admin.activeTab, productPage, productSearch, orderPage, orderStatusFilter, userPage, userSearch, couponPage, reviewPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Helpers ──────────────────────────────────────────────────────────
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // ── Delete handler ──────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      switch (deleteTarget.type) {
        case 'product':
          await admin.deleteProduct(deleteTarget.id);
          toast.success('Product and related data deleted');
          break;
        case 'order':
          await admin.deleteOrder(deleteTarget.id);
          toast.success('Order and items deleted');
          break;
        case 'user':
          await admin.deleteUser(deleteTarget.id);
          toast.success('User and their data deleted');
          break;
        case 'category':
          await admin.deleteCategory(deleteTarget.id);
          toast.success('Category and its products deleted');
          break;
        case 'coupon':
          await admin.deleteCoupon(deleteTarget.id);
          toast.success('Coupon deleted');
          break;
        case 'giftcard':
          try {
            const res = await fetch(apiUrl(`/api/gift-cards/${deleteTarget.id}`), { method: 'DELETE', headers: getAuthHeaders() });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            toast.success('Gift card deleted');
            fetchGiftCards();
          } catch { toast.error('Failed to delete gift card'); }
          break;
        case 'deliverymethod':
          try {
            const res = await fetch(apiUrl(`/api/delivery-methods/${deleteTarget.id}`), { method: 'DELETE', headers: getAuthHeaders() });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            toast.success('Delivery method deleted');
            fetchDeliveryMethods();
          } catch { toast.error('Failed to delete delivery method'); }
          break;
        case 'review':
          await admin.deleteReview(deleteTarget.id);
          toast.success('Review deleted and product rating updated');
          break;
      }
    } catch (e: any) {
      toast.error('Delete failed');
    }
    setDeleteTarget(null);
  };

  // ── Product CRUD ────────────────────────────────────────────────────
  const openProductModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      const sizes = Array.isArray(product.sizes) ? product.sizes.join(', ') : '';
      const colors = Array.isArray(product.colors) ? product.colors.join(', ') : '';
      const images = Array.isArray(product.images) ? product.images.join(', ') : '';
      setProductForm({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        brand: product.brand || '',
        price: String(product.price || ''),
        salePrice: product.salePrice ? String(product.salePrice) : '',
        categoryId: product.categoryId || '',
        category: product.category || '',
        stock: String(product.stock || ''),
        sku: product.sku || '',
        sizes,
        colors,
        images,
        isFeatured: product.isFeatured || false,
        isNewArrival: product.isNewArrival || false,
        isBestSeller: product.isBestSeller || false,
        isTrending: product.isTrending || false,
        isFlashSale: product.isFlashSale || false,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '', slug: '', description: '', brand: '', price: '', salePrice: '',
        categoryId: '', category: '', stock: '', sku: '', sizes: '', colors: '',
        images: '', isFeatured: false, isNewArrival: false, isBestSeller: false,
        isTrending: false, isFlashSale: false,
      });
    }
    setProductModalOpen(true);
  };

  const handleProductSave = async () => {
    try {
      const payload = {
        ...productForm,
        price: parseFloat(productForm.price),
        salePrice: productForm.salePrice ? parseFloat(productForm.salePrice) : null,
        stock: parseInt(productForm.stock) || 0,
        sizes: productForm.sizes ? productForm.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
        colors: productForm.colors ? productForm.colors.split(',').map(s => s.trim()).filter(Boolean) : [],
        images: productForm.images ? productForm.images.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      if (editingProduct) {
        const res = await fetch(apiUrl(`/api/products/${editingProduct.id}`), {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        toast.success('Product updated');
      } else {
        const res = await fetch(apiUrl('/api/products'), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        toast.success('Product created');
      }
      setProductModalOpen(false);
      admin.fetchProducts(productPage, productSearch || undefined);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save product');
    }
  };

  // ── Category CRUD ───────────────────────────────────────────────────
  const openCategoryModal = (cat?: any) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({ name: cat.name, slug: cat.slug, description: cat.description || '', image: cat.image || '' });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', slug: '', description: '', image: '' });
    }
    setCategoryModalOpen(true);
  };

  const handleCategorySave = async () => {
    try {
      if (editingCategory) {
        // Update category via PUT — we don't have an explicit PUT endpoint in the store,
        // so we'll use the existing addCategory or direct fetch
        const res = await fetch(apiUrl(`/api/categories/${editingCategory.id}`), {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(categoryForm),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        toast.success('Category updated');
      } else {
        await admin.addCategory(categoryForm);
        toast.success('Category created');
      }
      setCategoryModalOpen(false);
      admin.fetchCategories();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save category');
    }
  };

  // ── Coupon CRUD ─────────────────────────────────────────────────────
  const openCouponModal = (coupon?: any) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm({
        code: coupon.code || '',
        discount: String(coupon.discount || ''),
        discountType: coupon.discountType || 'percentage',
        minPurchase: coupon.minPurchase ? String(coupon.minPurchase) : '',
        maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
        usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
        expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '',
        isActive: coupon.isActive ?? true,
      });
    } else {
      setEditingCoupon(null);
      setCouponForm({
        code: '', discount: '', discountType: 'percentage', minPurchase: '',
        maxDiscount: '', usageLimit: '', expiresAt: '', isActive: true,
      });
    }
    setCouponModalOpen(true);
  };

  const handleCouponSave = async () => {
    try {
      const payload = {
        ...couponForm,
        discount: parseFloat(couponForm.discount),
        minPurchase: couponForm.minPurchase ? parseFloat(couponForm.minPurchase) : null,
        maxDiscount: couponForm.maxDiscount ? parseFloat(couponForm.maxDiscount) : null,
        usageLimit: couponForm.usageLimit ? parseInt(couponForm.usageLimit) : null,
        expiresAt: couponForm.expiresAt || null,
      };

      if (editingCoupon) {
        const res = await fetch(apiUrl(`/api/coupons/${editingCoupon.id}`), {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        toast.success('Coupon updated');
      } else {
        await admin.addCoupon(payload);
        toast.success('Coupon created');
      }

      setCouponModalOpen(false);
      setEditingCoupon(null);
      setCouponForm({
        code: '', discount: '', discountType: 'percentage', minPurchase: '',
        maxDiscount: '', usageLimit: '', expiresAt: '', isActive: true,
      });
      admin.fetchCoupons(couponPage);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save coupon');
    }
  };

  // ── Order status ────────────────────────────────────────────────────
  const handleStatusUpdate = async () => {
    try {
      await admin.updateOrderStatus(statusOrderId, currentStatus);
      toast.success('Order status updated');
      setStatusModalOpen(false);
    } catch {
      toast.error('Failed to update status');
    }
  };

  // ── Gift Cards CRUD ────────────────────────────────────────────────
  const fetchGiftCards = async () => {
    try {
      const res = await fetch(apiUrl('/api/gift-cards/all'), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setGiftCards(data.data || []);
    } catch { /* silent */ }
  };

  const openGiftCardModal = (gc?: any) => {
    if (gc) {
      setEditingGiftCard(gc);
      setGiftCardForm({
        name: gc.name || '',
        description: gc.description || '',
        price: String(gc.price || ''),
        salePrice: gc.salePrice ? String(gc.salePrice) : '',
        image: gc.image || '',
        isActive: gc.isActive ?? true,
      });
    } else {
      setEditingGiftCard(null);
      setGiftCardForm({ name: '', description: '', price: '', salePrice: '', image: '', isActive: true });
    }
    setGiftCardModalOpen(true);
  };

  const handleGiftCardSave = async () => {
    try {
      const payload = {
        ...giftCardForm,
        price: parseFloat(giftCardForm.price),
        salePrice: giftCardForm.salePrice ? parseFloat(giftCardForm.salePrice) : null,
      };

      if (editingGiftCard) {
        const res = await fetch(apiUrl(`/api/gift-cards/${editingGiftCard.id}`), {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        toast.success('Gift card updated');
      } else {
        const res = await fetch(apiUrl('/api/gift-cards'), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        toast.success('Gift card created');
      }
      setGiftCardModalOpen(false);
      fetchGiftCards();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save gift card');
    }
  };

  // ── Delivery Methods CRUD ──────────────────────────────────────────
  const fetchDeliveryMethods = async () => {
    try {
      const res = await fetch(apiUrl('/api/delivery-methods/all'), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setDeliveryMethods(data.data || []);
    } catch { /* silent */ }
  };

  const openDeliveryMethodModal = (dm?: any) => {
    if (dm) {
      setEditingDeliveryMethod(dm);
      setDeliveryMethodForm({
        name: dm.name || '',
        description: dm.description || '',
        price: String(dm.price ?? ''),
        freeOverAmount: dm.freeOverAmount ? String(dm.freeOverAmount) : '',
        estimatedDays: dm.estimatedDays || '',
        isActive: dm.isActive ?? true,
        order: String(dm.order ?? 0),
      });
    } else {
      setEditingDeliveryMethod(null);
      setDeliveryMethodForm({ name: '', description: '', price: '', freeOverAmount: '', estimatedDays: '', isActive: true, order: '0' });
    }
    setDeliveryMethodModalOpen(true);
  };

  const handleDeliveryMethodSave = async () => {
    try {
      const payload = {
        ...deliveryMethodForm,
        price: parseFloat(deliveryMethodForm.price),
        freeOverAmount: deliveryMethodForm.freeOverAmount ? parseFloat(deliveryMethodForm.freeOverAmount) : null,
        order: parseInt(deliveryMethodForm.order) || 0,
      };

      if (editingDeliveryMethod) {
        const res = await fetch(apiUrl(`/api/delivery-methods/${editingDeliveryMethod.id}`), {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        toast.success('Delivery method updated');
      } else {
        const res = await fetch(apiUrl('/api/delivery-methods'), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        toast.success('Delivery method created');
      }
      setDeliveryMethodModalOpen(false);
      fetchDeliveryMethods();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save delivery method');
    }
  };

  // ── Toggle block user ───────────────────────────────────────────────
  const handleToggleBlock = async (id: string, isBlocked: boolean) => {
    try {
      await admin.toggleBlockUser(id, isBlocked);
      toast.success(isBlocked ? 'User unblocked' : 'User blocked');
    } catch {
      toast.error('Failed to update user');
    }
  };

  // ── Render: Not authorized ──────────────────────────────────────────
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Admin Access Required</CardTitle>
            <CardDescription>You must be an admin to access this panel.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.navigate('auth')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Sidebar content (shared between desktop & mobile) ───────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-neutral-800">
        <h2 className="text-lg font-bold text-white tracking-tight">Admin Panel</h2>
        <p className="text-neutral-400 text-xs mt-0.5">E-Commerce Management</p>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = admin.activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                admin.setActiveTab(item.id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-neutral-800 text-amber-400 border-r-2 border-amber-400'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-neutral-800">
        <Button
          variant="ghost"
          className="w-full justify-start text-neutral-400 hover:text-white hover:bg-neutral-800"
          onClick={async () => {
            await logout();
            router.navigate('home');
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  // ── Tab content ─────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (admin.activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'products':
        return <ProductsTab />;
      case 'orders':
        return <OrdersTab />;
      case 'users':
        return <UsersTab />;
      case 'categories':
        return <CategoriesTab />;
      case 'coupons':
        return <CouponsTab />;
      case 'giftcards':
        return <GiftCardsTab />;
      case 'delivery':
        return <DeliveryMethodsTab />;
      case 'reviews':
        return <ReviewsTab />;
      default:
        return <DashboardTab />;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Dashboard Tab
  // ═══════════════════════════════════════════════════════════════════════
  const DashboardTab = () => {
    const s = admin.stats;
    if (admin.isLoading && !s) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="lg:col-span-2 h-80 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
          </div>
        </div>
      );
    }

    const statCards = [
      { label: 'Total Revenue', value: formatCurrency(s?.totalRevenue || 0), icon: DollarSign, border: 'border-l-amber-500', change: '+12.5%' },
      { label: 'Total Orders', value: String(s?.totalOrders || 0), icon: ShoppingCart, border: 'border-l-emerald-500', change: '+8.2%' },
      { label: 'Total Users', value: String(s?.totalUsers || 0), icon: Users, border: 'border-l-violet-500', change: '+3.1%' },
      { label: 'Total Products', value: String(s?.totalProducts || 0), icon: Package, border: 'border-l-cyan-500', change: '+2.4%' },
    ];

    const monthlyData = s?.monthlySales || [];
    const ordersByStatus = s?.ordersByStatus || {};
    const pieData = Object.entries(ordersByStatus).map(([name, value]) => ({ name, value }));
    const topProducts = s?.topProducts || [];

    return (
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(card => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className={`border-l-4 ${card.border}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-500">{card.label}</p>
                      <p className="text-2xl font-bold mt-1">{card.value}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-neutral-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-xs">
                    <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                    <span className="text-emerald-500 font-medium">{card.change}</span>
                    <span className="text-neutral-400 ml-1">vs last month</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Revenue Overview</CardTitle>
              <CardDescription>Monthly sales performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5' }}
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#f59e0b"
                      fill="url(#salesGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Orders by Status Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Orders by Status</CardTitle>
              <CardDescription>Distribution overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
                    No order data
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {pieData.map((d, idx) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                    <span className="capitalize">{d.name}</span>
                    <span className="text-neutral-400">({d.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders & Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {admin.orders.length > 0 ? (
                <div className="space-y-3">
                  {admin.orders.slice(0, 5).map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-neutral-500">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(order.total)}</p>
                        <Badge className={`text-[10px] ${STATUS_COLORS[order.status] || ''}`} variant="secondary">
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">No recent orders</p>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((p: any, i: number) => (
                    <div key={p.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0">
                      <span className="text-sm font-bold text-neutral-300 w-5">{i + 1}</span>
                      <div className="h-9 w-9 rounded bg-neutral-100 overflow-hidden shrink-0">
                        {p.images && Array.isArray(p.images) && p.images[0] ? (
                          <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-neutral-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-neutral-500">{p.totalSold} sold</p>
                      </div>
                      <p className="text-sm font-medium">{formatCurrency(p.price)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">No top products data</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Products Tab
  // ═══════════════════════════════════════════════════════════════════════
  const ProductsTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search products..."
            value={productSearch}
            onChange={e => { setProductSearch(e.target.value); setProductPage(1); }}
            className="pl-9"
          />
        </div>
        <Button onClick={() => openProductModal()} className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {admin.isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
      ) : (
        <>
          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden sm:table-cell">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admin.products.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded bg-neutral-100 overflow-hidden">
                        {Array.isArray(p.images) && p.images[0] ? (
                          <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-neutral-300" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-neutral-500">{p.brand}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.category || (p.categoryRef?.name)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{formatCurrency(p.price)}</p>
                        {p.salePrice && (
                          <p className="text-xs text-emerald-600">Sale: {formatCurrency(p.salePrice)}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={p.stock > 0 ? 'secondary' : 'destructive'} className="text-xs">
                        {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.isFeatured && <Badge className="text-[10px] bg-amber-100 text-amber-800" variant="secondary">Featured</Badge>}
                        {p.isNewArrival && <Badge className="text-[10px] bg-emerald-100 text-emerald-800" variant="secondary">New</Badge>}
                        {p.isBestSeller && <Badge className="text-[10px] bg-violet-100 text-violet-800" variant="secondary">Best</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openProductModal(p)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteTarget({ type: 'product', id: p.id, name: p.name })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {admin.products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-neutral-400">No products found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControl
            page={productPage}
            setPage={setProductPage}
            pagination={admin.pagination.products}
          />
        </>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Orders Tab
  // ═══════════════════════════════════════════════════════════════════════
  const OrdersTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Select value={orderStatusFilter} onValueChange={v => { setOrderStatusFilter(v); setOrderPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {admin.isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
      ) : (
        <>
          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admin.orders.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium text-sm">{o.orderNumber}</TableCell>
                    <TableCell className="text-sm">{o.user?.name || o.userId}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-neutral-500">{formatDate(o.createdAt)}</TableCell>
                    <TableCell className="font-medium text-sm">{formatCurrency(o.total)}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs capitalize ${STATUS_COLORS[o.status] || ''}`} variant="secondary">
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setStatusOrderId(o.id); setCurrentStatus(o.status); setStatusModalOpen(true); }}>
                            <Edit className="h-4 w-4 mr-2" /> Update Status
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteTarget({ type: 'order', id: o.id, name: o.orderNumber })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {admin.orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-neutral-400">No orders found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControl
            page={orderPage}
            setPage={setOrderPage}
            pagination={admin.pagination.orders}
          />
        </>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Users Tab
  // ═══════════════════════════════════════════════════════════════════════
  const UsersTab = () => (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          placeholder="Search users..."
          value={userSearch}
          onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
          className="pl-9"
        />
      </div>

      {admin.isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
      ) : (
        <>
          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admin.users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-neutral-200 overflow-hidden shrink-0">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs font-bold text-neutral-500">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-sm">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">{u.email}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-xs capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${u.isBlocked ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}
                        variant="secondary"
                      >
                        {u.isBlocked ? 'Blocked' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-neutral-500">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleBlock(u.id, u.isBlocked)}>
                            {u.isBlocked ? 'Unblock User' : 'Block User'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteTarget({ type: 'user', id: u.id, name: u.name })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {admin.users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-neutral-400">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControl
            page={userPage}
            setPage={setUserPage}
            pagination={admin.pagination.users}
          />
        </>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Categories Tab
  // ═══════════════════════════════════════════════════════════════════════
  const CategoriesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openCategoryModal()} className="gap-2">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {admin.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {admin.categories.map((cat: any) => (
            <Card key={cat.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                      {cat.image ? (
                        <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Grid3X3 className="h-4 w-4 text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{cat.name}</p>
                      <p className="text-xs text-neutral-500">{cat.slug}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openCategoryModal(cat)}>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {cat.description && (
                  <p className="text-xs text-neutral-500 mt-2 line-clamp-2">{cat.description}</p>
                )}
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {cat._count?.products || 0} products
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {admin.categories.length === 0 && (
            <div className="col-span-full text-center py-8 text-neutral-400">No categories found</div>
          )}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Coupons Tab
  // ═══════════════════════════════════════════════════════════════════════
  const CouponsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openCouponModal()} className="gap-2">
          <Plus className="h-4 w-4" /> Create Coupon
        </Button>
      </div>

      {admin.isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
      ) : (
        <>
          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Min Purchase</TableHead>
                  <TableHead className="hidden sm:table-cell">Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admin.coupons.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium text-sm">{c.code}</TableCell>
                    <TableCell className="text-sm">
                      {c.discountType === 'percentage' ? `${c.discount}%` : formatCurrency(c.discount)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell capitalize text-sm">{c.discountType}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {c.minPurchase ? formatCurrency(c.minPurchase) : '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {c.usageCount}/{c.usageLimit || '∞'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'}`}
                        variant="secondary"
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openCouponModal(c)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteTarget({ type: 'coupon', id: c.id, name: c.code })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {admin.coupons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-neutral-400">No coupons found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControl
            page={couponPage}
            setPage={setCouponPage}
            pagination={admin.pagination.coupons}
          />
        </>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Reviews Tab
  // ═══════════════════════════════════════════════════════════════════════
  const ReviewsTab = () => (
    <div className="space-y-4">
      {admin.isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
      ) : (
        <>
          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="hidden md:table-cell">Title</TableHead>
                  <TableHead className="hidden lg:table-cell">Comment</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admin.reviews.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm max-w-[120px] truncate">{r.product?.name || r.productId}</TableCell>
                    <TableCell className="text-sm">{r.user?.name || r.userId}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-300'}`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm max-w-[150px] truncate">{r.title}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-neutral-500 max-w-[200px] truncate">{r.comment}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-neutral-500">{formatDate(r.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => setDeleteTarget({ type: 'review', id: r.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {admin.reviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-neutral-400">No reviews found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControl
            page={reviewPage}
            setPage={setReviewPage}
            pagination={admin.pagination.reviews}
          />
        </>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Gift Cards Tab
  // ═══════════════════════════════════════════════════════════════════════
  const GiftCardsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gift Cards</h3>
        <Button onClick={() => openGiftCardModal()} className="gap-2">
          <Plus className="h-4 w-4" /> Add Gift Card
        </Button>
      </div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="hidden sm:table-cell">Sale Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {giftCards.map((gc: any) => (
              <TableRow key={gc.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {gc.image ? (
                      <img src={gc.image} alt={gc.name} className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-neutral-100 flex items-center justify-center">
                        <Gift className="h-4 w-4 text-neutral-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{gc.name}</p>
                      {gc.description && <p className="text-xs text-neutral-500 truncate max-w-[200px]">{gc.description}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-sm">{formatCurrency(gc.price)}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm">
                  {gc.salePrice ? (
                    <span className="text-emerald-600">{formatCurrency(gc.salePrice)}</span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={gc.isActive ? 'secondary' : 'destructive'} className="text-xs">
                    {gc.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openGiftCardModal(gc)}>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteTarget({ type: 'giftcard', id: gc.id, name: gc.name })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {giftCards.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-neutral-400">No gift cards found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Delivery Methods Tab
  // ═══════════════════════════════════════════════════════════════════════
  const DeliveryMethodsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Delivery Methods</h3>
        <Button onClick={() => openDeliveryMethodModal()} className="gap-2">
          <Plus className="h-4 w-4" /> Add Method
        </Button>
      </div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="hidden sm:table-cell">Free Over</TableHead>
              <TableHead className="hidden md:table-cell">Est. Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveryMethods.map((dm: any) => (
              <TableRow key={dm.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{dm.name}</p>
                    {dm.description && <p className="text-xs text-neutral-500">{dm.description}</p>}
                  </div>
                </TableCell>
                <TableCell className="font-medium text-sm">{dm.price === 0 ? 'Free' : formatCurrency(dm.price)}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm">
                  {dm.freeOverAmount ? formatCurrency(dm.freeOverAmount) : <span className="text-neutral-400">—</span>}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-neutral-500">{dm.estimatedDays || '—'}</TableCell>
                <TableCell>
                  <Badge variant={dm.isActive ? 'secondary' : 'destructive'} className="text-xs">
                    {dm.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDeliveryMethodModal(dm)}>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteTarget({ type: 'deliverymethod', id: dm.id, name: dm.name })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {deliveryMethods.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-neutral-400">No delivery methods found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Pagination Control
  // ═══════════════════════════════════════════════════════════════════════
  const PaginationControl = ({ page, setPage, pagination }: {
    page: number;
    setPage: (p: number) => void;
    pagination: { pages: number; total: number } | null;
  }) => {
    if (!pagination || pagination.pages <= 1) return null;
    return (
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-neutral-500">{pagination.total} total items</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            Page {page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.pages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col bg-neutral-900 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0 bg-neutral-900 border-neutral-800">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b h-14 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => router.navigate('home')} className="cursor-pointer">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="capitalize">{admin.activeTab}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-neutral-500">Admin</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-bold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {renderTabContent()}
        </main>
      </div>

      {/* ═══ Product Modal ═══ */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product details' : 'Fill in the product information'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={productForm.name}
                  onChange={e => {
                    const name = e.target.value;
                    setProductForm(f => ({ ...f, name, slug: f.slug || slugify(name) }));
                  }}
                  placeholder="Product name"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={productForm.slug}
                  onChange={e => setProductForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="product-slug"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={productForm.description}
                onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Product description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Brand *</Label>
                <Input
                  value={productForm.brand}
                  onChange={e => setProductForm(f => ({ ...f, brand: e.target.value }))}
                  placeholder="Brand name"
                />
              </div>
              <div className="space-y-2">
                <Label>Price *</Label>
                <Input
                  type="number"
                  value={productForm.price}
                  onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Sale Price</Label>
                <Input
                  type="number"
                  value={productForm.salePrice}
                  onChange={e => setProductForm(f => ({ ...f, salePrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category ID *</Label>
                <Select
                  value={productForm.categoryId}
                  onValueChange={v => {
                    const cat = admin.categories.find((c: any) => c.id === v);
                    setProductForm(f => ({ ...f, categoryId: v, category: cat?.slug || '' }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {admin.categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={productForm.stock}
                  onChange={e => setProductForm(f => ({ ...f, stock: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input
                  value={productForm.sku}
                  onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))}
                  placeholder="SKU-001"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sizes (comma separated)</Label>
                <Input
                  value={productForm.sizes}
                  onChange={e => setProductForm(f => ({ ...f, sizes: e.target.value }))}
                  placeholder="S, M, L, XL"
                />
              </div>
              <div className="space-y-2">
                <Label>Colors (comma separated)</Label>
                <Input
                  value={productForm.colors}
                  onChange={e => setProductForm(f => ({ ...f, colors: e.target.value }))}
                  placeholder="Red, Blue, Black"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Images (comma separated URLs)</Label>
              <Input
                value={productForm.images}
                onChange={e => setProductForm(f => ({ ...f, images: e.target.value }))}
                placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
              />
            </div>
            <Separator />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'isFeatured' as const, label: 'Featured' },
                { key: 'isNewArrival' as const, label: 'New Arrival' },
                { key: 'isBestSeller' as const, label: 'Best Seller' },
                { key: 'isTrending' as const, label: 'Trending' },
                { key: 'isFlashSale' as const, label: 'Flash Sale' },
              ].map(flag => (
                <div key={flag.key} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-50">
                  <Label className="text-sm cursor-pointer">{flag.label}</Label>
                  <Switch
                    checked={productForm[flag.key]}
                    onCheckedChange={v => setProductForm(f => ({ ...f, [flag.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductModalOpen(false)}>Cancel</Button>
            <Button onClick={handleProductSave}>{editingProduct ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Category Modal ═══ */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update category details' : 'Create a new product category'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={categoryForm.name}
                onChange={e => {
                  const name = e.target.value;
                  setCategoryForm(f => ({ ...f, name, slug: f.slug || slugify(name) }));
                }}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                value={categoryForm.slug}
                onChange={e => setCategoryForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="category-slug"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={categoryForm.description}
                onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Category description"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={categoryForm.image}
                onChange={e => setCategoryForm(f => ({ ...f, image: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCategorySave}>{editingCategory ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Coupon Modal ═══ */}
      <Dialog open={couponModalOpen} onOpenChange={(open) => {
        setCouponModalOpen(open);
        if (!open) setEditingCoupon(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
            <DialogDescription>{editingCoupon ? 'Update coupon details' : 'Add a new discount coupon'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={couponForm.code}
                  onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SAVE20"
                />
              </div>
              <div className="space-y-2">
                <Label>Discount *</Label>
                <Input
                  type="number"
                  value={couponForm.discount}
                  onChange={e => setCouponForm(f => ({ ...f, discount: e.target.value }))}
                  placeholder="20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type *</Label>
                <Select
                  value={couponForm.discountType}
                  onValueChange={v => setCouponForm(f => ({ ...f, discountType: v as 'percentage' | 'fixed' }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min Purchase</Label>
                <Input
                  type="number"
                  value={couponForm.minPurchase}
                  onChange={e => setCouponForm(f => ({ ...f, minPurchase: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Discount</Label>
                <Input
                  type="number"
                  value={couponForm.maxDiscount}
                  onChange={e => setCouponForm(f => ({ ...f, maxDiscount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  value={couponForm.usageLimit}
                  onChange={e => setCouponForm(f => ({ ...f, usageLimit: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={couponForm.expiresAt}
                onChange={e => setCouponForm(f => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-50">
              <Label className="text-sm cursor-pointer">Active</Label>
              <Switch
                checked={couponForm.isActive}
                onCheckedChange={v => setCouponForm(f => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCouponSave}>{editingCoupon ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Order Status Modal ═══ */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>Change the status for this order</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Order Status</Label>
            <Select value={currentStatus} onValueChange={setCurrentStatus}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>Cancel</Button>
            <Button onClick={handleStatusUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Gift Card Modal ═══ */}
      <Dialog open={giftCardModalOpen} onOpenChange={setGiftCardModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGiftCard ? 'Edit Gift Card' : 'Add Gift Card'}</DialogTitle>
            <DialogDescription>
              {editingGiftCard ? 'Update gift card details' : 'Create a new gift card for your store'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={giftCardForm.name}
                onChange={(e) => setGiftCardForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., $50 Gift Card"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={giftCardForm.description}
                onChange={(e) => setGiftCardForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Gift card description..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  value={giftCardForm.price}
                  onChange={(e) => setGiftCardForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="50.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Sale Price (optional)</Label>
                <Input
                  type="number"
                  value={giftCardForm.salePrice}
                  onChange={(e) => setGiftCardForm(prev => ({ ...prev, salePrice: e.target.value }))}
                  placeholder="40.00"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                value={giftCardForm.image}
                onChange={(e) => setGiftCardForm(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={giftCardForm.isActive}
                onCheckedChange={(checked) => setGiftCardForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGiftCardModalOpen(false)}>Cancel</Button>
            <Button onClick={handleGiftCardSave} className="bg-neutral-900 hover:bg-neutral-800 text-white">
              {editingGiftCard ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delivery Method Modal ═══ */}
      <Dialog open={deliveryMethodModalOpen} onOpenChange={setDeliveryMethodModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDeliveryMethod ? 'Edit Delivery Method' : 'Add Delivery Method'}</DialogTitle>
            <DialogDescription>
              {editingDeliveryMethod ? 'Update delivery method details' : 'Create a new delivery method'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Method Name</Label>
              <Input
                value={deliveryMethodForm.name}
                onChange={(e) => setDeliveryMethodForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Standard Shipping"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={deliveryMethodForm.description}
                onChange={(e) => setDeliveryMethodForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Delivery method description..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  value={deliveryMethodForm.price}
                  onChange={(e) => setDeliveryMethodForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="9.99"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Free Over Amount</Label>
                <Input
                  type="number"
                  value={deliveryMethodForm.freeOverAmount}
                  onChange={(e) => setDeliveryMethodForm(prev => ({ ...prev, freeOverAmount: e.target.value }))}
                  placeholder="100.00"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estimated Days</Label>
                <Input
                  value={deliveryMethodForm.estimatedDays}
                  onChange={(e) => setDeliveryMethodForm(prev => ({ ...prev, estimatedDays: e.target.value }))}
                  placeholder="3-5 business days"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={deliveryMethodForm.order}
                  onChange={(e) => setDeliveryMethodForm(prev => ({ ...prev, order: e.target.value }))}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={deliveryMethodForm.isActive}
                onCheckedChange={(checked) => setDeliveryMethodForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryMethodModalOpen(false)}>Cancel</Button>
            <Button onClick={handleDeliveryMethodSave} className="bg-neutral-900 hover:bg-neutral-800 text-white">
              {editingDeliveryMethod ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirmation ═══ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {deleteTarget?.type}
              {deleteTarget?.name ? ` (${deleteTarget.name})` : ''}.
              {deleteTarget?.type === 'category' && ' All products in this category, along with their reviews, cart items, and wishlist entries, will also be permanently deleted.'}
              {deleteTarget?.type === 'product' && ' All reviews, cart items, and wishlist entries for this product will also be deleted. Order history will be preserved.'}
              {deleteTarget?.type === 'user' && ' All reviews, cart items, and wishlist entries by this user will also be deleted. Their orders will be preserved but anonymized.'}
              {deleteTarget?.type === 'review' && ' The product\'s rating will be automatically recalculated.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
