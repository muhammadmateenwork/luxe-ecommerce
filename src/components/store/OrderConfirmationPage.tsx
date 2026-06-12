'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Truck, MapPin, ArrowRight } from 'lucide-react';
import { useRouterStore } from '@/stores/useRouterStore';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
  billingAddress: string | null;
  paymentMethod: string;
  couponCode: string | null;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderConfirmationPage() {
  const { params, navigate } = useRouterStore();
  const orderId = params.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const res = await fetch(apiUrl(`/api/orders/${orderId}`), { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
          setOrder(data.data);
        } else {
          toast.error('Order not found');
        }
      } catch {
        toast.error('Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const parsedShippingAddress = order ? (() => {
    try {
      return JSON.parse(order.shippingAddress);
    } catch {
      return null;
    }
  })() : null;

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);
  const deliveryStr = estimatedDelivery.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Skeleton className="w-20 h-20 rounded-full mx-auto mb-4" />
        <Skeleton className="h-8 w-64 mx-auto mb-2" />
        <Skeleton className="h-4 w-48 mx-auto mb-8" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-serif text-neutral-900 mb-2">Order Confirmed!</h1>
        <p className="text-neutral-500">Thank you for your purchase</p>
        {order && (
          <p className="text-sm text-neutral-500 mt-1">Order #{order.orderNumber}</p>
        )}
      </motion.div>

      {order && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Delivery Estimate */}
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
            <Truck className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">Estimated Delivery</p>
              <p className="text-sm text-amber-700">{deliveryStr}</p>
            </div>
          </div>

          {/* Order Items */}
          <div className="border border-neutral-100 rounded-lg overflow-hidden">
            <div className="p-4 bg-neutral-50">
              <h2 className="font-serif text-neutral-900">Order Details</h2>
            </div>
            <div className="divide-y divide-neutral-100">
              {order.items.map(item => (
                <div key={item.id} className="flex gap-3 p-4">
                  <div className="w-16 h-16 rounded overflow-hidden bg-neutral-100 flex-shrink-0">
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
                  <p className="text-sm font-semibold text-neutral-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Order Total */}
          <div className="border border-neutral-100 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Shipping</span>
              <span>{order.shippingCost === 0 ? 'Free' : `$${order.shippingCost.toFixed(2)}`}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>-${order.discount.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-neutral-900">${order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Shipping Address */}
          {parsedShippingAddress && (
            <div className="border border-neutral-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-neutral-400" />
                <h3 className="font-medium text-neutral-900 text-sm">Shipping Address</h3>
              </div>
              <p className="text-sm text-neutral-600">
                {parsedShippingAddress.firstName} {parsedShippingAddress.lastName}<br />
                {parsedShippingAddress.street}<br />
                {parsedShippingAddress.city}, {parsedShippingAddress.state} {parsedShippingAddress.zipCode}<br />
                {parsedShippingAddress.country}
              </p>
            </div>
          )}

          {/* Order Timeline */}
          <div className="border border-neutral-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-neutral-400" />
              <h3 className="font-medium text-neutral-900 text-sm">Order Status</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Order Placed', done: true, date: new Date(order.createdAt).toLocaleDateString() },
                { label: 'Processing', done: false },
                { label: 'Shipped', done: false },
                { label: 'Delivered', done: false },
              ].map((step, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    step.done ? 'bg-emerald-500' : 'bg-neutral-200'
                  }`} />
                  <span className={`text-sm ${step.done ? 'text-neutral-900' : 'text-neutral-400'}`}>
                    {step.label}
                  </span>
                  {step.date && <span className="text-xs text-neutral-400 ml-auto">{step.date}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white"
              onClick={() => navigate('shop')}
            >
              Continue Shopping
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('orders')}
            >
              View All Orders
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
