'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, ChevronDown, ChevronUp, Truck, Clock, XCircle,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { useRouterStore } from '@/stores/useRouterStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  size?: string | null;
  color?: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  shippingAddress: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  pending: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  processing: { color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200', icon: Package },
  shipped: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: Truck },
  delivered: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  cancelled: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
};

export default function OrdersPage() {
  const { navigate } = useRouterStore();
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/orders?page=${page}&limit=10`), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders);
        setPagination(data.data.pagination);
      }
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, fetchOrders]);

  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Order cancelled successfully');
        fetchOrders(pagination.page);
      } else {
        toast.error(data.error || 'Failed to cancel order');
      }
    } catch {
      toast.error('Failed to cancel order');
    }
  };

  const parseAddress = (addrStr: string) => {
    try {
      return JSON.parse(addrStr);
    } catch {
      return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Package className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
        <h2 className="text-2xl font-serif text-neutral-900 mb-2">Sign in to view your orders</h2>
        <Button className="bg-neutral-900 hover:bg-neutral-800 text-white mt-4" onClick={() => navigate('auth', { mode: 'login' })}>
          Sign In
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-40 w-full rounded-lg mb-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-serif text-neutral-900 mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto text-neutral-200 mb-4" />
          <h2 className="text-xl font-serif text-neutral-900 mb-2">No orders yet</h2>
          <p className="text-neutral-500 mb-6">Start shopping to see your orders here.</p>
          <Button className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => navigate('shop')}>
            Start Shopping
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            const isExpanded = expandedOrder === order.id;
            const shippingAddr = parseAddress(order.shippingAddress);

            return (
              <motion.div
                key={order.id}
                layout
                className="border border-neutral-100 rounded-lg overflow-hidden bg-white"
              >
                {/* Order Header */}
                <button
                  className="w-full flex items-center justify-between p-4 md:p-6 text-left hover:bg-neutral-50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <p className="font-medium text-neutral-900 truncate">#{order.orderNumber}</p>
                      <Badge variant="outline" className={`${config.bg} ${config.color} border w-fit text-xs`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-500 mt-1">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })} • {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-neutral-900">${order.total.toFixed(2)}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 md:px-6 pb-4 md:pb-6 space-y-4">
                        <Separator />

                        {/* Items */}
                        <div className="space-y-3">
                          {order.items.map(item => (
                            <div key={item.id} className="flex gap-3">
                              <div className="w-14 h-14 rounded overflow-hidden bg-neutral-100 flex-shrink-0">
                                <img src={item.image || '/placeholder.jpg'} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-900 truncate">{item.name}</p>
                                <p className="text-xs text-neutral-500">
                                  Qty: {item.quantity}
                                  {item.size && ` • Size: ${item.size}`}
                                  {item.color && ` • Color: ${item.color}`}
                                </p>
                              </div>
                              <p className="text-sm font-medium text-neutral-900">${(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>

                        <Separator />

                        {/* Order Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Shipping Address</p>
                            {shippingAddr ? (
                              <p className="text-sm text-neutral-700">
                                {shippingAddr.firstName} {shippingAddr.lastName}<br />
                                {shippingAddr.street}<br />
                                {shippingAddr.city}, {shippingAddr.state} {shippingAddr.zipCode}
                              </p>
                            ) : (
                              <p className="text-sm text-neutral-400">N/A</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Order Summary</p>
                            <div className="text-sm text-neutral-700 space-y-1">
                              <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>${order.subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Shipping</span>
                                <span>{order.shippingCost === 0 ? 'Free' : `$${order.shippingCost.toFixed(2)}`}</span>
                              </div>
                              {order.discount > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                  <span>Discount</span>
                                  <span>-${order.discount.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-semibold">
                                <span>Total</span>
                                <span>${order.total.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {order.status === 'pending' && (
                          <div className="flex justify-end pt-2">
                            <Button
                              variant="outline"
                              className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Cancel Order
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchOrders(pagination.page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center text-sm text-neutral-500 px-2">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchOrders(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
