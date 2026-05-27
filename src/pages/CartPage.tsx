import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import MapPicker from '../components/MapPicker';
import { 
  ShoppingBag, Trash2, ShieldCheck, CreditCard, ArrowRight, Loader2, MapPin,
  CheckCircle, Smartphone, Banknote, Package, X, Plus, Minus, ChevronRight,
  User, Phone, Home, Building, Ticket, Tag
} from 'lucide-react';

interface CartPageProps {
  onNavigateTo: (page: string) => void;
}

interface Address {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  contactNumber?: string;
  altContactNumber?: string;
  addressLine: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

type CheckoutStep = 'address' | 'coupon' | 'invoice' | 'payment' | 'receipt';
type PaymentMethod = 'debit' | 'credit' | 'upi' | 'cod';

export default function CartPage({ onNavigateTo }: CartPageProps) {
  const { cart, wishlist, removeFromCart, updateCartQuantity, addToCart, removeFromWishlist, clearCart } = useCart();
  const { token, user } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState<CheckoutStep>('address');

  // Address states
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [addrFullName, setAddrFullName] = useState(user?.name || '');
  const [addrPhone, setAddrPhone] = useState(user?.phone || '');
  const [contactNumber, setContactNumber] = useState('');
  const [altContactNumber, setAltContactNumber] = useState('');
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrLine, setAddrLine] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrLatitude, setAddrLatitude] = useState(11.0168);
  const [addrLongitude, setAddrLongitude] = useState(76.9558);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('debit');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [upiId, setUpiId] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  // Coupon
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);

  const [totalShippingFee, setTotalShippingFee] = useState(0);
  const [vendorShippingFees, setVendorShippingFees] = useState<any[]>([]);

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const hasMatchingCategory = appliedCoupon ? cart.some(item => item.category === appliedCoupon.categorySlug) : false;
  const finalDiscount = hasMatchingCategory ? (cartSubtotal * appliedCoupon.discountAmount / 100) : 0;
  
  const grandTotal = Math.max(0, cartSubtotal - finalDiscount) + totalShippingFee;

  const fallbackAddress: Address = {
    label: 'Home',
    fullName: user?.name || 'Customer',
    phone: user?.phone || '9876543210',
    addressLine: 'Main Bazaar Road',
    city: 'Coimbatore',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641001',
    latitude: 11.0168,
    longitude: 76.9558
  };

  const fetchSavedAddresses = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/customer/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.addresses && data.addresses.length > 0) {
          setAddresses(data.addresses);
        } else {
          setAddresses([fallbackAddress]);
        }
      } else {
        setAddresses([fallbackAddress]);
      }
    } catch (e) {
      setAddresses([fallbackAddress]);
    }
  };

  useEffect(() => {
    fetchSavedAddresses();
    if (user) {
      setAddrFullName(user.name || '');
      setAddrPhone(user.phone || '');
    }
  }, [token]);

  useEffect(() => {
    if (step === 'coupon') {
      const loadCoupons = async () => {
        setLoadingCoupons(true);
        try {
          const res = await fetch('/api/coupons');
          if (res.ok) {
            const data = await res.json();
            setAvailableCoupons(data.coupons || []);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingCoupons(false);
        }
      };
      loadCoupons();
    }
  }, [step]);

  useEffect(() => {
    if (step === 'invoice') {
      const fetchShipping = async () => {
        try {
          const chosenAddress = addresses[selectedAddressIndex] || fallbackAddress;
          const res = await fetch('/api/shipping/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify({
              items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
              deliveryAddress: chosenAddress
            })
          });
          if (res.ok) {
            const data = await res.json();
            setTotalShippingFee(data.totalShippingFee || 0);
            setVendorShippingFees(data.vendorFees || []);
          }
        } catch (e) {
          console.error('Failed to calculate shipping', e);
        }
      };
      fetchShipping();
    }
  }, [step, cart, selectedAddressIndex, addresses, token]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrLine.trim()) return;
    setLoading(true);
    try {
      const newAddr: Address = {
        label: addrLabel || 'Home',
        fullName: addrFullName,
        phone: addrPhone,
        contactNumber,
        altContactNumber,
        addressLine: addrLine,
        city: addrCity,
        district: addrDistrict,
        state: addrState,
        pincode: addrPincode,
        latitude: addrLatitude,
        longitude: addrLongitude
      };

      if (token) {
        const res = await fetch('/api/customer/addresses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newAddr)
        });
        if (res.ok) await fetchSavedAddresses();
      } else {
        setAddresses(prev => [newAddr, ...prev]);
      }

      setShowNewAddressForm(false);
      setSelectedAddressIndex(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMapLocationSelected = (location: any) => {
    setAddrLine(location.address || '');
    setAddrCity(location.city || '');
    setAddrDistrict(location.district || '');
    setAddrState(location.state || '');
    setAddrPincode(location.pincode || '');
    setAddrLatitude(location.latitude);
    setAddrLongitude(location.longitude);
  };

  const validatePayment = (): string | null => {
    if (paymentMethod === 'debit' || paymentMethod === 'credit') {
      if (cardNumber.replace(/\s/g, '').length < 12) return 'Please enter a valid card number.';
      if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) return 'Enter card expiry as MM/YY.';
      if (cardCVV.length < 3) return 'CVV must be 3 digits.';
      if (!cardName.trim()) return 'Enter the cardholder name.';
    } else if (paymentMethod === 'upi') {
      if (!upiId.includes('@')) return 'Please enter a valid UPI ID containing @.';
    }
    return null;
  };

  const isPaymentValid = () => {
    if (paymentMethod === 'upi') return upiId.includes('@');
    if (paymentMethod === 'debit' || paymentMethod === 'credit') {
      return cardNumber.replace(/\s/g, '').length >= 12 &&
             /^\d{2}\/\d{2}$/.test(cardExpiry) &&
             cardCVV.length >= 3 &&
             cardName.trim().length > 0;
    }
    return true;
  };

  const handleCreateOrder = async () => {
    const validationErr = validatePayment();
    if (validationErr && paymentMethod !== 'cod') {
      alert(validationErr);
      return;
    }

    if (!token) {
      alert('Please log in to place an order.');
      onNavigateTo('auth');
      return;
    }

    setPaymentProcessing(true);
    // Simulate payment processing delay for card/upi
    if (paymentMethod !== 'cod') {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setLoading(true);
    const chosenAddress = addresses[selectedAddressIndex] || fallbackAddress;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
          deliveryAddress: chosenAddress,
          paymentMethod,
          totalAmount: grandTotal,
          appliedCouponId: appliedCoupon ? appliedCoupon.id : null,
          paymentDetails: (paymentMethod === 'debit' || paymentMethod === 'credit') 
            ? { cardLast4: cardNumber.slice(-4), cardName } 
            : (paymentMethod === 'upi') ? { upiId } : {}
        })
      });

      if (res.ok) {
        const data = await res.json();
        const totalPaid = data.orders?.reduce((sum: number, o: any) => sum + o.totalAmount, 0) || grandTotal;
        setSuccessOrder({ 
          ...(data.order || data.orders?.[0] || { id: 'OB-' + Date.now() }),
          totalAmount: totalPaid
        });
        clearCart();
        setStep('receipt');
      } else {
        const err = await res.json();
        alert(`Order failed: ${err.error || 'Please try again.'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setPaymentProcessing(false);
    }
  };

  const handleAddWishlistToCart = (item: any) => {
    addToCart(item.id, 1);
    removeFromWishlist(item.id);
  };

  // Step indicator
  const steps = [
    { key: 'address', label: 'Address', num: 1 },
    { key: 'coupon', label: 'Offers', num: 2 },
    { key: 'invoice', label: 'Invoice', num: 3 },
    { key: 'payment', label: 'Payment', num: 4 },
  ];

  const stepIndex = steps.findIndex(s => s.key === step);

  const StepIndicator = () => (
    <div className="bg-white p-4 rounded-2xl border border-gray-150/80 shadow-xs mb-6">
      <div className="flex justify-between items-center max-w-lg mx-auto relative pt-1">
        <div className="absolute left-[10%] right-[10%] top-[35%] h-0.5 bg-gray-200 -z-1" />
        <div
          className="absolute left-[10%] top-[35%] h-0.5 bg-violet-600 transition-all duration-500 -z-1"
          style={{ width: `${Math.max(0, (stepIndex / (steps.length - 1)) * 80)}%` }}
        />
        {steps.map((s, i) => (
          <button
            type="button"
            key={s.key}
            onClick={() => { if (i < stepIndex) setStep(s.key as CheckoutStep); }}
            className="flex flex-col items-center gap-1.5 focus:outline-none"
          >
            <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
              i < stepIndex ? 'bg-violet-100 text-violet-700' :
              i === stepIndex ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i < stepIndex ? '✓' : s.num}
            </div>
            <span className={`text-[10px] uppercase font-bold ${i <= stepIndex ? 'text-gray-600' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  // Receipt Page
  if (step === 'receipt' && successOrder) {
    const chosenAddress = addresses[selectedAddressIndex] || fallbackAddress;
    const payLabel = { debit: 'Debit Card', credit: 'Credit Card', upi: 'UPI', cod: 'Cash on Delivery' }[paymentMethod];

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl text-center space-y-6">
          <div className="flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Order Confirmed!</h2>
            <p className="text-gray-500 mt-2 text-sm">Thank you for shopping at OmniBazaar. Your payment was processed successfully.</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3 border text-xs font-mono">
            <div className="grid grid-cols-2 gap-4 pb-3 border-b">
              <div>
                <p className="text-gray-400 uppercase text-[10px] font-bold tracking-wider mb-1">Order ID</p>
                <p className="font-bold text-indigo-700">{successOrder.id}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase text-[10px] font-bold tracking-wider mb-1">Payment Method</p>
                <p className="font-bold text-gray-800">{payLabel}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase text-[10px] font-bold tracking-wider mb-1">Payment Status</p>
                <p className={`font-bold ${paymentMethod === 'cod' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {paymentMethod === 'cod' ? 'Pay on Delivery' : 'Paid ✓'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 uppercase text-[10px] font-bold tracking-wider mb-1">Est. Delivery</p>
                <p className="font-bold text-gray-800">3–5 Business Days</p>
              </div>
            </div>

            <div>
              <p className="text-gray-400 uppercase text-[10px] font-bold tracking-wider mb-1">Shipping To</p>
              <p className="font-sans font-bold text-gray-800">{chosenAddress.fullName}</p>
              <p className="text-gray-500">{chosenAddress.addressLine}, {chosenAddress.city ? `${chosenAddress.city}, ` : ''}{chosenAddress.district}, {chosenAddress.state} – {chosenAddress.pincode}</p>
            </div>

            <div className="flex justify-between items-center bg-white p-3 rounded-xl border mt-2">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Paid</p>
                <p className="text-xl font-black text-gray-900">₹{(successOrder.totalAmount || grandTotal).toLocaleString('en-IN')}</p>
              </div>
              {successOrder.shippingQrCode && (
                <img src={successOrder.shippingQrCode} alt="tracking QR" className="h-16 w-16 border p-0.5 rounded-lg" />
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setSuccessOrder(null); setStep('address'); onNavigateTo('home'); }}
              className="cursor-pointer flex-1 bg-gray-100 font-bold border hover:bg-gray-150 rounded-xl py-3 text-gray-700 text-xs transition-all"
            >
              Continue Shopping
            </button>
            <button
              type="button"
              onClick={() => { setSuccessOrder(null); setStep('address'); onNavigateTo('dashboard'); }}
              className="cursor-pointer flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl py-3 text-xs transition-all shadow-md"
            >
              Track in Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {cart.length === 0 ? (
        <div className="space-y-8">
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4 max-w-lg mx-auto">
            <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto" />
            <div>
              <h3 className="font-bold text-gray-800">Your cart is empty</h3>
              <p className="text-xs text-gray-500 mt-1">Add products from the shop to get started.</p>
            </div>
            <button type="button" onClick={() => onNavigateTo('shop')} className="cursor-pointer bg-violet-600 hover:bg-violet-700 transition-colors text-white font-bold py-2 px-5 text-xs rounded-xl">
              Browse Shop
            </button>
          </div>

        </div>
      ) : (
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Main Column */}
        <div className="lg:w-2/3 space-y-6">
          
          <StepIndicator />



          {/* STEP 2: Address Selection */}
          {step === 'address' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-violet-600" />
                  Delivery Address
                </h2>
                {!showNewAddressForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewAddressForm(true)}
                    className="cursor-pointer text-xs font-bold text-violet-700 hover:text-violet-900 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add New Address
                  </button>
                )}
              </div>

              {showNewAddressForm ? (
                <form onSubmit={handleSaveAddress} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-xs text-xs">
                  <h3 className="font-bold text-sm text-gray-800">Add New Address</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input required value={addrFullName} onChange={e => setAddrFullName(e.target.value)} placeholder="Full name"
                          className="w-full bg-gray-50 pl-8 pr-3 py-2 rounded-xl border outline-none focus:border-violet-500 text-xs" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">Phone *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input required value={addrPhone} onChange={e => setAddrPhone(e.target.value)} placeholder="Phone number"
                          className="w-full bg-gray-50 pl-8 pr-3 py-2 rounded-xl border outline-none focus:border-violet-500 text-xs" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {['Home', 'Work', 'Other'].map(l => (
                      <button key={l} type="button" onClick={() => setAddrLabel(l)}
                        className={`py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${addrLabel === l ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                        {l === 'Home' && '🏠 '}{l === 'Work' && '🏢 '}{l === 'Other' && '📍 '}{l}
                      </button>
                    ))}
                  </div>

                  <MapPicker onLocationSelected={handleMapLocationSelected} />

                  <div>
                    <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">Address / Street *</label>
                    <textarea required rows={2} value={addrLine} onChange={e => setAddrLine(e.target.value)}
                      placeholder="House no., street name, area..."
                      className="w-full bg-gray-50 px-3 py-2 rounded-xl border outline-none focus:border-violet-500 text-xs" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">City *</label>
                      <input required value={addrCity} onChange={e => setAddrCity(e.target.value)} placeholder="City"
                        className="w-full bg-gray-50 px-3 py-2 rounded-xl border outline-none focus:border-violet-500 text-xs" />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">District *</label>
                      <input required value={addrDistrict} onChange={e => setAddrDistrict(e.target.value)} placeholder="District"
                        className="w-full bg-gray-50 px-3 py-2 rounded-xl border outline-none focus:border-violet-500 text-xs" />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">State *</label>
                      <input required value={addrState} onChange={e => setAddrState(e.target.value)} placeholder="State"
                        className="w-full bg-gray-50 px-3 py-2 rounded-xl border outline-none focus:border-violet-500 text-xs" />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">PIN Code *</label>
                      <input required value={addrPincode} onChange={e => setAddrPincode(e.target.value)} placeholder="600001"
                        className="w-full bg-gray-50 px-3 py-2 rounded-xl border outline-none focus:border-violet-500 font-mono text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">Contact Number</label>
                      <input value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="Contact Number"
                        className="w-full bg-gray-50 px-3 py-2 rounded-xl border outline-none focus:border-violet-500 text-xs" />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">Alt Contact Number</label>
                      <input value={altContactNumber} onChange={e => setAltContactNumber(e.target.value)} placeholder="Alt Contact Number"
                        className="w-full bg-gray-50 px-3 py-2 rounded-xl border outline-none focus:border-violet-500 text-xs" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowNewAddressForm(false)}
                      className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200">
                      Cancel
                    </button>
                    <button type="submit" disabled={loading}
                      className="cursor-pointer flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 rounded-xl text-xs">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Save Address'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedAddressIndex(index)}
                      className={`cursor-pointer p-4 bg-white border rounded-2xl transition-all shadow-xs space-y-2 ${
                        selectedAddressIndex === index ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedAddressIndex === index ? 'border-violet-600 bg-violet-600' : 'border-gray-300'}`}>
                            {selectedAddressIndex === index && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>
                          <span className="font-bold text-xs text-gray-800">{addr.label || 'Home'}</span>
                          <span className="text-[9px] bg-gray-100 text-gray-500 font-mono px-1.5 py-0.5 rounded">{addr.fullName || addr.label}</span>
                        </div>
                        {selectedAddressIndex === index && (
                          <span className="text-[9px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">DEFAULT</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 pl-7">{addr.addressLine}</p>
                      <p className="text-[10px] text-gray-400 font-mono pl-7">{addr.city ? `${addr.city}, ` : ''}{addr.district}, {addr.state} – {addr.pincode}</p>
                      {addr.phone && <p className="text-[10px] text-gray-400 pl-7">📞 {addr.phone}</p>}
                    </div>
                  ))}

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => onNavigateTo('shop')} className="cursor-pointer px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200">
                      ← Keep Shopping
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('coupon')}
                      className="cursor-pointer flex-1 bg-violet-600 hover:bg-violet-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md"
                    >
                      Continue to Offers <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Coupons & Offers */}
          {step === 'coupon' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-violet-600" />
                Available Offers
              </h2>
              
              <div className="bg-white p-5 rounded-2xl border border-gray-150/80 shadow-xs space-y-4">
                <p className="text-xs text-gray-500 mb-4">We've found the following offers based on the items in your cart. Apply one to get a discount on your order.</p>
                
                {loadingCoupons ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-600 mb-2" />
                    <span className="text-xs text-gray-500 font-bold tracking-wide">Searching for best offers...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      // Find applicable coupons (where at least one cart item matches the coupon category)
                      const applicableCoupons = availableCoupons.filter(c => 
                        cart.some(item => item.category === c.categorySlug)
                      );

                      if (applicableCoupons.length === 0) {
                        return (
                          <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                            <Tag className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                            <p className="text-xs font-bold text-gray-600">No offers available for this order</p>
                          </div>
                        );
                      }

                      return applicableCoupons.map((c: any) => {
                        const isApplied = appliedCoupon?.id === c.id;
                        return (
                          <div key={c.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isApplied ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200 hover:border-violet-300 shadow-xs'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${isApplied ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'}`}>
                                {isApplied ? <CheckCircle className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-gray-900">{c.title}</h4>
                                <p className="text-xs text-gray-500 font-medium">Save {c.discountAmount}% on matching items.</p>
                              </div>
                            </div>
                            
                            {isApplied ? (
                              <button type="button" onClick={() => setAppliedCoupon(null)} className="cursor-pointer px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-lg text-xs transition-colors">
                                Remove
                              </button>
                            ) : (
                              <button type="button" onClick={() => setAppliedCoupon(c)} className="cursor-pointer px-4 py-2 bg-violet-600 text-white hover:bg-violet-700 font-bold rounded-lg text-xs transition-colors shadow-sm">
                                Apply Coupon
                              </button>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('address')} className="cursor-pointer px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200">
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep('invoice')}
                  className="cursor-pointer flex-1 bg-violet-600 hover:bg-violet-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md"
                >
                  Review Order <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Invoice Preview */}
          {step === 'invoice' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-violet-600" />
                Order Invoice Preview
              </h2>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-xs">
                {/* Invoice header */}
                <div className="flex justify-between items-start pb-4 border-b">
                  <div>
                    <h3 className="font-black text-lg text-gray-900">OmniBazaar</h3>
                    <p className="text-xs text-gray-400 font-mono">Invoice Preview</p>
                  </div>
                  <div className="text-right text-xs text-gray-400 font-mono">
                    <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                    <p>INV-{Date.now().toString().slice(-6)}</p>
                  </div>
                </div>

                {/* Ship to */}
                {(() => {
                  const addr = addresses[selectedAddressIndex] || fallbackAddress;
                  return (
                    <div className="pb-4 border-b">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ship To</p>
                      <p className="text-sm font-bold text-gray-800">{addr.fullName}</p>
                      <p className="text-xs text-gray-600">{addr.addressLine}</p>
                      <p className="text-xs text-gray-500">{addr.city ? `${addr.city}, ` : ''}{addr.district}, {addr.state} – {addr.pincode}</p>
                      {addr.phone && <p className="text-xs text-gray-500 mt-1">📞 {addr.phone}</p>}
                    </div>
                  );
                })()}

                {/* Items table */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Order Items</p>
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <img src={item.imageUrl} alt={item.name} className="h-12 w-12 rounded-lg object-cover border bg-white" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-gray-400">₹{item.price.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center bg-white rounded-lg border overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="cursor-pointer w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-[10px] font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className="cursor-pointer w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-sm font-black text-gray-800 w-16 text-right">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                          <button type="button" onClick={() => removeFromCart(item.id)} className="cursor-pointer text-gray-400 hover:text-red-500 transition-colors p-1">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="pt-4 border-t space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {finalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount ({appliedCoupon?.title})</span>
                      <span>-₹{finalDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {vendorShippingFees.map((vf: any) => (
                    <div key={vf.vendorId} className="flex justify-between text-gray-500">
                      <span>Shipping ({vf.storeName})</span>
                      <span>+₹{vf.fee.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-base font-black text-gray-900 border-t pt-2 mt-2">
                    <span>Grand Total</span>
                    <span className="text-violet-700">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('coupon')} className="cursor-pointer px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200">
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep('payment')}
                  className="cursor-pointer flex-1 bg-violet-600 hover:bg-violet-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md"
                >
                  Proceed to Payment <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Payment */}
          {step === 'payment' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-violet-600" />
                Select Payment Method
              </h2>

              {/* Payment Method Cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'debit' as PaymentMethod, label: 'Debit Card', icon: '💳', desc: 'Secure debit payment' },
                  { key: 'credit' as PaymentMethod, label: 'Credit Card', icon: '💳', desc: 'Secure credit payment' },
                  { key: 'upi' as PaymentMethod, label: 'UPI', icon: '📱', desc: 'Google Pay, PhonePe, Paytm' },
                  { key: 'cod' as PaymentMethod, label: 'Cash on Delivery', icon: '💵', desc: 'Pay when you receive' },
                ].map(pm => (
                  <button
                    type="button"
                    key={pm.key}
                    onClick={() => setPaymentMethod(pm.key)}
                    className={`cursor-pointer p-4 rounded-2xl border-2 text-left transition-all ${
                      paymentMethod === pm.key
                        ? 'border-violet-600 bg-violet-50 shadow-md shadow-violet-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{pm.icon}</div>
                    <p className={`text-xs font-black ${paymentMethod === pm.key ? 'text-violet-800' : 'text-gray-800'}`}>{pm.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{pm.desc}</p>
                  </button>
                ))}
              </div>

              {/* Debit / Credit Card Form */}
              {(paymentMethod === 'debit' || paymentMethod === 'credit') && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-xs">
                  {/* Card Visual */}
                  <div className="max-w-xs h-44 bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-900 rounded-2xl p-5 text-white flex flex-col justify-between relative overflow-hidden font-mono select-none">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded border border-white/20">
                        {paymentMethod === 'debit' ? 'DEBIT' : 'CREDIT'}
                      </span>
                      <span className="text-xl font-black italic">VISA</span>
                    </div>
                    <div className="text-center text-sm tracking-widest font-bold text-white/90">
                      {cardNumber ? cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ') : '•••• •••• •••• ••••'}
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[8px] uppercase text-white/40 tracking-widest">CARDHOLDER</p>
                        <p className="text-xs font-bold truncate max-w-[140px]">{cardName.toUpperCase() || 'YOUR NAME'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase text-white/40 tracking-widest">EXPIRES</p>
                        <p className="text-xs font-bold">{cardExpiry || 'MM/YY'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">Card Number *</label>
                      <input
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        placeholder="1234 5678 9012 3456"
                        className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border outline-none focus:border-violet-500 font-mono tracking-wider"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">Name on Card *</label>
                      <input
                        value={cardName}
                        onChange={e => setCardName(e.target.value)}
                        placeholder="Cardholder Name"
                        className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border outline-none focus:border-violet-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">Expiry Date *</label>
                        <input
                          value={cardExpiry}
                          onChange={e => {
                            let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                            if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                            setCardExpiry(v);
                          }}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border outline-none focus:border-violet-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">CVV *</label>
                        <input
                          type="password"
                          value={cardCVV}
                          onChange={e => setCardCVV(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          placeholder="•••"
                          maxLength={3}
                          className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border outline-none focus:border-violet-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* UPI Form */}
              {paymentMethod === 'upi' && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div>
                    <label className="block font-bold text-gray-600 uppercase text-[10px] tracking-wider mb-1">UPI ID *</label>
                    <input
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      placeholder="yourname@upi"
                      className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              )}

              {/* COD */}
              {paymentMethod === 'cod' && (
                <div className="bg-emerald-50/50 border-2 border-emerald-500/20 rounded-2xl p-6 flex items-start gap-5 shadow-xs transition-all">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200 shadow-inner">
                    <Banknote className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="text-xs space-y-1.5">
                    <p className="font-black text-emerald-900 text-base tracking-tight">Cash on Delivery</p>
                    <p className="text-emerald-700 leading-relaxed text-sm">
                      You will pay <span className="font-black text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded-md">₹{grandTotal.toLocaleString('en-IN')}</span> in cash when your order is delivered.
                    </p>
                    <div className="flex gap-4 pt-2 border-t border-emerald-200/50">
                      <p className="text-emerald-700 font-medium text-[10px] flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> No online payment
                      </p>
                      <p className="text-emerald-700 font-medium text-[10px] flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Secure handover
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('invoice')} className="cursor-pointer px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200">
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={loading || paymentProcessing || cart.length === 0 || !isPaymentValid()}
                  onClick={handleCreateOrder}
                  className="cursor-pointer flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md transition-all"
                >
                  {paymentProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing Payment...
                    </>
                  ) : loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {paymentMethod === 'cod' ? '📦 Place Order (Pay on Delivery)' : `✓ Pay ₹${grandTotal.toLocaleString('en-IN')}`}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Summary */}
        <div className="lg:w-1/3 space-y-4 font-sans text-xs">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4 sticky top-24">
            <h4 className="font-extrabold font-display text-gray-800 text-sm tracking-tight">Order Summary</h4>

            {/* Item thumbnails */}
            {cart.length > 0 && (
              <div className="space-y-2 pb-4 border-b">
                {cart.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <img src={item.imageUrl} alt={item.name} className="h-8 w-8 rounded-lg object-cover border" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-gray-700">{item.name}</p>
                      <p className="text-[10px] text-gray-400">Qty {item.quantity}</p>
                    </div>
                    <p className="text-xs font-bold text-gray-700">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                  </div>
                ))}
                {cart.length > 3 && <p className="text-[10px] text-gray-400 text-center">+{cart.length - 3} more items</p>}
              </div>
            )}

            <div className="space-y-2 font-mono border-b pb-4">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-between font-black text-gray-900 text-base">
              <span>Grand Total</span>
              <span className="text-violet-700">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center gap-2 pt-2 text-gray-400 text-[10px]">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>256-bit SSL secured checkout. Your data is protected.</span>
            </div>
          </div>
        </div>

      </div>
      )}
    </div>
  );
}
