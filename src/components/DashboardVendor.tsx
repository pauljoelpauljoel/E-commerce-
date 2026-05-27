import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import MapPicker from './MapPicker';
import { 
  Store, 
  ShoppingBag, 
  Plus, 
  Sparkles, 
  MapPin, 
  Check, 
  QrCode, 
  FileText, 
  IndianRupee, 
  Loader2, 
  ArrowRight, 
  Settings, 
  Upload, 
  Info,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Truck,
  Zap,
  Home
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface DashboardVendorProps {
  onNavigateTo?: (page: string) => void;
}

export default function DashboardVendor({ onNavigateTo }: DashboardVendorProps) {
  const { token, refreshProfile, vendorRequest, logout, user } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'storefront' | 'onboarding' | 'catalog' | 'orders' | 'profile'>(
    vendorRequest?.status === 'approved' ? 'storefront' : 'onboarding'
  );

  // Register profile inputs
  const [storeName, setStoreName] = useState(vendorRequest?.storeName || '');
  const [legalName, setLegalName] = useState(vendorRequest?.legalName || '');
  const [description, setDescription] = useState(vendorRequest?.description || '');
  const [regNumber, setRegNumber] = useState(vendorRequest?.regNumber || '');
  const [gstNumber, setGSTNumber] = useState(vendorRequest?.gstNumber || '');
  const [businessPhone, setBusinessPhone] = useState(vendorRequest?.businessPhone || '');
  const [address, setAddress] = useState(vendorRequest?.address || '');
  const [district, setDistrict] = useState(vendorRequest?.district || '');
  const [state, setState] = useState(vendorRequest?.state || '');
  const [pincode, setPincode] = useState(vendorRequest?.pincode || '');
  const [latitude, setLatitude] = useState(vendorRequest?.latitude || 12.9716);
  const [longitude, setLongitude] = useState(vendorRequest?.longitude || 77.5946);
  const [additionalDetails, setAdditionalDetails] = useState(vendorRequest?.additionalDetails || '');
  const [businessCategory, setBusinessCategory] = useState(vendorRequest?.businessCategory || '');
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  // Document file upload simulation state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docFileName, setDocFileName] = useState(vendorRequest?.documentUrl ? "UploadedCertificate.png" : "");

  // Profile credential state for both panel updates
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileNotif, setProfileNotif] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategoriesList(data.categories || []))
      .catch(e => console.error(e));
  }, []);

  useEffect(() => {
    if (vendorRequest?.status === 'approved') {
      setActiveTab(prev => prev === 'onboarding' ? 'storefront' : prev);
    }
  }, [vendorRequest?.status]);

  useEffect(() => {
    if (vendorRequest) {
      setStoreName(vendorRequest.storeName || '');
      setLegalName(vendorRequest.legalName || '');
      setDescription(vendorRequest.description || '');
      setRegNumber(vendorRequest.regNumber || '');
      setGSTNumber(vendorRequest.gstNumber || '');
      setBusinessPhone(vendorRequest.businessPhone || '');
      setAddress(vendorRequest.address || '');
      setDistrict(vendorRequest.district || '');
      setState(vendorRequest.state || '');
      setPincode(vendorRequest.pincode || '');
      setLatitude(vendorRequest.latitude || 12.9716);
      setLongitude(vendorRequest.longitude || 77.5946);
      setBusinessCategory(vendorRequest.businessCategory || '');
      if (vendorRequest.documentUrl) {
        setDocFileName("UploadedCertificate.png");
      }
    }
  }, [vendorRequest]);

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingDoc(true);
      setTimeout(() => {
        setUploadingDoc(false);
        setDocFileName(file.name);
        setNotif("Address details auto-filled from map! Checked.");
      }, 1000);
    }
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

  // Catalog listing inputs
  const [products, setProducts] = useState<any[]>([]);
  const [editorProduct, setEditorProduct] = useState<any | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [prodVideo, setProdVideo] = useState('');

  // Orders lists & invoice pdf triggers
  const [orders, setOrders] = useState<any[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (vendorRequest?.status === 'approved') {
      fetchCatalog();
      fetchOrders();
      fetchAnalytics();
    }
  }, [vendorRequest]);

  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/vendor/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
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
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/vendor/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitProfileVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/vendor/profile/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          storeName,
          legalName,
          description,
          regNumber,
          gstNumber,
          businessPhone,
          address,
          district,
          state,
          pincode,
          latitude: parseFloat(latitude as any),
          longitude: parseFloat(longitude as any),
          businessCategory,
          additionalDetails,
          documentUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=800&q=80'
        })
      });
      if (res.ok) {
        setNotif('Company application received successfully! Evaluating credentials.');
        await refreshProfile();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMapLocationSelected = (location: any) => {
    setAddress(location.address || '');
    setDistrict(location.district || '');
    setState(location.state || '');
    setPincode(location.pincode || '');
    setLatitude(location.latitude);
    setLongitude(location.longitude);
  };

  const saveProductCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalImages = Array.from(new Set([prodImageUrl, ...extraImages].filter(Boolean)));
    if (finalImages.length < 1) {
      setNotif('Please upload at least one image of this product.');
      return;
    }
    setLoading(true);
    const payload = {
      name: prodName,
      price: parseFloat(prodPrice),
      stock: parseInt(prodStock),
      description: prodDesc,
      category: prodCategory || (categoriesList[0]?.slug || 'mobiles-electronics'),
      brand: prodBrand || 'AuraTech',
      images: finalImages,
      video: prodVideo || ''
    };

    try {
      const url = editorProduct ? `/api/vendor/products/${editorProduct.id}` : '/api/vendor/products';
      const method = editorProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setEditorProduct(null);
        setProdName('');
        setProdPrice('');
        setProdStock('');
        setProdDesc('');
        setProdCategory('');
        setProdBrand('');
        setProdImageUrl('');
        setExtraImages([]);
        setProdVideo('');
        setNotif('Item published successfully to marketplace schemas.');
        fetchCatalog();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const triggerDeleteProduct = async (id: string) => {
    const prod = products.find(p => p.id === id);
    if (prod && prod.disabledByAdmin) {
      setNotif('This product has been disabled by the administrator and cannot be deleted.');
      return;
    }
    if (!confirm('Confirm deletion of this catalogue listing?')) return;
    try {
      const res = await fetch(`/api/vendor/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotif('Product deleted from schema successfully.');
        fetchCatalog();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEditProduct = (p: any) => {
    if (p.disabledByAdmin) {
      setNotif('This product has been disabled by the administrator and cannot be modified.');
      return;
    }
    setEditorProduct(p);
    setProdName(p.name);
    setProdPrice(p.price.toString());
    setProdStock(p.stock.toString());
    setProdDesc(p.description);
    setProdCategory(p.category);
    setProdBrand(p.brand);
    setProdImageUrl(p.images?.[0] || '');
    setExtraImages(p.images || []);
    setProdVideo(p.video || '');
    setActiveTab('catalog');
  };

  const updateOrderStatus = async (id: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setNotif(`Order status updated to ${nextStatus === 'delivered' ? 'DELIVERED' : nextStatus.toUpperCase()} successfully!`);
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Dispatch QR Scanner State
  const [vendorScannerMode, setVendorScannerMode] = useState<'idle' | 'camera' | 'simulate'>('idle');
  const [vendorSelectedOrder, setVendorSelectedOrder] = useState<any | null>(null);
  const [vendorScanError, setVendorScanError] = useState<string | null>(null);
  const [vendorScanSuccess, setVendorScanSuccess] = useState<string | null>(null);
  const [vendorQrCodeScannerInstance, setVendorQrCodeScannerInstance] = useState<Html5Qrcode | null>(null);

  const startVendorCameraScanner = async () => {
    setVendorScanError(null);
    setVendorScanSuccess(null);
    setVendorScannerMode('camera');

    setTimeout(async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const qrInstance = new Html5Qrcode("vendor-reader-element");
          setVendorQrCodeScannerInstance(qrInstance);

          await qrInstance.start(
            devices[0].id,
            {
              fps: 10,
              qrbox: { width: 220, height: 220 }
            },
            async (decodedText) => {
              setVendorScanSuccess(`Detected QR content successfully!`);
              const ok = await executeVendorQrScan(decodedText);
              if (ok) {
                qrInstance.stop();
              }
            },
            (err) => {}
          );
        } else {
          setVendorScanError("No compatible video capture hardware detected.");
        }
      } catch (e: any) {
        setVendorScanError(`Camera permission restricted: ${e.message || e}`);
      }
    }, 200);
  };

  const stopVendorCameraScanner = async () => {
    if (vendorQrCodeScannerInstance && vendorQrCodeScannerInstance.isScanning) {
      try {
        await vendorQrCodeScannerInstance.stop();
      } catch (e) {
        console.error(e);
      }
    }
    setVendorScannerMode('idle');
  };

  const executeVendorQrScan = async (payloadStr: string) => {
    setLoading(true);
    setNotif(null);
    try {
      const res = await fetch('/api/shipments/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          qrPayload: payloadStr,
          scan_location: 'Merchant Warehouse Facility (Coimbatore)'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNotif(`Dispatch scanned successfully! Shipment waybill status set to: ${data.shipment.shipment_status.toUpperCase()}`);
        setVendorScannerMode('idle');
        setVendorSelectedOrder(null);
        fetchOrders();
        return true;
      } else {
        setNotif(`Scan failed: ${data.error || 'Identity rejection or order state mismatch.'}`);
        return false;
      }
    } catch (e) {
      setNotif('Failed to connect to dispatch core.');
      return false;
    } finally {
      setLoading(false);
    }
  };



  return (
    <div id="vendor-gate" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Merchant banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-linear-to-r from-indigo-900 to-purple-950 text-white p-6 rounded-2xl shadow-xl mb-8 border border-slate-800">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest font-semibold bg-violet-500/20 text-violet-300 px-3 py-1 rounded-full border border-violet-500/30">
            {vendorRequest?.status === 'approved' ? 'Active Corporate Merchant' : 'Merchant Auditing Tunnel'}
          </span>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white mt-2">
            Welcome to the Merchant Network
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Storefront tenancy: <span className="text-white font-mono font-bold bg-slate-900 px-2 py-0.5 rounded-md">{vendorRequest?.storeName || 'Registering'}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="cursor-pointer text-xs font-semibold bg-slate-800 hover:bg-slate-700 py-2 px-4 rounded-xl transition-all border border-slate-700"
        >
          Portal Lock
        </button>
      </div>

      {notif && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold flex justify-between items-center">
          <span>{notif}</span>
          <button type="button" onClick={() => setNotif(null)} className="cursor-pointer text-[10px] text-emerald-600 bg-white border py-0.5 px-2 rounded-md">
            Clear
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Navigation sidebar - Always present! */}
        <div className="lg:w-1/4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              if (onNavigateTo) onNavigateTo('home');
            }}
            className="flex items-center w-full px-4 py-3.5 text-xs font-bold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all gap-2 border border-slate-200 cursor-pointer"
          >
            <Home className="h-4 w-4 text-slate-500" />
            <span>Storefront Portal</span>
          </button>
          
          <div className="h-px bg-gray-200 my-1"></div>

          <button
            type="button"
            onClick={() => setActiveTab('storefront')}
            className={`cursor-pointer w-full text-left p-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${activeTab === 'storefront' ? 'bg-violet-600 text-white shadow-md' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200/60'}`}
          >
            <span className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Storefront Hub
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('onboarding')}
            className={`cursor-pointer w-full text-left p-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'onboarding' ? 'bg-violet-600 text-white shadow-md' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200/60'}`}
          >
            <FileText className="h-4 w-4" />
            Complete Company Profile
          </button>

          {vendorRequest?.status === 'approved' ? (
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`cursor-pointer w-full text-left p-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${activeTab === 'catalog' ? 'bg-violet-600 text-white shadow-md' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200/60'}`}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Manage Products
              </span>
              <span className="bg-slate-900/10 text-[10px] font-mono py-0.5 px-2 rounded-full text-violet-750 font-bold">
                {products.length}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setNotif("Manage Products is locked. Please submit your company profile and wait for admin approval.")}
              className="w-full text-left p-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between bg-gray-50 text-gray-400 border border-gray-150 cursor-not-allowed"
              title="Unlock by getting admin approval"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-gray-300" />
                <span className="line-through">Manage Products</span>
                <span className="text-[10px] bg-red-50 text-red-650 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-0.5 shrink-0 ml-1">
                  Locked 🔒
                </span>
              </span>
            </button>
          )}

          {vendorRequest?.status === 'approved' && (
            <button
              type="button"
              onClick={() => {
                fetchOrders();
                setActiveTab('orders');
              }}
              className={`cursor-pointer w-full text-left p-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${activeTab === 'orders' ? 'bg-violet-600 text-white shadow-md' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200/60'}`}
            >
              <span className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Fulfillment Queue
              </span>
              <span className="bg-slate-900/10 text-[10px] font-mono py-0.5 px-2 rounded-full text-violet-750 font-bold">
                {orders.length}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`cursor-pointer w-full text-left p-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'bg-violet-600 text-white shadow-md' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200/60'}`}
          >
            <Settings className="h-4 w-4" />
            Security & Profile Settings
          </button>
        </div>

        {/* Dynamic workspace panels */}
        <div className="lg:w-3/4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            
            {/* TAB: Storefront Hub */}
            {activeTab === 'storefront' && (
              <div id="vendor-storefront-hub" className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold font-display text-gray-800">Storefront Hub</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Database links, statistics summaries, and operational status of your digital Bazaar tenancy.
                  </p>
                </div>

                {vendorRequest?.status !== 'approved' ? (
                  <div className="p-5 border border-amber-200 bg-amber-50/50 rounded-2xl space-y-3.5 animate-fadeIn">
                    <div className="flex items-center gap-2.5 text-amber-850">
                      <Info className="h-5 w-5 shrink-0 text-amber-500" />
                      <h4 className="font-bold text-sm">Legal Authentication Pending</h4>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed font-sans">
                      Welcome to Bazaar Vendor Suite! Your storefront tenancy is currently under legal verification audits. Submit your corporate taxation GSTIN, business maps, and licensing proofs in the <span className="font-bold underline cursor-pointer hover:text-violet-750" onClick={() => setActiveTab('onboarding')}>Complete Company Profile</span> page to unlock listing published tools.
                    </p>
                    
                    {/* Onboarding step list roadmap */}
                    <div className="pt-2">
                      <span className="block text-[10px] font-bold uppercase text-amber-700 tracking-wider mb-2">Onboarding Roadmap</span>
                      <div className="grid grid-cols-3 gap-2.5 text-[9px] font-mono font-bold uppercase tracking-widest text-center">
                        <div className="p-2 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-250">1. Credentials ✓</div>
                        <div className="p-2 bg-amber-100 text-amber-800 rounded-md border border-amber-250 animate-pulse">2. Audit Review</div>
                        <div className="p-2 bg-gray-100 text-gray-400 rounded-md border">3. Marketplace Live</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
                      <div className="h-7 w-7 rounded-sm bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        ✓
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-emerald-800 leading-tight">Corporate Store Authorized</h5>
                        <p className="text-[10px] text-emerald-600 mt-0.5 font-sans">GST tax mappings validated. Your products are currently active in the market!</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-violet-50/50 p-4 rounded-xl border border-violet-100 gap-3">
                      <div>
                        <h5 className="font-bold text-xs text-violet-850">Your Live Shop</h5>
                        <p className="text-[10px] text-violet-600 mt-0.5 font-sans">View your approved digital marketplace storefront as customers see it.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateTo) onNavigateTo('shop');
                        }}
                        className="cursor-pointer bg-violet-600 hover:bg-violet-750 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 active:scale-95 animate-fadeIn"
                      >
                        <span>Open Storefront Portal</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-gray-50 rounded-xl border text-slate-800">
                        <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Products</span>
                        <span className="text-2xl font-bold mt-1 block text-indigo-700 font-mono">{products.length}</span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl border text-slate-800">
                        <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Orders</span>
                        <span className="text-2xl font-bold mt-1 block text-indigo-700 font-mono">
                          {orders.filter(o => o.orderStatus !== 'shipped' && o.orderStatus !== 'cancelled').length}
                        </span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl border text-slate-800">
                        <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fulfillments</span>
                        <span className="text-2xl font-bold mt-1 block text-emerald-600 font-mono">
                          {orders.filter(o => o.orderStatus === 'shipped').length}
                        </span>
                      </div>
                    </div>

                    {/* Vendor Analytics Chart Block */}
                    {analytics && analytics.salesByDay && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        {/* Revenue Trend Line Chart */}
                        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden p-6">
                          <div className="flex justify-between items-center mb-6">
                            <div>
                              <h4 className="text-sm font-bold font-display text-gray-800 uppercase tracking-wider">
                                Daily Revenue (Last 7 Days)
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">Your store's aggregate sales performance.</p>
                            </div>
                          </div>
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={analytics.salesByDay} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                                <RechartsTooltip 
                                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                  labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}
                                />
                                <Line type="monotone" dataKey="amount" name="Revenue" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Top Products Bar Chart */}
                        {analytics.topProducts && analytics.topProducts.length > 0 && (
                          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden p-6">
                            <div className="flex justify-between items-center mb-6">
                              <div>
                                <h4 className="text-sm font-bold font-display text-gray-800 uppercase tracking-wider">
                                  Top Selling Products
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">Your highest volume inventory items.</p>
                              </div>
                            </div>
                            <div className="h-64 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.topProducts} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(val) => val.substring(0, 10) + '...'} />
                                  <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                  <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                  />
                                  <Bar dataKey="sales" name="Units Sold" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Complete Company Profile */}
            {activeTab === 'onboarding' && (
              <div id="vendor-onboarding" className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold font-display text-gray-800">Complete Company Profile</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage legally registered company details, GST tax parameters, licensed shop addresses, and exact geolocator pins.
                  </p>
                </div>

                {vendorRequest?.status === 'approved' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-250 flex items-center gap-3">
                      <div className="h-7 w-7 rounded-sm bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                        ✓
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-emerald-800 leading-tight">Approved Corporate Merchant</h5>
                        <p className="text-[10px] text-emerald-600 mt-0.5 font-sans">Identity mappings and physical shop addresses verified successfully.</p>
                      </div>
                    </div>

                    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-xs font-mono border p-5 rounded-2xl bg-gray-50">
                      <div>
                        <dt className="text-gray-400 font-semibold mb-1">Company Legal Representation</dt>
                        <dd className="text-gray-800 font-bold text-sm font-sans">{vendorRequest.legalName}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-400 font-semibold mb-1">Business Category</dt>
                        <dd className="text-gray-800 text-sm font-bold capitalize">{vendorRequest.businessCategory?.replace(/-/g, ' ') || 'Uncategorized'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-400 font-semibold mb-1">GST Tax Identifiers</dt>
                        <dd className="text-gray-800 text-sm font-bold">{vendorRequest.gstNumber}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-400 font-semibold mb-1 font-sans font-mono tracking-wider text-[10px] uppercase">Registered Address</dt>
                        <dd className="text-gray-800 font-bold font-sans">{vendorRequest.address}, {vendorRequest.district}, {vendorRequest.state}, PIN: {vendorRequest.pincode}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-400 font-semibold mb-1 font-sans font-mono tracking-wider text-[10px] uppercase">Exact Coordinates</dt>
                        <dd className="text-indigo-750 font-bold font-mono">Lat: {vendorRequest.latitude?.toFixed(4) || '0.0000'}, Long: {vendorRequest.longitude?.toFixed(4) || '0.0000'}</dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <form onSubmit={submitProfileVerification} className="space-y-4 border p-6 rounded-2xl bg-gray-50 font-sans">
                    <span className="font-bold text-xs uppercase text-indigo-750 block border-b pb-2">Onboarding Verification Matrix</span>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Display Store Name</label>
                        <input
                          type="text"
                          required
                          value={storeName}
                          onChange={e => setStoreName(e.target.value)}
                          className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Legally Registered Company Name</label>
                        <input
                          type="text"
                          required
                          value={legalName}
                          onChange={e => setLegalName(e.target.value)}
                          className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Store / Business Description</label>
                      <textarea
                        required
                        rows={2}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full bg-white p-2.5 text-xs rounded-xl border focus:border-violet-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Business Category</label>
                      <select
                        required
                        value={businessCategory}
                        onChange={e => setBusinessCategory(e.target.value)}
                        className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none"
                      >
                        <option value="">Select a Category</option>
                        {categoriesList.map((c: any) => (
                          <option key={c.id} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Company Registration No.</label>
                        <input
                          type="text"
                          required
                          value={regNumber}
                          onChange={e => setRegNumber(e.target.value)}
                          className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">GST Tax Identifier (Optional)</label>
                        <input
                          type="text"
                          value={gstNumber}
                          onChange={e => setGSTNumber(e.target.value)}
                          className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none font-mono uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Business Phone Number</label>
                        <input
                          type="text"
                          required
                          value={businessPhone}
                          onChange={e => setBusinessPhone(e.target.value)}
                          className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200/60 pt-4">
                      <span className="block text-[10px] font-bold uppercase text-gray-450 tracking-wider mb-2">Location & Maps Grounding</span>
                      <MapPicker onLocationSelected={handleMapLocationSelected} />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Registered Address / Shop Street Details</label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">District</label>
                        <input
                          type="text"
                          required
                          value={district}
                          onChange={e => setDistrict(e.target.value)}
                          className="w-full bg-gray-100 px-3 py-2 text-xs rounded-xl border outline-none font-semibold text-gray-650"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">State</label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={e => setState(e.target.value)}
                          className="w-full bg-gray-100 px-3 py-2 text-xs rounded-xl border outline-none font-semibold text-gray-650"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Pincode</label>
                        <input
                          type="text"
                          required
                          value={pincode}
                          onChange={e => setPincode(e.target.value)}
                          className="w-full bg-white px-3 py-2 text-xs rounded-xl border outline-none focus:border-violet-500 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200/60 pt-4 mb-4">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Extra Details</label>
                      <textarea
                        rows={2}
                        value={additionalDetails}
                        onChange={e => setAdditionalDetails(e.target.value)}
                        className="w-full bg-white p-2.5 text-xs rounded-xl border focus:border-violet-500 outline-none"
                      />
                    </div>

                    {/* License documentation uploading - behave exactly like the drag-drop simulated loader in the video */}
                    <div className="border-t border-gray-200/60 pt-4">
                      <span className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-2">Required Corporate Documentation</span>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center bg-white cursor-pointer hover:border-violet-500 transition-colors relative">
                        <input
                          type="file"
                          onChange={handleDocumentChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept="image/*,.pdf"
                        />
                        {uploadingDoc ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-2">
                            <Loader2 className="h-6 w-6 text-violet-600 animate-spin" />
                            <p className="text-xs font-semibold text-violet-700">Simulating Document Upload...</p>
                          </div>
                        ) : docFileName ? (
                          <div className="flex flex-col items-center justify-center gap-1.5 py-1 text-emerald-600">
                            <Check className="h-6 w-6 bg-emerald-100 p-1 rounded-full text-emerald-700" />
                            <p className="text-xs font-bold font-mono">Successfully Loaded: {docFileName}</p>
                            <p className="text-[10px] text-gray-400">Click or Drag additional documents to replace.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 text-gray-500 py-2">
                            <Upload className="h-6 w-6 text-gray-400" />
                            <p className="text-xs font-bold leading-tight">Click to Browse Corporate Docs</p>
                            <p className="text-[10px] text-gray-400">Support formats: PNG, JPG, JPEG, PDF up to 10MB</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || uploadingDoc}
                      className="cursor-pointer w-full bg-violet-600 hover:bg-violet-750 disabled:opacity-50 text-white font-bold py-3 rounded-xl block text-center transition-all text-sm mt-3"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'SUBMIT APPLICATION'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB: Security Settings */}
            {activeTab === 'profile' && (
              <div id="vendor-profile-security" className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold font-display text-gray-800">
                    Security & Profile Settings
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 font-sans">
                    Change your display identity, registered email, or security passwords. Real-time encryption is applied on save.
                  </p>
                </div>

                {profileError && (
                  <div className="p-3 text-xs font-semibold bg-red-50 text-red-600 rounded-xl border border-red-150 font-mono">
                    {profileError}
                  </div>
                )}

                {profileNotif && (
                  <div className="p-3 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-150 font-mono">
                    {profileNotif}
                  </div>
                )}

                <form onSubmit={submitProfileUpdate} className="space-y-4 max-w-md border p-5 rounded-2xl bg-gray-50 font-sans">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Full Merchant Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none"
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

                  <div className="pt-2 border-t border-gray-200/60">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2.5 font-mono">Passkey Update (Optional)</span>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">New Security Password</label>
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
                    className="cursor-pointer w-full bg-violet-600 hover:bg-violet-750 text-white font-bold py-2.5 rounded-xl text-center text-xs transition-colors flex justify-center items-center gap-2"
                  >
                    {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Secure Framework Updates'}
                  </button>
                </form>
              </div>
            )}

            {/* TAB: Inventory Publishing workspace */}
            {activeTab === 'catalog' && vendorRequest?.status === 'approved' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold font-display text-gray-800">
                    Inventory Publishing Workspace
                  </h3>
                  {editorProduct && (
                    <button
                      type="button"
                      onClick={() => setEditorProduct(null)}
                      className="cursor-pointer text-xs font-bold text-gray-500 underline"
                    >
                      Reset Workspace
                    </button>
                  )}
                </div>

                <form onSubmit={saveProductCatalog} className="space-y-4 p-4 bg-gray-50 rounded-2xl border">
                  <span className="font-bold text-xs uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    {editorProduct ? 'Modify Catalog Item' : 'Publish Catalogue Product'}
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">Product Title</label>
                      <input
                        type="text"
                        required
                        value={prodName}
                        onChange={e => setProdName(e.target.value)}
                        placeholder="e.g. Traditional Silk Saree"
                        className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">Category Taxonomy</label>
                      <select
                        value={prodCategory}
                        onChange={e => setProdCategory(e.target.value)}
                        className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none"
                      >
                        <option value="">Select a Category</option>
                        {categoriesList.map((c: any) => (
                          <option key={c.id} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">Market Price (INR)</label>
                      <input
                        type="number"
                        required
                        value={prodPrice}
                        onChange={e => setProdPrice(e.target.value)}
                        placeholder="₹"
                        className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none font-semibold text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">Available Units / Stock</label>
                      <input
                        type="number"
                        required
                        value={prodStock}
                        onChange={e => setProdStock(e.target.value)}
                        placeholder="units count"
                        className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">Brand Mapping</label>
                      <input
                        type="text"
                        required
                        value={prodBrand}
                        onChange={e => setProdBrand(e.target.value)}
                        placeholder="e.g. Tata Consumer"
                        className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">Visual Primary Image</label>
                    {prodImageUrl && (
                      <div className="mb-2">
                        <img src={prodImageUrl} alt="Product Preview" className="h-16 w-16 object-cover rounded border border-gray-300" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const dataUrl = reader.result as string;
                            setProdImageUrl(dataUrl);
                            setExtraImages(prev => {
                              if (!prev.includes(dataUrl)) {
                                return [dataUrl, ...prev];
                              }
                              return prev;
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">More Images (Optional)</label>
                      {extraImages.length > 0 && (
                        <div className="flex gap-1.5 mb-2 overflow-x-auto py-1">
                          {extraImages.map((img, i) => {
                            const isPrimary = img === prodImageUrl;
                            return (
                              <div 
                                key={i} 
                                onClick={() => setProdImageUrl(img)}
                                className={`relative shrink-0 cursor-pointer group/thumb rounded border ${isPrimary ? 'border-violet-650 ring-2 ring-violet-500/20' : 'border-gray-200 hover:border-violet-300'}`}
                                title={isPrimary ? "Primary Image" : "Click to set as Primary Image"}
                              >
                                <img src={img} alt={`Preview ${i}`} className="h-12 w-12 object-cover rounded" />
                                {isPrimary ? (
                                  <span className="absolute bottom-0 inset-x-0 bg-violet-600 text-white font-mono text-[7px] text-center font-bold uppercase py-0.5 rounded-b select-none">
                                    Primary
                                  </span>
                                ) : (
                                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white font-mono text-[6px] text-center font-bold uppercase py-0.5 rounded-b opacity-0 group-hover/thumb:opacity-100 transition-opacity select-none">
                                    Make Primary
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExtraImages(prev => prev.filter((_, idx) => idx !== i));
                                    if (isPrimary) {
                                      setProdImageUrl('');
                                    }
                                  }}
                                  className="absolute -top-1 -right-1 bg-red-650 text-white rounded-full text-[8px] h-3.5 w-3.5 flex items-center justify-center cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []) as File[];
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const dataUrl = reader.result as string;
                              setExtraImages(prev => {
                                const next = prev.includes(dataUrl) ? prev : [...prev, dataUrl];
                                if (!prodImageUrl && next.length > 0) {
                                  setProdImageUrl(next[0]);
                                }
                                return next;
                              });
                            };
                            reader.readAsDataURL(file);
                          });
                        }}
                        className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">Product Video Option (Optional)</label>
                      {prodVideo && (
                        <div className="mb-2 relative max-w-[120px]">
                          <video src={prodVideo} controls className="h-12 w-full object-cover rounded border" />
                          <button
                            type="button"
                            onClick={() => setProdVideo('')}
                            className="absolute -top-1 -right-1 bg-red-650 text-white rounded-full text-[8px] h-3.5 w-3.5 flex items-center justify-center cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 8 * 1024 * 1024) {
                              setNotif("Video size is too large. Please upload a video under 8MB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setProdVideo(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full bg-white px-3 py-2 text-xs rounded-xl border focus:border-violet-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1">Product Description</label>
                    <textarea
                      rows={2}
                      value={prodDesc}
                      onChange={e => setProdDesc(e.target.value)}
                      placeholder="Explain features, textile thread specs, organic certifications..."
                      className="w-full bg-white p-2.5 text-xs rounded-xl border focus:border-violet-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="cursor-pointer bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-transform active:scale-95"
                  >
                    Publish to Public Marketplace Catalog
                  </button>
                </form>

                {/* Published List */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h4 className="font-bold text-xs uppercase text-gray-400 tracking-widest">Published Schema Catalog Inventory</h4>
                  {products.length === 0 ? (
                    <p className="text-xs text-gray-500 font-mono italic">No published products mapped inside this tenancy space yet.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      {products.map((p) => {
                        const isDisabled = p.disabledByAdmin;
                        return (
                          <div 
                            key={p.id} 
                            className={`p-3 border rounded-xl flex gap-3 shadow-xs transition-all ${
                              isDisabled 
                                ? 'border-red-200 bg-red-50/5 opacity-65' 
                                : 'border-gray-150 bg-white'
                            }`}
                          >
                            <img src={p.images[0]} alt={p.name} className="h-14 w-14 rounded-lg object-cover bg-gray-50 border shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <h5 className={`font-bold text-sm truncate ${isDisabled ? 'text-slate-500 line-through' : 'text-gray-800'}`}>
                                  {p.name}
                                </h5>
                                {isDisabled && (
                                  <span className="shrink-0 bg-red-50 text-red-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-red-150 font-mono tracking-tight uppercase">
                                    DISABLED BY ADMIN
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5 uppercase tracking-wider">{p.category} | {p.brand}</p>
                              <p className="text-xs font-bold text-indigo-750 mt-1">₹{p.price.toLocaleString('en-IN')} <span className="text-gray-400 font-normal font-mono text-[10px]">({p.stock} units)</span></p>
                              
                              <div className="flex gap-2.5 mt-2 pt-1 border-t border-gray-150/60 text-[10px] font-bold">
                                <button 
                                  type="button" 
                                  onClick={() => handleOpenEditProduct(p)} 
                                  disabled={isDisabled}
                                  className={`cursor-pointer ${isDisabled ? 'text-gray-400 cursor-not-allowed opacity-50' : 'text-violet-700'}`}
                                >
                                  Edit
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => triggerDeleteProduct(p.id)} 
                                  disabled={isDisabled}
                                  className={`cursor-pointer ${isDisabled ? 'text-gray-400 cursor-not-allowed opacity-50' : 'text-red-650'}`}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB: Order Fulfill Tracking Tracking */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                
                {/* Dispatch Scanner Terminal section for vendor */}
                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 shadow-lg space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h4 className="text-sm font-black font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <QrCode className="h-4 w-4" />
                        Outbound Dispatch Scanner
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Scan order waybills to change status to <span className="text-white font-bold">SHIPPED</span> and trigger global logistics notifications.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startVendorCameraScanner}
                        className="cursor-pointer text-[10px] font-bold bg-indigo-650 hover:bg-indigo-600 border border-indigo-700 rounded-xl px-3 py-2 transition-colors flex items-center gap-1"
                      >
                        <QrCode className="h-3 w-3" />
                        Camera Scanner
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVendorScannerMode('simulate');
                          // default selection to any pending/processing order if exists
                          const pendingOrd = orders.find(o => o.orderStatus === 'pending' || o.orderStatus === 'processing');
                          setVendorSelectedOrder(pendingOrd || orders[0] || null);
                        }}
                        className="cursor-pointer text-[10px] font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-3 py-2 transition-colors"
                      >
                        Scanner Simulator
                      </button>
                    </div>
                  </div>

                  {vendorScannerMode === 'camera' && (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 animate-zoom-in">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-teal-400 font-bold font-mono">MERCHANT SCANNER ONLINE</span>
                        <button type="button" onClick={stopVendorCameraScanner} className="cursor-pointer text-red-400 font-bold px-2 py-0.5 bg-red-950/40 border border-red-900/30 rounded-md">
                          Close
                        </button>
                      </div>
                      <div id="vendor-reader-element" className="w-full aspect-square max-w-[280px] mx-auto bg-slate-900 rounded-xl overflow-hidden border border-slate-800" />
                      {vendorScanError && (
                        <p className="text-[11px] text-red-400 p-2 bg-red-950/20 border border-red-900/30 rounded-md font-mono flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {vendorScanError}
                        </p>
                      )}
                    </div>
                  )}

                  {vendorScannerMode === 'simulate' && (
                    <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl space-y-4 text-xs animate-fade-in max-w-md mx-auto">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-mono text-violet-400 font-bold uppercase">Simulation Sensor Target</span>
                        <button type="button" onClick={() => setVendorScannerMode('idle')} className="cursor-pointer text-slate-500 hover:text-white uppercase font-mono">CLOSE</button>
                      </div>

                      {vendorSelectedOrder ? (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select Waybill to scan:</label>
                            <select
                              value={vendorSelectedOrder.id}
                              onChange={(e) => {
                                const target = orders.find(o => o.id === e.target.value);
                                setVendorSelectedOrder(target || null);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 font-mono outline-none"
                            >
                              {orders.map(o => (
                                <option key={o.id} value={o.id}>Order Ref: {o.id} ({o.orderStatus})</option>
                              ))}
                            </select>
                          </div>

                          <div className="aspect-square max-w-[190px] mx-auto bg-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-800 p-4">
                            <div className="absolute left-0 right-0 h-0.5 bg-red-500 animate-bounce shadow-md shadow-red-500/50" />
                            <img
                              src={vendorSelectedOrder.shippingQrCode}
                              alt="shipment barcode qr"
                              className="h-28 w-28 bg-white p-1.5 rounded-lg object-contain relative z-10 shrink-0"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const payload = {
                                orderId: vendorSelectedOrder.id,
                                trackingNumber: vendorSelectedOrder.trackingNumber || '',
                                currentStatus: vendorSelectedOrder.orderStatus,
                                timestamp: new Date().toISOString()
                              };
                              executeVendorQrScan(JSON.stringify(payload));
                            }}
                            disabled={loading}
                            className="cursor-pointer w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl transition-all flex justify-center items-center gap-1.5 shadow-md shadow-emerald-700/20"
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Scan & Sign Parcel Dispatch</>}
                          </button>
                        </div>
                      ) : (
                        <p className="text-center italic text-slate-500 text-[11px] py-4">No active orders available to simulate scans.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-black font-display text-gray-850">
                    Received Orders Shipment Queue
                  </h3>
                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border border-emerald-200 tracking-wider flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    ACTIVE TRACKING
                  </span>
                </div>

                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <p className="text-xs text-gray-500 font-mono italic">No active buyer orders mapped inside your storefront queues.</p>
                  ) : (
                    orders.map((o) => (
                      <div key={o.id} className="p-5 bg-white border border-gray-250 rounded-2xl flex flex-col lg:flex-row gap-5 justify-between items-start lg:items-center shadow-xs hover:shadow transition-all text-xs">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-mono font-black text-indigo-750 text-sm">Ref. {o.id}</p>
                            <span className="inline-block bg-gray-100 border text-gray-600 font-black px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-mono">
                              {o.paymentMethod === 'cod' ? 'CASH ON DELIVERY' : o.paymentMethod === 'upi' ? 'UPI' : 'DEBIT/CREDIT CARD'}
                            </span>
                            <span className="capitalize text-[10px] bg-slate-900 border text-slate-200 py-0.5 px-2.5 rounded-full font-extrabold uppercase font-mono">
                              {o.orderStatus.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="grid sm:grid-cols-2 gap-4 pt-1 font-mono text-[11px] leading-relaxed">
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-gray-400 font-sans uppercase tracking-wider">CLIENT DETAILS</p>
                              <p className="font-sans font-bold text-gray-855 leading-tight">{o.deliveryAddress?.fullName || o.customerName || 'Tharun R'}</p>
                              <p className="text-gray-500 font-sans">{o.deliveryAddress?.addressLine || 'aabxahai, coimbatore'}</p>
                              <p className="text-gray-405 font-sans">{o.deliveryAddress?.district || 'coimbatore'}, {o.deliveryAddress?.state || 'Tamil Nadu'}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-gray-400 font-sans uppercase tracking-wider">VENDOR EARNINGS</p>
                              <p className="text-base font-black text-gray-800">₹{(o.totalAmount - (o.shippingFee || 0)).toLocaleString('en-IN')}</p>
                              {(o.shippingFee || 0) > 0 && (
                                <p className="text-[10px] text-violet-600 font-bold">+ ₹{o.shippingFee} Shipping Charge</p>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-[9px] text-gray-400 font-sans italic">Order Date: {new Date(o.createdAt).toLocaleString('en-IN')}</p>
                        </div>

                        {/* Shipment dropdown action & Invoice renderer matches video */}
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          <div className="space-y-1">
                            <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest font-sans">SHIPMENT ACTIONS</span>
                            <select
                              value={o.orderStatus === 'confirmed' ? 'pending' : o.orderStatus}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                await updateOrderStatus(o.id, newStatus);
                              }}
                              className="bg-white border hover:bg-gray-50 text-gray-800 text-[11px] font-bold rounded-xl px-3 py-2.5 outline-none focus:border-violet-500 cursor-pointer min-w-[170px]"
                            >
                              <option value="pending">Pending Preparation</option>
                              <option value="processing">Order Processing</option>
                              <option value="shipped">Package Shipped</option>
                              <option value="delivered">Delivered Out</option>
                            </select>

                            {o.orderStatus !== 'delivered' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  setLoading(true);
                                  setNotif(null);
                                  try {
                                    const baseRes = await fetch(`/api/orders/${o.id}/status`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                      },
                                      body: JSON.stringify({ status: 'shipped' })
                                    });
                                    if (baseRes.ok) {
                                      const finalRes = await fetch(`/api/orders/${o.id}/status`, {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({ status: 'delivered' })
                                      });
                                      if (finalRes.ok) {
                                        setNotif(`Auto-delivered! Order ${o.id} dispatched and marked delivered automatically.`);
                                        fetchOrders();
                                      }
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                className="cursor-pointer bg-linear-to-r from-violet-605 to-indigo-700 hover:opacity-90 text-white font-extrabold py-2 px-3 rounded-xl flex items-center justify-center gap-1 mt-2.5 w-full text-[10.5px] transition-all select-none border border-violet-750/30 shadow-xs"
                                title="Instantly dispatch and auto-deliver this shipment immediately"
                              >
                                <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                                Instant Ship & Deliver
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveInvoice(o)}
                            className="cursor-pointer bg-gray-50 hover:bg-gray-100 text-gray-650 border border-gray-250 py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1 font-bold mt-3.5 block transition-colors select-none"
                            title="Print Paper Invoice"
                          >
                            <FileText className="h-4 w-4" />
                            Render Invoice
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Simulated printable PDF Invoice renderer modal */}
                {activeInvoice && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-250 flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl border flex flex-col p-6 animate-zoom-in">
                      <div className="flex justify-between items-start border-b border-gray-150 pb-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold select-none text-sm">O</div>
                            <span className="font-bold text-gray-800 tracking-tight text-sm font-display">OmniBazaar Invoice</span>
                          </div>
                          <p className="text-[9px] text-gray-405 font-semibold font-mono mt-1">Invoice Mappings Code: {activeInvoice.invoiceId}</p>
                        </div>
                        <button type="button" onClick={() => setActiveInvoice(null)} className="cursor-pointer p-1 rounded-lg text-gray-400 hover:text-gray-850 bg-gray-50 border">Close</button>
                      </div>

                      <div className="space-y-4 text-[11px] py-4 leading-relaxed font-mono">
                        <div className="grid grid-cols-2 gap-4 pb-2 border-b border-dashed">
                          <div>
                            <span className="font-bold text-gray-400 block mb-1">WAYBILL / TRACKING NO</span>
                            <p className="font-sans font-bold text-gray-700">{activeInvoice.trackingNumber || activeInvoice.id}</p>
                            <span className="font-bold text-gray-400 block mb-1 mt-2">SHIPMENT STATUS</span>
                            <span className="capitalize text-[10px] bg-slate-900 border text-slate-200 py-0.5 px-2 rounded-md font-bold uppercase font-mono inline-block">
                              {activeInvoice.orderStatus.replace('_', ' ')}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 block mb-1">PLACED DATE</span>
                            <p className="text-gray-650">{new Date(activeInvoice.createdAt).toLocaleDateString('en-IN')}</p>
                            <span className="font-bold text-gray-400 block mb-1 mt-2">PAYMENT MODE</span>
                            <p className="text-gray-650 uppercase font-bold">{activeInvoice.paymentMethod}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pb-2 border-b border-dashed font-sans">
                          <div>
                            <span className="font-bold text-gray-450 block text-[9px] font-mono">SHIPMENT MERCHANT</span>
                            <p className="font-bold text-gray-800">{activeInvoice.vendorStoreName}</p>
                            <p className="text-gray-400 text-[10px]">OmniBazaar Authorized Vendor</p>
                          </div>
                          <div>
                            <span className="font-bold text-gray-450 block text-[9px] font-mono">CONSIGNEE CUSTOMER</span>
                            <p className="font-bold text-gray-800">{activeInvoice.customerName}</p>
                            <p className="text-gray-500 text-[10px] leading-tight">{activeInvoice.deliveryAddress?.addressLine} - {activeInvoice.deliveryAddress?.pincode}</p>
                          </div>
                        </div>

                        <div>
                          <span className="font-bold text-gray-400 block mb-2">CONSOLIDATED ITEMS MANIFEST</span>
                          <table className="w-full text-left bg-gray-50 text-[10px]">
                            <thead>
                              <tr className="border-b">
                                <th className="p-1.5">Description</th>
                                <th className="p-1.5 text-right font-semibold">Qty</th>
                                <th className="p-1.5 text-right font-semibold">Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeInvoice.items.map((i: any, index: number) => (
                                <tr key={index} className="border-b font-sans">
                                  <td className="p-1.5 text-gray-800 leading-tight">{i.name}</td>
                                  <td className="p-1.5 text-right font-mono font-bold text-gray-700">{i.quantity}</td>
                                  <td className="p-1.5 text-right font-mono font-bold text-gray-700 font-sans">₹{i.price.toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                              <tr className="border-t border-double font-bold bg-violet-50/50">
                                <td colSpan={2} className="p-2 text-right text-violet-850">AGGREGATE CHARGES:</td>
                                <td className="p-2 text-right text-violet-850 text-xs">₹{activeInvoice.totalAmount.toLocaleString('en-IN')}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-150/80">
                          <div>
                            <span className="font-bold text-gray-400 block mb-1 uppercase tracking-wider text-[9px]">Transit QR Stamp</span>
                            <p className="text-[9px] text-gray-500 max-w-[210px] font-sans">Parcel scanner tracks change state back to dispatched.</p>
                          </div>
                          <img src={activeInvoice.shippingQrCode} alt="logistic tracking" className="h-16 w-16 bg-white p-1 rounded-md border shrink-0" />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="cursor-pointer bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs text-center transition-all"
                      >
                        Print Paper Invoice PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    );
}
