import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import MapPicker from './MapPicker';
import { ShoppingBag, Star, MapPin, Bell, CheckCircle, ShieldAlert, FileText, IndianRupee, MessageSquare, Heart, User, Settings, Loader2, Play, Trash2, Share2 } from 'lucide-react';

interface DashboardCustomerProps {
  onNavigateTo?: (page: string) => void;
}

export default function DashboardCustomer({ onNavigateTo }: DashboardCustomerProps) {
  const { token, user, refreshProfile } = useAuth();
  const { wishlist, removeFromWishlist, addToCart } = useCart();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'addresses' | 'wishlist' | 'reviews' | 'profile'>('overview');

  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Wishlist Slides mode states
  const [wishlistLayoutMode, setWishlistLayoutMode] = useState<'grid' | 'slides'>('grid');
  const [activeWishlistSlide, setActiveWishlistSlide] = useState(0);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [overviewMediaIndex, setOverviewMediaIndex] = useState(0);
  const [overviewPlaying, setOverviewPlaying] = useState(false);
  const [overviewMuted, setOverviewMuted] = useState(true);
  const [overviewVolume, setOverviewVolume] = useState(0.7);
  const [overviewTheater, setOverviewTheater] = useState(false);
  const overviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [wishlistSubImageIndex, setWishlistSubImageIndex] = useState<Record<string, number>>({});

  // Address inputs
  const [addrLabel, setAddrLabel] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrLatitude, setAddrLatitude] = useState(20.5937);
  const [addrLongitude, setAddrLongitude] = useState(78.9629);

  // Review input states
  const [ratingProduct, setRatingProduct] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Profile credentials inputs
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileNotif, setProfileNotif] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [notif, setNotif] = useState<string | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
    fetchAddresses();
    fetchReviews();
    fetchAlerts();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setRecommendedProducts(data.products || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Sort orders so latest is first
        const sorted = (data.orders || []).sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setOrders(sorted);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/customer/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveAddressDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customer/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          label: addrLabel || 'Home',
          addressLine: addrLine,
          district: addrDistrict,
          state: addrState,
          pincode: addrPincode,
          latitude: addrLatitude,
          longitude: addrLongitude
        })
      });
      if (res.ok) {
        setAddrLabel('');
        setAddrLine('');
        setAddrDistrict('');
        setAddrState('');
        setAddrPincode('');
        setNotif('Address profile added successfully. Verified.');
        fetchAddresses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      const res = await fetch(`/api/customer/addresses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setNotif('Address deleted successfully.');
        fetchAddresses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMapLocationSelected = (location: any) => {
    setAddrLine(location.address || '');
    setAddrDistrict(location.district || '');
    setAddrState(location.state || '');
    setAddrPincode(location.pincode || '');
    setAddrLatitude(location.latitude);
    setAddrLongitude(location.longitude);
  };

  const submitProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileNotif(null);
    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          phone: profilePhone,
          password: profilePassword || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update credentials.');
      }
      setProfileNotif('Credentials updated successfully!');
      setProfilePassword('');
      await refreshProfile();
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const submitProductReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingProduct) return;
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: ratingProduct.id,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      if (res.ok) {
        setRatingProduct(null);
        setReviewComment('');
        setNotif('Review filed successfully! Thank you for the insights.');
        fetchReviews();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Stepper Status mapper logic:
  // Statuses: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered'
  const getProgressStep = (status: string) => {
    switch (status) {
      case 'pending':
        return 1; // Ordered
      case 'confirmed':
        return 1.5; // Stepper transition
      case 'processing':
        return 2; // Processing
      case 'shipped':
      case 'out_for_delivery':
        return 3; // Shipped
      case 'delivered':
        return 4; // Delivered
      default:
        return 1;
    }
  };

  useEffect(() => {
    const video = overviewVideoRef.current;
    if (!video) return;
    video.muted = overviewMuted;
    video.volume = overviewVolume;
    if (overviewPlaying && video.paused) {
      video.play().catch(() => {});
    }
  }, [overviewMuted, overviewVolume, overviewPlaying, overviewMediaIndex]);

  useEffect(() => {
    const activeId = wishlist[activeWishlistSlide]?.id;
    if (!activeId) return;
    setWishlistSubImageIndex(prev => ({
      ...prev,
      [activeId]: prev[activeId] ?? 0
    }));
  }, [activeWishlistSlide, wishlist]);

  const spotlightMedia = recommendedProducts.length > 0 
    ? recommendedProducts.slice(0, 5).map((prod) => ({
        id: prod.id,
        title: prod.name,
        description: prod.description ? (prod.description.substring(0, 100) + '...') : 'Discover premium items and curated launches directly inside your interactive dashboard.',
        type: (prod.video ? 'video' : 'image') as 'video' | 'image',
        src: prod.video || prod.images?.[0] || prod.imageUrl || 'https://images.unsplash.com/photo-1503602642458-232111445657?w=1200&q=80',
        poster: prod.images?.[0] || prod.imageUrl || 'https://images.unsplash.com/photo-1512446733611-9099a758e723?w=1200&q=80'
      }))
    : [
        {
          id: 'spotlight-video',
          title: 'Spotlight Video Hub',
          description: 'Discover cinema-style product stories, curated launches, and immersive motion experiences in your overview panel.',
          type: 'video' as const,
          src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
          poster: 'https://images.unsplash.com/photo-1512446733611-9099a758e723?w=1200&q=80'
        },
        {
          id: 'spotlight-image-1',
          title: 'Creative Launch Gallery',
          description: 'A polished hero image slot where side-by-side visuals and interactive media controls feel premium.',
          type: 'image' as const,
          src: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&q=80'
        },
        {
          id: 'spotlight-image-2',
          title: 'Ambient Product Showcase',
          description: 'Toggle between curated photography and motion-driven highlight reels with elegant controls.',
          type: 'image' as const,
          src: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=1200&q=80'
        }
      ];

  const safeMediaIndex = Math.min(Math.max(0, overviewMediaIndex), spotlightMedia.length - 1);
  const overviewActiveMedia = spotlightMedia[safeMediaIndex] || spotlightMedia[0];
  const overviewActiveIsVideo = overviewActiveMedia.type === 'video';

  const toggleOverviewPlayback = () => {
    if (!overviewActiveIsVideo) return;
    const video = overviewVideoRef.current;
    if (!video) return;
    if (overviewPlaying) {
      video.pause();
      setOverviewPlaying(false);
    } else {
      video.play().catch(() => {});
      setOverviewPlaying(true);
    }
  };

  useEffect(() => {
    if (!overviewActiveIsVideo) {
      setOverviewPlaying(false);
    }
  }, [overviewActiveIsVideo]);

  const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div id="buyer-panel" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* Customer profile header banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-violet-600 to-indigo-805 text-white p-6 rounded-2xl shadow-xl mb-6 border border-white/10">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest font-semibold bg-white/20 text-white py-1 px-3 rounded-full border border-white/25">
            Customer Dashboard Suite
          </span>
          <h2 className="text-2xl font-black font-display tracking-tight text-white mt-1.5">
            Hello, {user?.name || 'Member'}!
          </h2>
          <p className="text-xs text-gray-200 mt-1">
            Customer Member since May 2026 · Registered ID: <span className="text-white font-mono font-bold bg-white/10 px-2.5 py-0.5 rounded-md">{user?.phone}</span>
          </p>
        </div>
        {user?.role === 'vendor' && (
          <span className="bg-emerald-500/20 text-emerald-305 border border-emerald-500/30 text-[10px] font-bold py-1 px-3.5 rounded-full uppercase tracking-wider">
            Verified Partner
          </span>
        )}
      </div>

      {notif && (
        <div className="mb-6 p-4 bg-emerald-55 text-emerald-805 rounded-xl border border-emerald-150 text-xs font-semibold flex justify-between items-center shadow-xs">
          <span>{notif}</span>
          <button type="button" onClick={() => setNotif(null)} className="cursor-pointer text-[10px] text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 py-0.5 px-2 rounded-md">
            Clear
          </button>
        </div>
      )}

      {/* HORIZONTAL Tab navigation exactly like the video */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden mb-6">
        
        {/* Navigation bar list headers */}
        <div className="flex flex-wrap border-b border-gray-100 text-xs font-bold text-gray-500">
          <button type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview' ? 'border-violet-600 text-violet-600 font-extrabold bg-violet-50/10' : 'border-transparent hover:text-gray-800'
            }`}
          >
            ACCOUNT OVERVIEW
          </button>
          <button type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'orders' ? 'border-violet-600 text-violet-600 font-extrabold bg-violet-50/10' : 'border-transparent hover:text-gray-800'
            }`}
          >
            MY ORDERS ({orders.length})
          </button>
          <button type="button"
            onClick={() => setActiveTab('addresses')}
            className={`py-4 px-5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'addresses' ? 'border-violet-600 text-violet-600 font-extrabold bg-violet-50/10' : 'border-transparent hover:text-gray-800'
            }`}
          >
            {t('customer.addresses').toUpperCase()}
          </button>
          <button type="button"
            onClick={() => setActiveTab('wishlist')}
            className={`py-4 px-5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'wishlist' ? 'border-violet-600 text-violet-600 font-extrabold bg-violet-50/10' : 'border-transparent hover:text-gray-800'
            }`}
          >
            {t('customer.wishlist_tab').toUpperCase()} ({wishlist.length})
          </button>
          <button type="button"
            onClick={() => setActiveTab('reviews')}
            className={`py-4 px-5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'reviews' ? 'border-violet-600 text-violet-600 font-extrabold bg-violet-50/10' : 'border-transparent hover:text-gray-800'
            }`}
          >
            {t('customer.reviews').toUpperCase()}
          </button>
          <button type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile' ? 'border-violet-600 text-violet-600 font-extrabold bg-violet-50/10' : 'border-transparent hover:text-gray-800'
            }`}
          >
            PROFILE SETTINGS
          </button>
        </div>

        {/* Dynamic content rendering blocks */}
        <div className="p-6">
          
          {/* TAB 1: OVERVIEW SCREEN (Matches the exact layout of video at 0:25) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Row of four metrics cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 border rounded-2xl shadow-2xs">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">TOTAL PURCHASES</p>
                  <p className="text-lg font-black text-gray-850">{orders.length} Order(s)</p>
                </div>
                
                <div className="p-4 bg-gray-50 border rounded-2xl shadow-2xs">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">ACCUMULATED SPENT</p>
                  <p className="text-lg font-black text-violet-750">₹{totalSpent.toLocaleString('en-IN')}</p>
                </div>

                <div className="p-4 bg-gray-50 border rounded-2xl shadow-2xs">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">MY WISHLIST</p>
                  <p className="text-lg font-black text-gray-850">{wishlist.length} Item(s)</p>
                </div>

                <div className="p-4 bg-gray-50 border rounded-2xl shadow-2xs">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">SAVED IN WALLET</p>
                  <p className="text-lg font-black text-emerald-600">₹1,024</p>
                </div>
              </div>

              <div className={`relative overflow-hidden rounded-[2rem] border border-violet-100 shadow-xl bg-gradient-to-br from-violet-950 via-slate-950 to-slate-900 text-white mt-6 ${overviewTheater ? 'lg:px-10 lg:py-10' : 'p-6'}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(129,140,248,0.35),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(139,92,246,0.25),_transparent_30%)] blur-3xl pointer-events-none" />
                <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-center">
                  <div className="space-y-4">
                    <span className="text-[10px] uppercase tracking-[0.35em] text-violet-300 font-bold">Overview Spotlight</span>
                    <h3 className="text-2xl lg:text-3xl font-black leading-tight">{overviewActiveMedia.title}</h3>
                    <p className="max-w-xl text-sm text-slate-200/90">{overviewActiveMedia.description}</p>

                    <div className="flex flex-wrap gap-2">
                      {spotlightMedia.map((media, idx) => (
                        <button
                          key={media.id}
                          type="button"
                          onClick={() => { setOverviewMediaIndex(idx); setOverviewPlaying(false); }}
                          className={`rounded-full border px-3 py-2 text-[11px] font-bold transition ${overviewMediaIndex === idx ? 'bg-white text-slate-950 border-white/40 shadow-sm' : 'bg-white/10 text-slate-200 border-white/15 hover:bg-white/15'}`}
                        >
                          {media.type === 'video' ? 'Video Hub' : 'Image Preview'}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3 items-center pt-2">
                      <button
                        type="button"
                        onClick={toggleOverviewPlayback}
                        className="rounded-xl bg-white text-slate-950 px-4 py-2 text-xs font-bold shadow-lg transition hover:bg-slate-100"
                      >
                        {overviewActiveIsVideo ? (overviewPlaying ? 'Pause Spotlight' : 'Play Spotlight') : 'View Still'}
                      </button>
                      {overviewActiveIsVideo && (
                        <button
                          type="button"
                          onClick={() => setOverviewMuted(prev => !prev)}
                          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/15"
                        >
                          {overviewMuted ? 'Unmute' : 'Mute'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setOverviewTheater(prev => !prev)}
                        className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/15"
                      >
                        {overviewTheater ? 'Exit Theater' : 'Theater Mode'}
                      </button>
                    </div>

                    {overviewActiveIsVideo && (
                      <div className="w-full max-w-sm">
                        <label className="text-[10px] uppercase tracking-[0.25em] text-slate-300 font-bold">Volume</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={overviewVolume}
                          onChange={e => setOverviewVolume(Number(e.target.value))}
                          className="mt-2 w-full accent-violet-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/90 shadow-2xl">
                    {overviewActiveIsVideo ? (
                      <video
                        ref={overviewVideoRef}
                        src={overviewActiveMedia.src}
                        poster={overviewActiveMedia.poster}
                        controls
                        autoPlay={overviewPlaying}
                        className="h-full w-full min-h-[260px] object-cover"
                      />
                    ) : (
                      <img
                        src={overviewActiveMedia.src}
                        alt={overviewActiveMedia.title}
                        className="h-full w-full min-h-[260px] object-cover"
                      />
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  </div>
                </div>
              </div>

              {/* Grid split: Recent purchase progress and My Account summary */}
              <div className="grid lg:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                
                {/* Column left (recent order progress details) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-extrabold uppercase text-gray-500 tracking-wider">Recent Purchase Progress</h3>
                    {orders.length > 0 && (
                      <button type="button" 
                        onClick={() => setActiveTab('orders')}
                        className="text-xs text-violet-700 hover:text-violet-850 font-bold"
                      >
                        Track All →
                      </button>
                    )}
                  </div>

                  {orders.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed text-xs text-gray-400">
                      No customer transactions saved. Choose premium items to initiate multi-vendor logistics tracking!
                    </div>
                  ) : (
                    (() => {
                      const latest = orders[0];
                      const step = getProgressStep(latest.orderStatus);
                      return (
                        <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-4 shadow-sm text-xs">
                          <div className="flex justify-between border-b pb-2.5">
                            <div>
                              <p className="text-gray-400 font-bold text-[9px] uppercase tracking-wider">ORDER REFERENCE ID</p>
                              <p className="font-mono font-bold text-indigo-750 text-sm">{latest.id}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-400 font-bold text-[9px] uppercase tracking-wider">DATE</p>
                              <p className="font-sans font-bold text-gray-700">{new Date(latest.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">STATUS</span>
                            <div className="flex items-center gap-2">
                              <span className={`inline-block h-2 w-2 rounded-full ${
                                step >= 4 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'
                              }`} />
                              <p className="font-extrabold text-gray-850 uppercase">{latest.orderStatus.replace('_', ' ')}</p>
                            </div>
                            
                            <p className="text-xs text-gray-500 leading-relaxed pt-1">
                              {latest.orderStatus === 'pending' || latest.orderStatus === 'confirmed' ? (
                                "Our merchant partners are preparing and packaging your technology items."
                              ) : latest.orderStatus === 'processing' ? (
                                "Your order has been confirmed and is currently being processed by the vendor."
                              ) : latest.orderStatus === 'shipped' || latest.orderStatus === 'out_for_delivery' ? (
                                "Your package has been handed over to our delivery partner and is on its way."
                              ) : (
                                "Your order has been successfully delivered! Thank you for shopping with us."
                              )}
                            </p>
                          </div>

                          {/* Simplified horizontal stepper for overview order */}
                          <div className="relative pt-2 pb-6 max-w-sm">
                            <div className="absolute left-[10%] right-[10%] top-[40%] h-0.5 bg-gray-150" />
                            <div 
                              className="absolute left-[10%] top-[40%] h-0.5 bg-violet-650 transition-all duration-300"
                              style={{ width: `${(Math.max(1, step) - 1) * 33.3}%` }}
                            />
                            
                            <div className="flex justify-between items-center relative">
                              {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex flex-col items-center">
                                  <div className={`h-6 w-6 rounded-full text-[10px] font-bold flex items-center justify-center border transition-all ${
                                    step >= i 
                                      ? 'bg-violet-650 text-white border-violet-650 shadow' 
                                      : 'bg-white text-gray-450 border-gray-200'
                                  }`}>
                                    {step >= i ? '✓' : i}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Column right (My account summary metadata) */}
                <div className="space-y-4">
                  <h3 className="text-sm font-extrabold uppercase text-gray-500 tracking-wider">My Account Summary</h3>
                  
                  <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-150 space-y-4 text-xs font-sans">
                    <div className="flex items-center gap-3 border-b border-gray-150/50 pb-3">
                      <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-750 flex items-center justify-center font-bold text-sm">
                        {user?.name ? user.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{user?.name || 'Member'}</p>
                        <p className="text-[10px] text-gray-400">Customer Member since 2026</p>
                      </div>
                    </div>

                    <div className="space-y-3 font-mono text-[11px]">
                      <div>
                        <p className="text-[9px] uppercase font-bold text-gray-400 font-sans">MAPPED MEMBER EMAIL</p>
                        <p className="text-gray-850 font-bold">{user?.email || 'N/A'}</p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase font-bold text-gray-400 font-sans">REGISTERED CONTACT</p>
                        <p className="text-gray-850 font-bold">{user?.phone || 'N/A'}</p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase font-bold text-gray-400 font-sans">ACCUMLATED WALLET SAVINGS</p>
                        <p className="text-emerald-600 font-extrabold">₹1,024 Active Savings</p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase font-bold text-gray-400 font-sans">HIERARCHY ROLE</p>
                        <span className="inline-block bg-violet-100 border border-violet-200 text-violet-750 font-bold px-2 py-0.5 rounded text-[9px] font-sans uppercase uppercase tracking-wider">
                          {user?.role || 'customer'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MY ORDERS LIST (With detailed stepper lines exactly like video 0:28 / 6:28) */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold font-display text-gray-800">
                My Shipment Activity & Orders
              </h3>

              <div className="space-y-5">
                {orders.length === 0 ? (
                  <p className="text-xs text-gray-500 font-mono italic">
                    {t('general.empty')}
                  </p>
                ) : (
                  orders.map((o) => {
                    const stepVal = getProgressStep(o.orderStatus);
                    return (
                      <div key={o.id} className="p-6 bg-white border border-gray-250/70 rounded-2xl space-y-6 hover:shadow-md transition-all text-xs">
                        
                        {/* Upper order header details */}
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-150 pb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-450 uppercase tracking-widest text-[9px] font-bold">Order Reference:</span>
                              <p className="font-mono font-black text-indigo-750 text-sm">{o.id}</p>
                            </div>
                            <p className="text-[10px] text-gray-400 font-sans font-medium">Purchased on {new Date(o.createdAt).toLocaleString('en-IN')}</p>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[10px] text-gray-450 font-bold block">TOTAL CHARGED</span>
                            <span className="text-base font-black text-violet-650">₹{o.totalAmount.toLocaleString('en-IN')}</span>
                            {(o.shippingFee || 0) > 0 && (
                                <div className="text-[9px] text-gray-500 mt-0.5 font-sans mb-1">(incl. ₹{o.shippingFee} shipping)</div>
                            )}
                            <span className={`capitalize text-[9px] font-bold py-0.5 px-2 rounded-full border ml-2 ${
                              o.orderStatus === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-violet-50 text-violet-750 border-violet-200'
                            }`}>
                              {o.orderStatus.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* HIGH FIDELITY HORIZONTAL STEPPER TIMELINE STEPPERS */}
                        <div className="relative pt-4 pb-8 max-w-xl mx-auto px-4">
                          {/* Stepper background connecting line */}
                          <div className="absolute left-[8%] right-[8%] top-[38%] h-0.75 bg-gray-150 -z-1" />
                          
                          {/* Active highlight line */}
                          <div 
                            className="absolute left-[8%] top-[38%] h-0.75 bg-violet-650 transition-all duration-500 -z-1" 
                            style={{ 
                              width: `${(Math.max(1, stepVal) - 1) * 28}%` // Map index progress 
                            }} 
                          />

                          <div className="flex justify-between items-center relative">
                            {/* Step 1: ORDERED */}
                            <div className="flex flex-col items-center select-none text-center">
                              <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center border transition-all ${
                                stepVal >= 1 
                                  ? 'bg-violet-650 text-white border-violet-650 shadow-md shadow-violet-500/20' 
                                  : 'bg-white text-gray-400 border-gray-200'
                              }`}>
                                {stepVal >= 1 ? '✓' : '1'}
                              </div>
                              <span className="text-[9px] uppercase font-black text-gray-500 mt-2 font-sans tracking-wide">ORDERED</span>
                            </div>

                            {/* Step 2: PROCESSING */}
                            <div className="flex flex-col items-center select-none text-center">
                              <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center border transition-all ${
                                stepVal >= 2 
                                  ? 'bg-violet-650 text-white border-violet-650 shadow-md shadow-violet-500/20' 
                                  : 'bg-white text-gray-400 border-gray-200'
                              }`}>
                                {stepVal >= 2 ? '✓' : '2'}
                              </div>
                              <span className="text-[9px] uppercase font-black text-gray-500 mt-2 font-sans tracking-wide">PROCESSING</span>
                            </div>

                            {/* Step 3: SHIPPED */}
                            <div className="flex flex-col items-center select-none text-center">
                              <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center border transition-all ${
                                stepVal >= 3 
                                  ? 'bg-violet-650 text-white border-violet-650 shadow-md shadow-violet-500/20' 
                                  : 'bg-white text-gray-400 border-gray-200'
                              }`}>
                                {stepVal >= 3 ? '✓' : '3'}
                              </div>
                              <span className="text-[9px] uppercase font-black text-gray-500 mt-2 font-sans tracking-wide">SHIPPED</span>
                            </div>

                            {/* Step 4: DELIVERED */}
                            <div className="flex flex-col items-center select-none text-center">
                              <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center border transition-all ${
                                stepVal >= 4 
                                  ? 'bg-violet-650 text-white border-violet-650 shadow-md shadow-violet-500/20' 
                                  : 'bg-white text-gray-400 border-gray-200'
                              }`}>
                                {stepVal >= 4 ? '✓' : '4'}
                              </div>
                              <span className="text-[9px] uppercase font-black text-gray-500 mt-2 font-sans tracking-wide">DELIVERED</span>
                            </div>
                          </div>
                        </div>

                        {/* Order details description with layout (Purchased products Left, shipping info Right) */}
                        <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-gray-150">
                          
                          {/* Products columns */}
                          <div className="space-y-2.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">PURCHASED PRODUCTS</span>
                            {o.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-150 shadow-2xs items-center">
                                {item.image && (
                                  <img src={item.image} alt={item.name} className="h-10 w-10 rounded object-cover border" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-extrabold text-gray-805 truncate text-xs leading-none mb-0.5">{item.name}</p>
                                  <p className="text-[10px] text-gray-400 tracking-wider">SKU Qty: <span className="font-bold text-gray-800">{item.quantity}</span> · Price: ₹{item.price.toLocaleString('en-IN')}</p>
                                </div>
                                
                                <button type="button"
                                  onClick={() => window.open(`https://wa.me/91${o.customerPhone}?text=Bazaar%20Order%20${o.id}`, '_blank')}
                                  className="cursor-pointer text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 py-1.5 px-3 rounded-lg font-bold hover:bg-emerald-100"
                                >
                                  Contact Seller
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Address info and courier state columns */}
                          <div className="space-y-2.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-sans">SHIPPING ADDRESS & PAYMENT</span>
                            
                            <div className="bg-gray-50/50 p-3 rounded-xl border space-y-1.5 leading-relaxed text-[11px] font-mono">
                              <p className="text-gray-800 font-sans font-bold">{o.deliveryAddress?.fullName || 'Consignee'}</p>
                              <p className="text-gray-600 font-sans">{o.deliveryAddress?.addressLine || 'Self Collect Address'}</p>
                              <p className="text-gray-500 font-sans">{o.deliveryAddress?.district || 'Coimbatore'}, {o.deliveryAddress?.state || 'Tamil Nadu'}, PIN: {o.deliveryAddress?.pincode}</p>
                              
                              <div className="pt-2 border-t mt-2 flex justify-between font-sans text-[11px]">
                                <span className="text-gray-400 font-bold uppercase text-[9px]">PAYMENT METHOD:</span>
                                <span className="font-bold text-violet-750 uppercase">{o.paymentMethod === 'cod' ? 'Cash on Delivery' : o.paymentMethod === 'upi' ? 'UPI Wallet Scan' : 'Credit / Debit Card'}</span>
                              </div>
                            </div>
                          </div>

                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: Address profiles profiles profiles */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold font-display text-gray-800">
                {t('customer.addresses')}
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Save addresses */}
                <form onSubmit={saveAddressDetails} className="space-y-4 p-4 border rounded-2xl bg-gray-50">
                  <span className="font-bold text-xs uppercase text-indigo-750 block">Register Address Zone</span>
                  
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">Label</label>
                    <input
                      type="text"
                      required
                      value={addrLabel}
                      onChange={e => setAddrLabel(e.target.value)}
                      placeholder="e.g. Home or Office Address"
                      className="w-full bg-white px-3 py-2 text-xs rounded-xl border outline-none focus:border-violet-500"
                    />
                  </div>

                  <MapPicker onLocationSelected={handleMapLocationSelected} />

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">Address line / Street details</label>
                    <textarea
                      required
                      rows={2}
                      value={addrLine}
                      onChange={e => setAddrLine(e.target.value)}
                      placeholder="Flat/House No., building, street..."
                      className="w-full bg-white px-3 py-2 text-xs rounded-xl border outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">District</label>
                      <input
                        type="text"
                        required
                        value={addrDistrict}
                        onChange={e => setAddrDistrict(e.target.value)}
                        placeholder="district"
                        className="w-full bg-gray-100 px-3 py-2 text-xs rounded-xl border outline-none font-semibold text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        required
                        value={addrState}
                        onChange={e => setAddrState(e.target.value)}
                        placeholder="state"
                        className="w-full bg-gray-100 px-3 py-2 text-xs rounded-xl border outline-none font-semibold text-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">Pincode / Postal Index</label>
                    <input
                      type="text"
                      required
                      value={addrPincode}
                      onChange={e => setAddrPincode(e.target.value)}
                      placeholder="e.g. 560001"
                      className="w-full bg-white px-3 py-2 text-xs rounded-xl border outline-none focus:border-violet-500 font-mono font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="cursor-pointer bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md"
                  >
                    Confirm Location Pin Setup
                  </button>
                </form>

                {/* Display addresses addresses */}
                <div className="space-y-3">
                  <span className="font-bold text-xs uppercase text-gray-400 tracking-wider">Registered Geographic Pins</span>
                  {addresses.length === 0 ? (
                    <p className="text-xs text-gray-500 italic font-mono">No addresses stored on file.</p>
                  ) : (
                    addresses.map((a, i) => (
                      <div key={i} className="p-3 bg-white border border-gray-150 rounded-xl flex items-start justify-between shadow-xs">
                        <div className="flex gap-3">
                          <MapPin className="h-5 w-5 text-violet-700 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="font-bold text-sm text-gray-800 leading-tight capitalize">{a.label}</h5>
                            <p className="text-xs text-gray-600 mt-1">{a.addressLine}</p>
                            <p className="text-[10px] text-gray-400 font-semibold font-mono mt-0.5">PIN: {a.pincode} | GPS: {a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(a.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Delete Address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB: Wishlist */}
          {activeTab === 'wishlist' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center pb-2 border-b">
                <h3 className="text-lg font-bold font-display text-gray-800">
                  {t('customer.wishlist_tab')}
                </h3>
                {wishlist.length > 0 && (
                  <div className="flex bg-slate-150/80 p-0.5 rounded-xl border border-gray-250/30 text-xs">
                    <button
                      type="button"
                      onClick={() => { setWishlistLayoutMode('grid'); setPlayingVideoId(null); }}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${wishlistLayoutMode === 'grid' ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      Grid view
                    </button>
                    <button
                      type="button"
                      onClick={() => { setWishlistLayoutMode('slides'); setPlayingVideoId(null); setActiveWishlistSlide(0); }}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${wishlistLayoutMode === 'slides' ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      Slides Mode ⚡
                    </button>
                  </div>
                )}
              </div>

              {wishlist.length === 0 ? (
                <div className="p-8 text-center bg-gray-50/50 border border-dashed rounded-2xl text-xs text-gray-400 font-mono italic">
                  Your wishlist is empty. Explore the catalog to save items you love!
                </div>
              ) : wishlistLayoutMode === 'grid' ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {wishlist.map((item) => (
                    <div key={item.id} className="p-4 bg-white border border-gray-150 rounded-2xl flex gap-3 shadow-xs items-center">
                      <img
                        src={item.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'}
                        alt={item.name}
                        className="h-16 w-16 rounded-xl object-cover border shrink-0 bg-gray-50"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-sm text-gray-850 truncate">{item.name}</h5>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5 uppercase tracking-wider">{item.category} | {item.brand}</p>
                        <p className="text-xs font-bold text-indigo-750 mt-1">₹{item.price.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="cursor-pointer bg-violet-600 hover:bg-violet-750 text-white text-[10px] font-bold py-2 px-3.5 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" /> Add
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromWishlist(item.id)}
                          className="cursor-pointer text-red-500 hover:bg-red-50 rounded-lg p-1.5 text-[10px] font-bold text-center border border-transparent hover:border-red-200 transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                (() => {
                  const index = Math.min(Math.max(0, activeWishlistSlide), wishlist.length - 1);
                  const item = wishlist[index];
                  const subImages: string[] = item.images?.length ? item.images : [item.imageUrl || ''];
                  const activeSubImageIndex = wishlistSubImageIndex[item.id] ?? 0;
                  const safeSubIndex = Math.min(Math.max(0, activeSubImageIndex), subImages.length - 1);
                  const activeSubImage = subImages[safeSubIndex] || subImages[0];
                  const hasVideo = !!item.video;
                  const isPlaying = playingVideoId === item.id;

                  const ambientClasses = item.category === 'fashion'
                    ? 'from-pink-300/30 to-violet-300/20'
                    : item.category === 'mobiles-electronics'
                      ? 'from-cyan-300/30 to-blue-500/20'
                      : item.category === 'spices'
                        ? 'from-amber-300/30 to-orange-400/15'
                        : 'from-slate-300/20 to-slate-700/10';

                  const updateSubImage = (newIndex: number) => {
                    setWishlistSubImageIndex(prev => ({
                      ...prev,
                      [item.id]: Math.min(Math.max(0, newIndex), subImages.length - 1)
                    }));
                    setPlayingVideoId(null);
                  };

                  return (
                    <div className={`relative overflow-hidden rounded-3xl border border-gray-200/80 p-5 md:p-6 shadow-sm max-w-6xl mx-auto ${overviewTheater ? 'bg-slate-950/95' : 'bg-slate-50'} animate-fadeIn`}>
                      <div className={`absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-br ${ambientClasses} blur-3xl opacity-75`} />
                      <div className="relative grid gap-6 lg:grid-cols-[1.45fr_0.85fr] items-start">
                        <div className="space-y-5">
                          <div className="relative overflow-hidden rounded-[28px] border border-slate-800 shadow-xl bg-slate-950">
                            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-none" />
                            <div className="aspect-[16/10] w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                              {isPlaying && item.video ? (
                                <div className="relative h-full w-full">
                                  <video
                                    src={item.video}
                                    controls
                                    autoPlay
                                    className="h-full w-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setPlayingVideoId(null)}
                                    className="absolute top-4 right-4 rounded-xl bg-black/70 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white transition hover:bg-black"
                                  >
                                    Exit Video
                                  </button>
                                </div>
                              ) : (
                                <div className="relative h-full w-full group">
                                  <img
                                    src={activeSubImage}
                                    alt={`${item.name} preview`}
                                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                                  />
                                  {hasVideo && (
                                    <button
                                      type="button"
                                      onClick={() => setPlayingVideoId(item.id)}
                                      className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-all"
                                      title="Play Product Video"
                                    >
                                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600/90 text-white shadow-lg transition-transform duration-300 hover:scale-110">
                                        <Play className="h-6 w-6" />
                                      </div>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                            {subImages.map((thumb, thumbIndex) => (
                              <button
                                key={thumbIndex}
                                type="button"
                                onClick={() => updateSubImage(thumbIndex)}
                                className={`overflow-hidden rounded-3xl border transition ${thumbIndex === safeSubIndex ? 'border-violet-600 shadow-lg' : 'border-gray-200 bg-white'}`}
                              >
                                <img
                                  src={thumb}
                                  alt={`Thumbnail ${thumbIndex + 1}`}
                                  className="h-20 w-full object-cover"
                                />
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                            <button
                              type="button"
                              onClick={() => updateSubImage(safeSubIndex - 1)}
                              disabled={safeSubIndex === 0}
                              className="rounded-full border border-gray-200 bg-white px-4 py-2 font-bold transition disabled:opacity-40"
                            >
                              ← Prev Image
                            </button>
                            <span className="font-bold text-slate-700">Image {safeSubIndex + 1} / {subImages.length}</span>
                            <button
                              type="button"
                              onClick={() => updateSubImage(safeSubIndex + 1)}
                              disabled={safeSubIndex === subImages.length - 1}
                              className="rounded-full border border-gray-200 bg-white px-4 py-2 font-bold transition disabled:opacity-40"
                            >
                              Next Image →
                            </button>
                          </div>
                        </div>

                        <div className="space-y-5 relative">
                          <div className="rounded-3xl border border-white/10 bg-white/90 p-5 shadow-sm backdrop-blur-xl">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.28em] text-violet-600 font-bold">Creative Slide Mode</p>
                                <h4 className="mt-2 text-xl font-black text-slate-950">{item.name}</h4>
                              </div>
                              <div className="flex gap-2 items-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/product/${item.id}`);
                                    setNotif('Shareable link copied to clipboard!');
                                  }}
                                  className="rounded-full bg-violet-50 p-1.5 text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer"
                                  title="Copy Shareable Link"
                                >
                                  <Share2 className="h-3.5 w-3.5" />
                                </button>
                                <span className="rounded-full bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700">Featured</span>
                              </div>
                            </div>

                            <p className="mt-4 text-sm leading-6 text-slate-600">{item.description || 'A polished product reveal with interactive image browsing, video playback, and rich visual presentation.'}</p>

                            <div className="mt-5 space-y-3 text-xs text-slate-500">
                              <div className="flex items-center justify-between rounded-2xl bg-violet-50/70 p-3">
                                <span className="font-bold text-slate-700">Brand</span>
                                <span className="font-bold text-violet-700">{item.brand}</span>
                              </div>
                              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 border border-slate-200">
                                <span className="font-bold text-slate-700">Category</span>
                                <span className="font-bold text-slate-900">{item.category}</span>
                              </div>
                              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 border border-slate-200">
                                <span className="font-bold text-slate-700">Price</span>
                                <span className="font-black text-violet-700">₹{item.price.toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-gray-400 font-bold">Video Controls</p>
                            <div className="mt-4 space-y-3">
                              <button
                                type="button"
                                onClick={() => setWishlistLayoutMode('slides')}
                                className="w-full rounded-2xl bg-violet-650 px-4 py-3 text-xs font-bold text-white transition hover:bg-violet-750"
                              >
                                Refresh Slide Experience
                              </button>
                              <button
                                type="button"
                                onClick={() => setOverviewPlaying(prev => !prev)}
                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-slate-900 transition hover:bg-slate-50"
                              >
                                {overviewPlaying ? 'Pause Overview Hub' : 'Play Overview Hub'}
                              </button>
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setOverviewMuted(prev => !prev)}
                                  className="rounded-2xl border border-gray-200 bg-white py-3 text-[10px] font-bold text-slate-900 transition hover:bg-slate-50"
                                >
                                  {overviewMuted ? 'Unmute' : 'Mute'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setOverviewTheater(prev => !prev)}
                                  className="rounded-2xl border border-gray-200 bg-white py-3 text-[10px] font-bold text-slate-900 transition hover:bg-slate-50"
                                >
                                  {overviewTheater ? 'Compact View' : 'Theater'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPlayingVideoId(null)}
                                  className="rounded-2xl border border-gray-200 bg-white py-3 text-[10px] font-bold text-slate-900 transition hover:bg-slate-50"
                                >
                                  Stop Product Video
                                </button>
                              </div>
                              {hasVideo && (
                                <div className="rounded-3xl bg-slate-950/95 p-3 text-xs text-white">
                                  <p className="font-bold text-white">Media Mode</p>
                                  <p className="mt-2 text-[11px] leading-5 text-slate-200">Use the play overlay to open the product video. Volume, mute and color-rich theater feel are all available while browsing.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            setActiveWishlistSlide(prev => Math.max(0, prev - 1));
                            setPlayingVideoId(null);
                          }}
                          className="w-full sm:w-auto rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition disabled:opacity-40"
                        >
                          ← Previous Item
                        </button>

                        <div className="flex items-center justify-center gap-2">
                          {wishlist.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setActiveWishlistSlide(i);
                                setPlayingVideoId(null);
                              }}
                              className={`h-2 rounded-full transition-all ${i === index ? 'w-8 bg-violet-650' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          disabled={index === wishlist.length - 1}
                          onClick={() => {
                            setActiveWishlistSlide(prev => Math.min(wishlist.length - 1, prev + 1));
                            setPlayingVideoId(null);
                          }}
                          className="w-full sm:w-auto rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition disabled:opacity-40"
                        >
                          Next Item →
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* TAB: Reviews ratings ratings */}
          {activeTab === 'reviews' && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-lg font-bold font-display text-gray-800">
                {t('customer.reviews')}
              </h3>

              <div className="space-y-3">
                {reviews.filter(r => r.reviewerEmail === user?.email).length === 0 ? (
                  <p className="text-xs text-gray-500 italic font-mono">You have not posted any catalog stars product reviews yet.</p>
                ) : (
                  reviews.filter(r => r.reviewerEmail === user?.email).map((r) => (
                    <div key={r.id} className="p-4 bg-gray-55 rounded-xl border border-gray-200 text-xs">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-gray-700">Product Mapping Mapped</span>
                        <div className="flex text-amber-500 gap-0.5">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-800 mt-2 font-medium italic">"{r.comment}"</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-1 text-right">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: Security Profile Settings */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold font-display text-gray-800">
                  Security & Profile Settings
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Change your display identity, registered email, or security passwords. Real-time encryption is applied on save.
                </p>
              </div>

              {profileError && (
                <div className="p-3 text-xs font-semibold bg-red-50 text-red-650 rounded-xl border border-red-150 border-dashed">
                  {profileError}
                </div>
              )}

              {profileNotif && (
                <div className="p-3 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-150 border-dashed animate-fade-in">
                  {profileNotif}
                </div>
              )}

              <form onSubmit={submitProfileUpdate} className="space-y-4 max-w-md border p-5 rounded-2xl bg-gray-50">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Mobile Telephone Number</label>
                  <input
                    type="text"
                    required
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none font-mono font-bold"
                  />
                </div>

                <div className="pt-2 border-t border-gray-200/60 font-sans">
                  <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block mb-2.5">Passkey Update (Optional)</span>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1 font-sans">New Security Password</label>
                  <input
                    type="password"
                    value={profilePassword}
                    onChange={e => setProfilePassword(e.target.value)}
                    placeholder="Leave empty to keep current password"
                    className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileLoading}
                  className="cursor-pointer w-full bg-violet-600 hover:bg-violet-750 text-white font-extrabold py-2.5 rounded-xl text-center text-xs transition-colors flex justify-center items-center gap-2"
                >
                  {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Secure Framework Updates'}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
