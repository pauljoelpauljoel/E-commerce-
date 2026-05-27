import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, ShoppingBag, MessageSquare, Star, Shield, RefreshCw, Truck, 
  Loader2, Heart, X, Plus, Minus, ArrowRight, ShoppingCart, CheckCircle 
} from 'lucide-react';

interface ProductDetailPageProps {
  productId: string;
  onNavigateTo: (page: string) => void;
}

export default function ProductDetailPage({ productId, onNavigateTo }: ProductDetailPageProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { cart, addToCart, updateCartQuantity, removeFromCart, toggleWishlist, wishlist } = useCart();

  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc');

  const [reviews, setReviews] = useState<any[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Cart Drawer state
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
      fetchReviews();
    }
  }, [productId]);

  // Close drawer on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (cartDrawerOpen && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setCartDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [cartDrawerOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (cartDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [cartDrawerOpen]);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        const found = (data.products || []).find((p: any) => p.id === productId);
        if (found) {
          setProduct(found);
          setCurrentSlide(0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        const filtered = (data.reviews || []).filter((r: any) => r.productId === productId);
        setReviews(filtered);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getRatingDetails = () => {
    if (reviews.length === 0) return { avg: 5.0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return { avg: parseFloat((sum / reviews.length).toFixed(1)), count: reviews.length };
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          reviewerName: user?.name || 'Customer',
          reviewerEmail: user?.email || 'customer@omnibazaar.in',
          rating: newRating,
          reviewText: newReviewText
        })
      });
      if (res.ok) {
        setNewReviewText('');
        setNewRating(5);
        fetchReviews();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCartClick = () => {
    if (!product) return;
    addToCart(product.id, quantity);
    setJustAdded(true);
    setCartDrawerOpen(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const isWishlisted = () => product ? wishlist.some(w => w.id === product.id) : false;

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-600 mb-2" />
        <p className="text-xs text-gray-500 font-mono">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <p className="text-sm text-gray-500 font-mono italic">Product not found.</p>
        <button type="button" onClick={() => onNavigateTo('shop')} className="mt-4 bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">
          Back to Shop
        </button>
      </div>
    );
  }

  const { avg, count } = getRatingDetails();
 
  const isVideo = (url: string) => {
    return url && (url.startsWith('data:video/') || url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg'));
  };

  const mediaItems = [
    ...(product.images || []),
    ...(product.video ? [product.video] : [])
  ].filter(Boolean);
  
  if (mediaItems.length === 0) {
    mediaItems.push('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Cart Drawer Overlay */}
      {cartDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50]" />
      )}

      {/* Cart Drawer Panel */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-[51] flex flex-col transition-transform duration-300 ease-out ${
          cartDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-150">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-violet-600" />
            <h3 className="font-bold text-gray-900 text-base">Shopping Cart</h3>
            <span className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{cartCount}</span>
          </div>
          <button type="button"
            onClick={() => setCartDrawerOpen(false)}
            className="cursor-pointer h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Just Added Banner */}
        {justAdded && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-bold">
            <CheckCircle className="h-4 w-4" />
            {quantity} item(s) added to cart!
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <ShoppingCart className="h-10 w-10 text-gray-200 mx-auto" />
              <p className="text-sm text-gray-400 font-medium">Your cart is empty</p>
              <button type="button" onClick={() => { setCartDrawerOpen(false); onNavigateTo('shop'); }}
                className="cursor-pointer text-xs font-bold text-violet-600 hover:underline">
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 p-3 bg-gray-50/60 rounded-2xl border border-gray-150">
                <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-xl object-cover border bg-white shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-gray-800 truncate">{item.name}</h4>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.brand}</p>
                  <p className="text-sm font-black text-violet-700 mt-1">₹{item.price.toLocaleString('en-IN')}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center bg-white rounded-lg border overflow-hidden">
                      <button type="button"
                        onClick={() => updateCartQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="cursor-pointer w-7 h-7 flex items-center justify-center hover:bg-gray-50 text-gray-600 font-bold transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                      <button type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="cursor-pointer w-7 h-7 flex items-center justify-center hover:bg-gray-50 text-gray-600 font-bold transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="cursor-pointer text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-150 space-y-3 bg-white z-10">
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-gray-900">Subtotal ({cartCount} items)</span>
              <span className="text-xl font-black text-violet-700">₹{cartTotal.toLocaleString('en-IN')}</span>
            </div>
            <p className="text-[10px] text-gray-400 text-center">Shipping & taxes calculated at checkout</p>
            <button type="button"
              onClick={() => { setCartDrawerOpen(false); onNavigateTo('cart'); }}
              className="cursor-pointer w-full bg-violet-600 hover:bg-violet-700 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all"
            >
              Proceed to Checkout
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button"
              onClick={() => { setCartDrawerOpen(false); }}
              className="cursor-pointer w-full text-center text-xs font-bold text-gray-500 hover:text-gray-700 py-2"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>

      {/* Back button */}
      <div>
        <button type="button"
          onClick={() => onNavigateTo('shop')}
          className="cursor-pointer font-bold text-xs text-gray-600 hover:text-violet-600 flex items-center gap-1.5 transition-colors bg-white px-4 py-2 rounded-xl border border-gray-150 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Catalog
        </button>
      </div>

      {/* Product Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-xs">
        
        {/* Left: Image Gallery */}
        <div className="md:col-span-6 space-y-4">
          <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-150 relative group">
            {isVideo(mediaItems[currentSlide]) ? (
              <video src={mediaItems[currentSlide]} controls className="h-full w-full object-cover transition-all" autoPlay muted loop />
            ) : (
              <img src={mediaItems[currentSlide]} alt={product.name} className="h-full w-full object-cover transition-all" />
            )}
            
            {/* Arrows */}
            {mediaItems.length > 1 && (
              <>
                <button 
                  type="button"
                  onClick={() => setCurrentSlide(prev => prev === 0 ? mediaItems.length - 1 : prev - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-800 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-20 cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button 
                  type="button"
                  onClick={() => setCurrentSlide(prev => prev === mediaItems.length - 1 ? 0 : prev + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-800 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-20 cursor-pointer"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Dots */}
            {mediaItems.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {mediaItems.map((_, idx) => (
                  <button 
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 cursor-pointer rounded-full transition-all ${idx === currentSlide ? 'w-6 bg-violet-600' : 'w-2 bg-gray-300/80 hover:bg-violet-400'}`}
                  />
                ))}
              </div>
            )}

            {product.stock > 0 ? (
              <span className="absolute top-4 left-4 text-[10px] font-bold uppercase bg-emerald-500 text-white px-3 py-1 rounded-full shadow-sm z-10">
                In Stock
              </span>
            ) : (
              <span className="absolute top-4 left-4 text-[10px] font-bold uppercase bg-rose-500 text-white px-3 py-1 rounded-full shadow-sm z-10">
                Sold Out
              </span>
            )}
            <button type="button"
              onClick={() => toggleWishlist(product)}
              className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/95 shadow-md border hover:scale-105 transition-all text-gray-400 flex items-center justify-center z-10 cursor-pointer"
            >
              <Heart className={`h-5 w-5 ${isWishlisted() ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Right: Product Details */}
        <div className="md:col-span-6 space-y-6">
          <div className="space-y-2">
            <div className="flex gap-2.5 items-center text-xs font-mono">
              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                {product.category}
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-500 font-bold uppercase">Brand: {product.brand}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{product.name}</h1>
            <div className="flex items-center gap-2">
              <div className="flex text-amber-400 gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`h-4 w-4 ${s <= Math.floor(avg) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-gray-700 font-mono">({count} ratings)</span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-400 font-semibold">{product.vendorStoreName || 'OmniBazaar Store'}</span>
            </div>
          </div>

          {/* Price */}
          <div className="p-4 bg-slate-50 border border-gray-150 rounded-2xl">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Price:</span>
              <span className="text-3xl font-black text-gray-900 font-mono">₹{product.price.toLocaleString('en-IN')}</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Inclusive of all taxes. Free delivery on orders above ₹1,00,000.</p>
          </div>

          {/* Add to Cart Controls */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              {/* Quantity */}
              <div className="flex border border-gray-200 rounded-xl items-center overflow-hidden w-fit bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="cursor-pointer px-3.5 py-2.5 hover:bg-gray-50 text-gray-600 font-bold transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-5 py-2 font-bold font-mono text-sm w-12 text-center text-gray-800">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(q => q + 1)}
                  className="cursor-pointer px-3.5 py-2.5 hover:bg-gray-50 text-gray-600 font-bold transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button type="button"
                onClick={handleAddToCartClick}
                disabled={product.stock <= 0}
                className="cursor-pointer flex-1 bg-violet-600 disabled:bg-gray-200 hover:bg-violet-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <ShoppingCart className="h-4.5 w-4.5" />
                Add to Cart
              </button>
            </div>

            {/* Open Cart Drawer Button (if items in cart) */}
            {cartCount > 0 && (
              <button type="button"
                onClick={() => setCartDrawerOpen(true)}
                className="cursor-pointer w-full border border-violet-300 text-violet-700 hover:bg-violet-50 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
              >
                <ShoppingBag className="h-4 w-4" />
                View Cart ({cartCount} items)
              </button>
            )}
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
            {[
              { icon: Truck, label: 'Fast Delivery' },
              { icon: RefreshCw, label: '30-Day Return' },
              { icon: Shield, label: 'Secure Pay' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center text-center p-2.5 bg-slate-50 border rounded-xl text-[10px] text-gray-500">
                <Icon className="h-4.5 w-4.5 text-violet-600 mb-1" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs: Description & Reviews */}
      <div className="bg-white border border-gray-200/80 p-6 sm:p-8 rounded-3xl shadow-xs space-y-6">
        <div className="flex border-b border-gray-200 text-sm font-semibold">
          <button type="button"
            onClick={() => setActiveTab('desc')}
            className={`cursor-pointer pb-3 px-4 border-b-2 transition-all ${activeTab === 'desc' ? 'border-violet-600 text-violet-700 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Description & Specs
          </button>
          <button type="button"
            onClick={() => setActiveTab('reviews')}
            className={`cursor-pointer pb-3 px-4 border-b-2 transition-all ${activeTab === 'reviews' ? 'border-violet-600 text-violet-700 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Reviews ({reviews.length})
          </button>
        </div>

        {activeTab === 'desc' ? (
          <div className="space-y-5 text-sm leading-relaxed text-gray-600">
            <p className="font-medium text-gray-800">{product.description}</p>
            <div className="grid sm:grid-cols-2 gap-4 max-w-xl font-mono text-xs pt-2">
              {[
                { label: 'Brand', value: product.brand },
                { label: 'Category', value: product.category },
                { label: 'Stock Available', value: `${product.stock} units` },
                { label: 'Rating', value: `${avg} / 5.0 ★` },
                { label: 'Vendor', value: product.vendorStoreName || 'OmniBazaar Store' },
              ].map(row => (
                <div key={row.label} className="flex justify-between border-b pb-1.5">
                  <span className="text-gray-400">{row.label.toUpperCase()}:</span>
                  <span className="font-bold text-gray-800">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No reviews yet. Be the first to leave a review!</p>
              ) : (
                reviews.map(rev => (
                  <div key={rev.id} className="p-4 bg-slate-50 border border-gray-150 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-indigo-700">{rev.userName || rev.reviewerName || 'Customer'}</span>
                        <span className="text-gray-400 text-[10px] ml-2">{new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex text-amber-400 gap-0.5">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{rev.reviewText}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddReview} className="p-5 border border-gray-200 bg-gray-50/50 rounded-2xl max-w-2xl space-y-4">
              <h5 className="font-bold text-gray-800 text-sm">Write a Review</h5>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Rating:</span>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} type="button" onClick={() => setNewRating(s)} className="cursor-pointer">
                      <Star className={`h-5 w-5 ${s <= newRating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={3}
                required
                value={newReviewText}
                onChange={e => setNewReviewText(e.target.value)}
                placeholder="Share your experience with this product..."
                className="w-full bg-white px-3.5 py-2 rounded-xl border outline-none focus:border-violet-500 text-xs"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2"
              >
                {submittingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Submit Review'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
