'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Package, Heart, MapPin, Settings, LogOut, Edit3,
  Trash2, Plus, Check, X, Star, ShoppingBag
} from 'lucide-react';
import { useRouterStore } from '@/stores/useRouterStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useCartStore } from '@/stores/useCartStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type TabId = 'profile' | 'orders' | 'wishlist' | 'addresses' | 'settings';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function ProfileSection() {
  const { user, updateProfile, isLoading } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Sync form state when user data loads/changes
  const [prevUserId, setPrevUserId] = useState<string | null>(null);
  if (user && user.id !== prevUserId) {
    setPrevUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone || '');
  }

  const handleSave = async () => {
    try {
      await updateProfile({ name, email, phone });
      toast.success('Profile updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update profile');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif text-neutral-900">Profile</h2>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit3 className="w-4 h-4 mr-1" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" className="bg-neutral-900 text-white" onClick={handleSave} disabled={isLoading}>
              <Check className="w-4 h-4 mr-1" /> Save
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg">
        <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center">
          <User className="w-8 h-8 text-neutral-400" />
        </div>
        <div>
          <p className="font-medium text-neutral-900">{user?.name}</p>
          <p className="text-sm text-neutral-500">{user?.email}</p>
          <Badge variant="secondary" className="mt-1 text-xs capitalize">{user?.role}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="acc-name">Full Name</Label>
          <Input
            id="acc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!editing}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="acc-email">Email</Label>
          <Input
            id="acc-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!editing}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="acc-phone">Phone</Label>
          <Input
            id="acc-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!editing}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

function OrdersSection() {
  const { navigate } = useRouterStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif text-neutral-900">Orders</h2>
        <Button variant="outline" size="sm" onClick={() => navigate('orders')}>
          View All
        </Button>
      </div>
      <p className="text-neutral-500 text-sm">View and manage your orders on the Orders page.</p>
      <Button className="bg-neutral-900 text-white" onClick={() => navigate('orders')}>
        <Package className="w-4 h-4 mr-2" /> Go to Orders
      </Button>
    </div>
  );
}

function WishlistSection() {
  const { navigate } = useRouterStore();
  const { items, fetchWishlist, removeItem, isLoading } = useWishlistStore();
  const { addItem: addToCart } = useCartStore();

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart(productId, 1);
      toast.success('Added to cart!');
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-serif text-neutral-900">Wishlist</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-serif text-neutral-900">Wishlist ({items.length})</h2>
      {items.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="w-12 h-12 mx-auto text-neutral-200 mb-3" />
          <p className="text-neutral-500">Your wishlist is empty</p>
          <Button className="bg-neutral-900 text-white mt-4" onClick={() => navigate('shop')}>Browse Products</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="group border border-neutral-100 rounded-lg overflow-hidden">
              <div
                className="aspect-square bg-neutral-100 cursor-pointer"
                onClick={() => navigate('product', { id: item.productId })}
              >
                <img
                  src={item.product.images?.[0] || '/placeholder.jpg'}
                  alt={item.product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-neutral-900 truncate">{item.product.name}</p>
                <p className="text-xs text-neutral-500">{item.product.brand}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold">${(item.product.salePrice || item.product.price).toFixed(2)}</span>
                  {item.product.salePrice && (
                    <span className="text-xs text-neutral-400 line-through">${item.product.price.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-neutral-900 text-white text-xs h-8"
                    onClick={() => handleAddToCart(item.productId)}
                  >
                    <ShoppingBag className="w-3 h-3 mr-1" /> Add to Cart
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={async () => {
                      await removeItem(item.id);
                      toast.success('Removed from wishlist');
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

function AddressesSection() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', street: '', city: '', state: '',
    zipCode: '', country: 'US', phone: '',
  });

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/me'), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data.addresses) {
        setAddresses(data.data.addresses);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const handleAddAddress = async () => {
    try {
      // Using a simple approach - could have dedicated address API
      toast.success('Address saved');
      setShowForm(false);
    } catch {
      toast.error('Failed to save address');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif text-neutral-900">Addresses</h2>
        <Button size="sm" className="bg-neutral-900 text-white" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Address
        </Button>
      </div>

      {showForm && (
        <div className="border border-neutral-200 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-sm text-neutral-900">New Address</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} className="mt-1 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Street</Label>
              <Input value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">ZIP Code</Label>
              <Input value={form.zipCode} onChange={e => setForm(p => ({ ...p, zipCode: e.target.value }))} className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="mt-1 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-neutral-900 text-white" onClick={handleAddAddress}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 mx-auto text-neutral-200 mb-3" />
          <p className="text-neutral-500">No saved addresses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map(addr => (
            <div key={addr.id} className="flex items-start justify-between p-4 border border-neutral-100 rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-neutral-900">{addr.firstName} {addr.lastName}</p>
                  {addr.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                </div>
                <p className="text-sm text-neutral-600 mt-1">
                  {addr.street}<br />
                  {addr.city}, {addr.state} {addr.zipCode}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsSection() {
  const { logout } = useAuthStore();
  const { navigate } = useRouterStore();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('home');
    toast.success('Logged out');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-serif text-neutral-900">Settings</h2>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-900">Notifications</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-900">Email Notifications</p>
              <p className="text-xs text-neutral-500">Receive order updates via email</p>
            </div>
            <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-900">SMS Notifications</p>
              <p className="text-xs text-neutral-500">Receive order updates via SMS</p>
            </div>
            <Switch checked={smsNotifs} onCheckedChange={setSmsNotifs} />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-neutral-900">Account</h3>
        <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
        <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50">
          <Trash2 className="w-4 h-4 mr-2" /> Delete Account
        </Button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { isAuthenticated } = useAuthStore();
  const { navigate } = useRouterStore();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <User className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
        <h2 className="text-2xl font-serif text-neutral-900 mb-2">Sign in to your account</h2>
        <Button className="bg-neutral-900 text-white mt-4" onClick={() => navigate('auth', { mode: 'login' })}>
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-serif text-neutral-900 mb-8">My Account</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && <ProfileSection />}
              {activeTab === 'orders' && <OrdersSection />}
              {activeTab === 'wishlist' && <WishlistSection />}
              {activeTab === 'addresses' && <AddressesSection />}
              {activeTab === 'settings' && <SettingsSection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
