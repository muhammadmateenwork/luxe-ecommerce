'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, CreditCard, Truck, MapPin, ClipboardList } from 'lucide-react';
import { useRouterStore } from '@/stores/useRouterStore';
import { useCartStore } from '@/stores/useCartStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface ShippingAddress {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

const steps = [
  { id: 1, label: 'Shipping', icon: MapPin },
  { id: 2, label: 'Billing', icon: CreditCard },
  { id: 3, label: 'Summary', icon: ClipboardList },
  { id: 4, label: 'Confirm', icon: Check },
];

const emptyAddress: ShippingAddress = {
  firstName: '', lastName: '', street: '', city: '', state: '',
  zipCode: '', country: 'US', phone: '',
};

export default function CheckoutPage() {
  const { navigate } = useRouterStore();
  const { items, getTotal, getItemCount, fetchCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(emptyAddress);
  const [billingAddress, setBillingAddress] = useState<ShippingAddress>(emptyAddress);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [shippingMethod, setShippingMethod] = useState<string>('standard');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [deliveryMethods, setDeliveryMethods] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDeliveryMethods() {
      try {
        const res = await fetch(apiUrl('/api/delivery-methods'), { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setDeliveryMethods(data.data);
          setShippingMethod(data.data[0].id);
        }
      } catch {
        // fall back to default
      }
    }
    fetchDeliveryMethods();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  const subtotal = getTotal();
  const selectedDelivery = deliveryMethods.find((m: any) => m.id === shippingMethod);
  const shippingCost = selectedDelivery
    ? (selectedDelivery.freeOverAmount && subtotal >= selectedDelivery.freeOverAmount ? 0 : selectedDelivery.price)
    : (subtotal > 100 ? 0 : 9.99);
  const total = subtotal + shippingCost - discount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await fetch(apiUrl('/api/coupons/validate'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code: couponCode }),
      });
      const data = await res.json();
      if (data.success) {
        const coupon = data.data;
        let disc = 0;
        if (coupon.discountType === 'percentage') {
          disc = subtotal * (coupon.discount / 100);
          if (coupon.maxDiscount && disc > coupon.maxDiscount) disc = coupon.maxDiscount;
        } else {
          disc = coupon.discount;
        }
        setDiscount(disc);
        toast.success(`Coupon applied! You save $${disc.toFixed(2)}`);
      } else {
        toast.error(data.error || 'Invalid coupon code');
      }
    } catch {
      toast.error('Failed to validate coupon');
    }
  };

  const validateShipping = () => {
    const { firstName, lastName, street, city, state, zipCode, country } = shippingAddress;
    return firstName && lastName && street && city && state && zipCode && country;
  };

  const validateBilling = () => {
    if (sameAsShipping) return true;
    const { firstName, lastName, street, city, state, zipCode, country } = billingAddress;
    return firstName && lastName && street && city && state && zipCode && country;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateShipping()) {
      toast.error('Please fill in all shipping fields');
      return;
    }
    if (currentStep === 2 && !validateBilling()) {
      toast.error('Please fill in all billing fields');
      return;
    }
    setCurrentStep(Math.min(4, currentStep + 1));
  };

  const handlePlaceOrder = async () => {
    setPlacingOrder(true);
    try {
      const orderItems = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        size: item.size || undefined,
        color: item.color || undefined,
      }));

      const res = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          shippingAddress,
          billingAddress: sameAsShipping ? null : billingAddress,
          paymentMethod,
          shippingMethod,
          couponCode: couponCode || undefined,
          items: orderItems,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Order placed successfully!');
        navigate('order-confirmation', { id: data.data.id });
      } else {
        toast.error(data.error || 'Failed to place order');
      }
    } catch {
      toast.error('Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-serif text-neutral-900 mb-4">Please sign in to checkout</h2>
        <Button className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => navigate('auth', { mode: 'login' })}>
          Sign In
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-serif text-neutral-900 mb-4">Your cart is empty</h2>
        <Button className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => navigate('shop')}>
          Start Shopping
        </Button>
      </div>
    );
  }

  const AddressForm = ({
    address,
    onChange,
    prefix,
  }: {
    address: ShippingAddress;
    onChange: (field: keyof ShippingAddress, value: string) => void;
    prefix: string;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor={`${prefix}-firstName`}>First Name</Label>
        <Input
          id={`${prefix}-firstName`}
          value={address.firstName}
          onChange={(e) => onChange('firstName', e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`${prefix}-lastName`}>Last Name</Label>
        <Input
          id={`${prefix}-lastName`}
          value={address.lastName}
          onChange={(e) => onChange('lastName', e.target.value)}
          className="mt-1"
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor={`${prefix}-street`}>Street Address</Label>
        <Input
          id={`${prefix}-street`}
          value={address.street}
          onChange={(e) => onChange('street', e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`${prefix}-city`}>City</Label>
        <Input
          id={`${prefix}-city`}
          value={address.city}
          onChange={(e) => onChange('city', e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`${prefix}-state`}>State</Label>
        <Input
          id={`${prefix}-state`}
          value={address.state}
          onChange={(e) => onChange('state', e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`${prefix}-zipCode`}>ZIP Code</Label>
        <Input
          id={`${prefix}-zipCode`}
          value={address.zipCode}
          onChange={(e) => onChange('zipCode', e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`${prefix}-country`}>Country</Label>
        <Input
          id={`${prefix}-country`}
          value={address.country}
          onChange={(e) => onChange('country', e.target.value)}
          className="mt-1"
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor={`${prefix}-phone`}>Phone</Label>
        <Input
          id={`${prefix}-phone`}
          value={address.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          className="mt-1"
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-serif text-neutral-900 mb-8">Checkout</h1>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-10">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  currentStep > step.id
                    ? 'bg-emerald-500 text-white'
                    : currentStep === step.id
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
              </div>
              <span className={`text-xs mt-1 ${
                currentStep >= step.id ? 'text-neutral-900 font-medium' : 'text-neutral-400'
              }`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                currentStep > step.id ? 'bg-emerald-500' : 'bg-neutral-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {/* Step 1: Shipping */}
            {currentStep === 1 && (
              <motion.div
                key="shipping"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-serif text-neutral-900">Shipping Information</h2>
                <AddressForm
                  address={shippingAddress}
                  onChange={(field, value) => setShippingAddress(prev => ({ ...prev, [field]: value }))}
                  prefix="shipping"
                />
              </motion.div>
            )}

            {/* Step 2: Billing */}
            {currentStep === 2 && (
              <motion.div
                key="billing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-serif text-neutral-900">Billing Information</h2>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sameAsShipping"
                    checked={sameAsShipping}
                    onCheckedChange={(checked) => setSameAsShipping(checked === true)}
                  />
                  <Label htmlFor="sameAsShipping" className="text-sm">Same as shipping address</Label>
                </div>
                {!sameAsShipping && (
                  <AddressForm
                    address={billingAddress}
                    onChange={(field, value) => setBillingAddress(prev => ({ ...prev, [field]: value }))}
                    prefix="billing"
                  />
                )}
              </motion.div>
            )}

            {/* Step 3: Summary */}
            {currentStep === 3 && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-serif text-neutral-900">Order Summary</h2>

                {/* Items */}
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-3 p-3 bg-neutral-50 rounded-lg">
                      <div className="w-16 h-16 rounded overflow-hidden bg-neutral-100 flex-shrink-0">
                        <img src={item.product.images?.[0] || '/placeholder.jpg'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">{item.product.name}</p>
                        <p className="text-xs text-neutral-500">
                          {item.size && `Size: ${item.size}`} {item.color && `• Color: ${item.color}`}
                        </p>
                        <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-neutral-900">
                        ${((item.product.salePrice ?? item.product.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Shipping Method */}
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 mb-3">Shipping Method</h3>
                  {deliveryMethods.length > 0 ? (
                    <RadioGroup value={shippingMethod} onValueChange={setShippingMethod} className="space-y-2">
                      {deliveryMethods.map((method: any) => {
                        const methodCost = method.freeOverAmount && subtotal >= method.freeOverAmount ? 0 : method.price;
                        return (
                          <div key={method.id} className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                            shippingMethod === method.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value={method.id} id={`shipping-${method.id}`} />
                              <Label htmlFor={`shipping-${method.id}`} className="flex items-center gap-2 cursor-pointer">
                                <Truck className="w-4 h-4 text-neutral-400" />
                                {method.name}
                                {method.estimatedDays && <span className="text-xs text-neutral-500">({method.estimatedDays})</span>}
                              </Label>
                            </div>
                            <span className="text-sm font-medium">
                              {methodCost === 0 ? 'Free' : `$${methodCost.toFixed(2)}`}
                            </span>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  ) : (
                    <RadioGroup value={shippingMethod} onValueChange={(val) => setShippingMethod(val as 'standard' | 'express' | 'international')} className="space-y-2">
                      <div className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                        shippingMethod === 'standard' ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="standard" id="shipping-standard" />
                          <Label htmlFor="shipping-standard" className="flex items-center gap-2 cursor-pointer">
                            <Truck className="w-4 h-4 text-neutral-400" />
                            Standard Shipping
                            <span className="text-xs text-neutral-500">(3-5 business days)</span>
                          </Label>
                        </div>
                        <span className="text-sm font-medium">
                          {subtotal > 100 ? 'Free' : '$9.99'}
                        </span>
                      </div>
                    </RadioGroup>
                  )}
                  {selectedDelivery?.freeOverAmount && subtotal < selectedDelivery.freeOverAmount && (
                    <p className="text-xs text-neutral-400 mt-2">
                      Add ${(selectedDelivery.freeOverAmount - subtotal).toFixed(2)} more for free shipping
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 mb-3">Payment Method</h3>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="cod" id="cod" />
                        <Label htmlFor="cod" className="cursor-pointer">Cash on Delivery</Label>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg opacity-60">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="card" id="card" disabled />
                        <Label htmlFor="card" className="cursor-pointer">
                          <span className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" /> Credit Card (Coming Soon)
                          </span>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Coupon */}
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 mb-3">Coupon Code</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="text-sm"
                    />
                    <Button variant="outline" onClick={handleApplyCoupon} disabled={!couponCode.trim()}>
                      Apply
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirm */}
            {currentStep === 4 && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-serif text-neutral-900">Review & Confirm</h2>

                <div className="space-y-4">
                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-neutral-900 mb-2">Shipping Address</h3>
                    <p className="text-sm text-neutral-600">
                      {shippingAddress.firstName} {shippingAddress.lastName}<br />
                      {shippingAddress.street}<br />
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}<br />
                      {shippingAddress.country}
                      {shippingAddress.phone && <><br />{shippingAddress.phone}</>}
                    </p>
                  </div>

                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-neutral-900 mb-2">Billing Address</h3>
                    {sameAsShipping ? (
                      <p className="text-sm text-neutral-600">Same as shipping</p>
                    ) : (
                      <p className="text-sm text-neutral-600">
                        {billingAddress.firstName} {billingAddress.lastName}<br />
                        {billingAddress.street}<br />
                        {billingAddress.city}, {billingAddress.state} {billingAddress.zipCode}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-neutral-900 mb-2">Payment</h3>
                    <p className="text-sm text-neutral-600">
                      {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Credit Card'}
                    </p>
                  </div>

                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-neutral-900 mb-2">Shipping Method</h3>
                    <p className="text-sm text-neutral-600">
                      {selectedDelivery ? `${selectedDelivery.name}${selectedDelivery.estimatedDays ? ` (${selectedDelivery.estimatedDays})` : ''}` : 'Standard Shipping'}
                      {' — '}
                      <span className="font-medium">{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
                    </p>
                  </div>

                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-neutral-900 mb-2">
                      Items ({getItemCount()})
                    </h3>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-neutral-600">
                            {item.product.name} × {item.quantity}
                            {item.size && ` (${item.size})`}
                          </span>
                          <span className="text-neutral-900">
                            ${((item.product.salePrice ?? item.product.price) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {currentStep > 1 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                Back
              </Button>
            )}
            <div className="ml-auto">
              {currentStep < 4 ? (
                <Button className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={handleNext}>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder}
                >
                  {placingOrder ? 'Placing Order...' : 'Place Order'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-1">
          <div className="bg-neutral-50 rounded-lg p-6 sticky top-4">
            <h3 className="text-lg font-serif text-neutral-900 mb-4">Order Total</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Shipping</span>
                <span>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span className="text-neutral-900">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
