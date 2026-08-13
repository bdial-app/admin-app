import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star, MapPin, Phone, Clock, Package,
  MessageSquare, Camera, Shield, AlertTriangle,
  CheckCircle2, XCircle, Users, Eye, BarChart3, Gift, Trash2,
  Pencil, X, Globe, Store, Save, Loader2, ShieldAlert, ImagePlus,
  Tags, Search, ChevronRight, CheckCircle,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DetailPanel } from '../components/ui/DetailPanel';
import { SearchableCategoryPicker } from '../components/ui/SearchableCategoryPicker';
import { PhoneOtpVerifier } from '../components/ui/PhoneOtpVerifier';
import {
  useProvider, useApproveProvider, useSuspendProvider,
  useUnsuspendProvider, useProviderWarnings, useUpdateProvider,
  useUpdateContactNumber, useUpdateProviderImages, useUpdateProviderCategories,
} from '../hooks/useProviders';
import { useCategoryTree } from '../hooks/useCategories';
import IconByName from '../components/IconByName';
import { GRADIENT_PALETTE } from '../components/ColorPicker';
import { useProducts, useUpdateProduct, useDeleteProduct } from '../hooks/useProducts';
import { useReviews } from '../hooks/useReviews';
import { useOffers } from '../hooks/useOffers';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Product, ProviderOffer } from '../types';

type Tab = 'overview' | 'products' | 'reviews' | 'photos' | 'verification' | 'activity' | 'analytics' | 'deals';
type EditingSection = 'business' | 'contact' | 'location' | 'social' | 'categories' | null;
type BrandAsset = 'logo' | 'banner';

const MAX_ASSET_BYTES = 10 * 1024 * 1024;
const MAX_PROVIDER_CATEGORIES = 2;

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: 'overview', label: 'Overview', icon: Eye },
  { key: 'products', label: 'Catalogue', icon: Package },
  { key: 'reviews', label: 'Reviews', icon: MessageSquare },
  { key: 'photos', label: 'Photos', icon: Camera },
  { key: 'deals', label: 'Deals', icon: Gift },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'verification', label: 'Verification', icon: Shield },
  { key: 'activity', label: 'Activity', icon: AlertTriangle },
];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtTime = (t: string | null) => {
  if (!t) return '—';
  try { return new Date(`1970-01-01T${t}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return t; }
};

/* ═══════════════════════════════ MAIN ═══════════════════════════════ */

export default function ProviderView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [confirmAction, setConfirmAction] = useState<'approve' | 'suspend' | 'unsuspend' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<Product | null>(null);
  const [productCategoryId, setProductCategoryId] = useState('');
  const [productSubcategoryId, setProductSubcategoryId] = useState('');
  const [categoryDirty, setCategoryDirty] = useState(false);
  // Section editing state
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [businessForm, setBusinessForm] = useState({ brandName: '', description: '', isWomenLed: false, isAvailable: true });
  const [contactForm, setContactForm] = useState({ contactNumber: '', openTime: '', closeTime: '' });
  const [contactOtpVerified, setContactOtpVerified] = useState(false);
  const [locationForm, setLocationForm] = useState({ city: '', area: '', pincode: '', address: '' });
  const [socialForm, setSocialForm] = useState({ websiteUrl: '', instagramHandle: '', facebookHandle: '', youtubeHandle: '', whatsappNumber: '' });
  const [categoryForm, setCategoryForm] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [expandedCatGroups, setExpandedCatGroups] = useState<Set<string>>(new Set());

  const { data: categoryTree } = useCategoryTree();
  const updateCategoriesMut = useUpdateProviderCategories();

  // Brand asset (logo / banner) upload state
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAsset, setUploadingAsset] = useState<BrandAsset | null>(null);
  const [confirmRemoveAsset, setConfirmRemoveAsset] = useState<BrandAsset | null>(null);
  const updateImagesMut = useUpdateProviderImages();

  const updateContactMut = useUpdateContactNumber();

  const { data: provider, isLoading } = useProvider(id || '');
  const approveMut = useApproveProvider();
  const suspendMut = useSuspendProvider();
  const unsuspendMut = useUnsuspendProvider();
  const updateProviderMut = useUpdateProvider();

  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  // Sync category state when product panel opens
  useEffect(() => {
    if (selectedProduct) {
      setProductCategoryId(selectedProduct.categoryId || '');
      setProductSubcategoryId(selectedProduct.subcategoryId || '');
      setCategoryDirty(false);
    }
  }, [selectedProduct]);

  const handleSaveProductCategory = async () => {
    if (!selectedProduct) return;
    try {
      await updateProductMutation.mutateAsync({
        id: selectedProduct.id,
        body: {
          categoryId: productCategoryId || null,
          subcategoryId: productSubcategoryId || null,
        },
      });
      toast.success('Product category updated');
      setCategoryDirty(false);
    } catch { toast.error('Failed to update category'); }
  };

  const handleToggleProductActive = async (product: Product) => {
    try {
      await updateProductMutation.mutateAsync({ id: product.id, body: { isActive: !product.isActive } });
      toast.success(product.isActive ? 'Product disabled' : 'Product activated');
      setSelectedProduct((prev) => prev?.id === product.id ? { ...prev, isActive: !product.isActive } : prev);
    } catch { toast.error('Failed to update product'); }
  };

  const handleToggleProductHero = async (product: Product) => {
    try {
      await updateProductMutation.mutateAsync({ id: product.id, body: { isHero: !product.isHero } });
      toast.success(product.isHero ? 'Removed hero status' : 'Marked as hero product');
      setSelectedProduct((prev) => prev?.id === product.id ? { ...prev, isHero: !product.isHero } : prev);
    } catch { toast.error('Failed to update hero status'); }
  };

  const handleDeleteProduct = async () => {
    if (!confirmDeleteProduct) return;
    try {
      await deleteProductMutation.mutateAsync(confirmDeleteProduct.id);
      toast.success('Product deleted');
      setConfirmDeleteProduct(null);
      setSelectedProduct(null);
    } catch { toast.error('Failed to delete product'); }
  };

  // Products & Reviews for this provider
  const { data: productsData } = useProducts({ providerId: id, limit: 50 });
  const { data: reviewsData } = useReviews({ providerId: id, limit: 50 });
  const { data: warnings } = useProviderWarnings(id || '');
  const { data: offersData } = useOffers({ providerId: id, limit: 50 });

  const handleAction = async () => {
    if (!confirmAction || !id) return;
    try {
      if (confirmAction === 'approve') await approveMut.mutateAsync(id);
      else if (confirmAction === 'unsuspend') await unsuspendMut.mutateAsync(id);
      else await suspendMut.mutateAsync(id);
      toast.success(
        confirmAction === 'approve' ? 'Provider approved'
        : confirmAction === 'unsuspend' ? 'Suspension revoked'
        : 'Provider suspended'
      );
      setConfirmAction(null);
    } catch { toast.error('Action failed'); }
  };

  // ── Brand asset helpers ──
  const handleAssetSelected = async (asset: BrandAsset, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !id) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > MAX_ASSET_BYTES) { toast.error('Image must be under 10MB'); return; }
    setUploadingAsset(asset);
    try {
      await updateImagesMut.mutateAsync({ id, payload: asset === 'logo' ? { logo: file } : { banner: file } });
      toast.success(asset === 'logo' ? 'Logo updated' : 'Banner updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingAsset(null);
    }
  };

  const handleRemoveAsset = async () => {
    if (!confirmRemoveAsset || !id) return;
    const asset = confirmRemoveAsset;
    setUploadingAsset(asset);
    try {
      await updateImagesMut.mutateAsync({ id, payload: asset === 'logo' ? { removeLogo: true } : { removeBanner: true } });
      toast.success(asset === 'logo' ? 'Logo removed' : 'Banner removed');
      setConfirmRemoveAsset(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove image');
    } finally {
      setUploadingAsset(null);
    }
  };

  // ── Section edit helpers ──
  const startEdit = useCallback((section: EditingSection) => {
    if (!provider) return;
    setEditingSection(section);
    setContactOtpVerified(false);
    if (section === 'business') {
      setBusinessForm({
        brandName: provider.brandName || '',
        description: provider.description || '',
        isWomenLed: provider.isWomenLed ?? false,
        isAvailable: provider.isAvailable ?? true,
      });
    } else if (section === 'contact') {
      setContactForm({
        contactNumber: provider.contactNumber || '',
        openTime: provider.openTime || '',
        closeTime: provider.closeTime || '',
      });
    } else if (section === 'location') {
      setLocationForm({
        city: provider.city || '',
        area: provider.area || '',
        pincode: provider.pincode || '',
        address: provider.address || '',
      });
    } else if (section === 'social') {
      setSocialForm({
        websiteUrl: provider.websiteUrl || '',
        instagramHandle: provider.instagramHandle || '',
        facebookHandle: provider.facebookHandle || '',
        youtubeHandle: provider.youtubeHandle || '',
        whatsappNumber: provider.whatsappNumber || '',
      });
    } else if (section === 'categories') {
      setCategoryForm((provider.providerCategories || []).map((pc) => pc.categoryId));
      setCategorySearch('');
      setExpandedCatGroups(new Set());
    }
  }, [provider]);

  const cancelEdit = useCallback(() => {
    setEditingSection(null);
    setContactOtpVerified(false);
  }, []);

  const saveBusinessInfo = async () => {
    if (!id) return;
    try {
      await updateProviderMut.mutateAsync({ id, body: { brandName: businessForm.brandName, description: businessForm.description || null, isWomenLed: businessForm.isWomenLed, isAvailable: businessForm.isAvailable } });
      toast.success('Business info updated');
      setEditingSection(null);
    } catch { toast.error('Failed to update'); }
  };

  const saveContactInfo = async (otpForPhone?: string) => {
    if (!id) return;
    try {
      // Save hours via generic update
      const hoursBody: Record<string, any> = {};
      if (contactForm.openTime !== (provider?.openTime || '')) hoursBody.openTime = contactForm.openTime || null;
      if (contactForm.closeTime !== (provider?.closeTime || '')) hoursBody.closeTime = contactForm.closeTime || null;
      if (Object.keys(hoursBody).length > 0) {
        await updateProviderMut.mutateAsync({ id, body: hoursBody });
      }
      // Save phone via OTP endpoint if changed
      const phoneChanged = contactForm.contactNumber !== provider?.contactNumber;
      if (phoneChanged && otpForPhone) {
        await updateContactMut.mutateAsync({ id, contactNumber: contactForm.contactNumber, otp: otpForPhone });
        setContactOtpVerified(true);
      }
      toast.success('Contact info updated');
      setEditingSection(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update');
    }
  };

  const saveLocation = async () => {
    if (!id) return;
    try {
      await updateProviderMut.mutateAsync({ id, body: { city: locationForm.city, area: locationForm.area || null, pincode: locationForm.pincode || null, address: locationForm.address || null } });
      toast.success('Location updated');
      setEditingSection(null);
    } catch { toast.error('Failed to update'); }
  };

  const saveSocial = async () => {
    if (!id) return;
    try {
      await updateProviderMut.mutateAsync({
        id,
        body: {
          websiteUrl: socialForm.websiteUrl || null,
          instagramHandle: socialForm.instagramHandle?.replace(/^@/, '') || null,
          facebookHandle: socialForm.facebookHandle || null,
          youtubeHandle: socialForm.youtubeHandle || null,
          whatsappNumber: socialForm.whatsappNumber || null,
        },
      });
      toast.success('Online presence updated');
      setEditingSection(null);
    } catch { toast.error('Failed to update'); }
  };

  const toggleProviderCategory = (catId: string) => {
    setCategoryForm((prev) => {
      if (prev.includes(catId)) return prev.filter((c) => c !== catId);
      if (prev.length >= MAX_PROVIDER_CATEGORIES) {
        toast.info(`A business can have at most ${MAX_PROVIDER_CATEGORIES} categories — remove one first`);
        return prev;
      }
      return [...prev, catId];
    });
  };

  const saveCategories = async () => {
    if (!id) return;
    try {
      await updateCategoriesMut.mutateAsync({ id, categoryIds: categoryForm });
      toast.success('Categories updated');
      setEditingSection(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update categories');
    }
  };

  // Cooldown helper
  const getContactChangeCooldown = useCallback(() => {
    if (!provider?.lastContactNumberChangeAt) return null;
    const elapsed = Date.now() - new Date(provider.lastContactNumberChangeAt).getTime();
    const cooldownMs = 24 * 60 * 60 * 1000;
    if (elapsed >= cooldownMs) return null;
    const remaining = cooldownMs - elapsed;
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${mins}m`;
  }, [provider?.lastContactNumberChangeAt]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
          <span className="text-sm">Loading provider…</span>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-center py-32">
        <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Provider not found</p>
        <button onClick={() => navigate(ROUTES.PROVIDERS)} className="mt-4 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
          ← Back to Providers
        </button>
      </div>
    );
  }

  const products = productsData?.items ?? [];
  const reviews = reviewsData?.items ?? [];
  const photos = provider.photos ?? [];
  const warningsList = Array.isArray(warnings) ? warnings : [];
  const offers = offersData?.items ?? [];

  return (
    <div>
      <PageHeader
        title={provider.brandName}
        description={provider.user?.name || undefined}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Providers', path: ROUTES.PROVIDERS },
          { label: provider.brandName },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {(provider.status === 'unverified') && (
              <>
                <button onClick={() => setConfirmAction('approve')} className="px-4 py-2 text-sm font-medium rounded-lg text-white" style={{ background: 'var(--color-success)' }}>
                  <CheckCircle2 className="w-4 h-4 inline mr-1.5" />Approve
                </button>
                <button onClick={() => setConfirmAction('suspend')} className="px-4 py-2 text-sm font-medium rounded-lg" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                  <XCircle className="w-4 h-4 inline mr-1.5" />Reject
                </button>
              </>
            )}
            {provider.status === 'active' && (
              <button onClick={() => setConfirmAction('suspend')} className="px-4 py-2 text-sm font-medium rounded-lg text-white" style={{ background: 'var(--color-danger)' }}>Suspend</button>
            )}
            {provider.status === 'suspended' && (
              <button onClick={() => setConfirmAction('unsuspend')} className="px-4 py-2 text-sm font-medium rounded-lg text-white" style={{ background: 'var(--color-success)' }}>
                <CheckCircle2 className="w-4 h-4 inline mr-1.5" />Revoke Suspension
              </button>
            )}
          </div>
        }
      />

      {/* ─── Provider Header Card ─── */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        {/* Banner */}
        <div className="relative h-40 sm:h-48" style={{ background: 'var(--surface-2)' }}>
          {provider.bannerImageUrl ? (
            <img src={provider.bannerImageUrl} alt={`${provider.brandName} banner`} className="w-full h-full object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="w-full h-full flex flex-col items-center justify-center gap-1.5 transition-colors hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-xs font-medium">Add a cover banner</span>
              <span className="text-[10px]">Recommended 1600×400 — PNG, JPG or WebP</span>
            </button>
          )}

          {provider.bannerImageUrl && (
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-white backdrop-blur-sm transition-opacity hover:opacity-80"
                style={{ background: 'rgba(0,0,0,0.55)' }}
              >
                <Camera className="w-3.5 h-3.5" />Change
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemoveAsset('banner')}
                title="Remove banner"
                className="p-1.5 rounded-lg text-white backdrop-blur-sm transition-opacity hover:opacity-80"
                style={{ background: 'rgba(0,0,0,0.55)' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {uploadingAsset === 'banner' && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          )}
        </div>

        <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleAssetSelected('banner', e)} />
        <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleAssetSelected('logo', e)} />

        <div className="px-6 pb-6 flex items-start gap-5 flex-wrap">
          {/* Logo */}
          <div className="relative flex-shrink-0 -mt-12">
            {provider.profilePhotoUrl ? (
              <img
                src={provider.profilePhotoUrl}
                alt={`${provider.brandName} logo`}
                className="w-24 h-24 rounded-2xl object-cover"
                style={{ border: '3px solid var(--surface-0)', background: 'var(--surface-0)' }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white"
                style={{ background: 'var(--color-primary)', border: '3px solid var(--surface-0)' }}
              >
                {(provider.brandName || '?')[0]?.toUpperCase()}
              </div>
            )}

            {uploadingAsset === 'logo' && (
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}

            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              title={provider.profilePhotoUrl ? 'Change logo' : 'Upload logo'}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-primary)', border: '2px solid var(--surface-0)' }}
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            {provider.profilePhotoUrl && (
              <button
                type="button"
                onClick={() => setConfirmRemoveAsset('logo')}
                title="Remove logo"
                className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-80"
                style={{ background: 'var(--color-danger)', border: '2px solid var(--surface-0)' }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{provider.brandName}</h2>
              <StatusBadge status={provider.status} size="md" />
              {provider.isFeatured && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">★ Featured</span>}
              {provider.communityVerified && <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--color-success)' }}>✓ Verified</span>}
              {provider.isWomenLed && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">♀ Women-Led</span>}
            </div>

            <div className="flex items-center gap-4 mt-2 flex-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>
              {provider.user && (
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{provider.user.name}</span>
              )}
              {provider.contactNumber && (
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{provider.contactNumber}</span>
              )}
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{[provider.area, provider.city].filter(Boolean).join(', ') || '—'}</span>
              {(provider.openTime || provider.closeTime) && (
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtTime(provider.openTime)} – {fmtTime(provider.closeTime)}</span>
              )}
            </div>

            {provider.averageRating != null && (
              <div className="flex items-center gap-1.5 mt-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{provider.averageRating.toFixed(1)}</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>({provider.totalReviews || 0} reviews)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg max-w-full overflow-x-auto" style={{ background: 'var(--surface-1)', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (editingSection) cancelEdit(); }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
              style={{
                background: tab === t.key ? 'var(--surface-0)' : 'transparent',
                color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {/* ─── Tab Content ─── */}
      <div className="space-y-6">

        {/* ══ OVERVIEW ══ */}
        {tab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Products" value={products.length} icon={<Package className="w-5 h-5" />} accent="var(--color-primary)" />
              <StatCard title="Reviews" value={reviews.length} icon={<MessageSquare className="w-5 h-5" />} accent="var(--color-info)" />
              <StatCard title="Avg Rating" value={provider.averageRating?.toFixed(1) || '—'} icon={<Star className="w-5 h-5" />} accent="var(--color-warning)" />
              <StatCard title="Photos" value={photos.length} icon={<Camera className="w-5 h-5" />} accent="var(--color-success)" />
            </div>

            {/* ── Section: Business Info ── */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary)', opacity: 0.12 }}>
                    <Store className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Business Info</p>
                </div>
                {editingSection !== 'business' ? (
                  <button onClick={() => startEdit('business')} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80" style={{ color: 'var(--color-primary)', background: 'var(--surface-2)' }}>
                    <Pencil className="w-3 h-3" />Edit
                  </button>
                ) : (
                  <button onClick={cancelEdit} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md" style={{ color: 'var(--color-danger)', background: 'var(--surface-2)' }}>
                    <X className="w-3 h-3" />Cancel
                  </button>
                )}
              </div>
              <div className="px-5 pb-5">
                {editingSection !== 'business' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Brand Name</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{provider.brandName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Joined</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{fmtDate(provider.createdAt)}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Description</p>
                      <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{provider.description || '—'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${provider.isAvailable ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{provider.isAvailable ? 'Available' : 'Unavailable'}</span>
                      </div>
                      {provider.isWomenLed && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">♀ Women-Led</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Brand Name</label>
                      <input type="text" value={businessForm.brandName} onChange={(e) => setBusinessForm((p) => ({ ...p, brandName: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Description</label>
                      <textarea value={businessForm.description} onChange={(e) => setBusinessForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-3 py-2 text-sm rounded-lg resize-none" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={businessForm.isAvailable} onChange={(e) => setBusinessForm((p) => ({ ...p, isAvailable: e.target.checked }))} className="rounded" />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Available</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={businessForm.isWomenLed} onChange={(e) => setBusinessForm((p) => ({ ...p, isWomenLed: e.target.checked }))} className="rounded" />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Women-Led</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={saveBusinessInfo} disabled={updateProviderMut.isPending || !businessForm.brandName.trim()} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
                        {updateProviderMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save
                      </button>
                      <button onClick={cancelEdit} className="px-4 py-2 text-xs font-medium rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Section: Contact & Hours ── */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#10b98120' }}>
                    <Phone className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Contact & Hours</p>
                </div>
                {editingSection !== 'contact' ? (
                  <button onClick={() => startEdit('contact')} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80" style={{ color: 'var(--color-primary)', background: 'var(--surface-2)' }}>
                    <Pencil className="w-3 h-3" />Edit
                  </button>
                ) : (
                  <button onClick={cancelEdit} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md" style={{ color: 'var(--color-danger)', background: 'var(--surface-2)' }}>
                    <X className="w-3 h-3" />Cancel
                  </button>
                )}
              </div>
              <div className="px-5 pb-5">
                {editingSection !== 'contact' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Owner</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{provider.user?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Owner Mobile</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{provider.user?.mobileNumber || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Business Contact</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <a href={`tel:${provider.contactNumber}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>{provider.contactNumber || '—'}</a>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Hours</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                        {provider.openTime || provider.closeTime ? `${fmtTime(provider.openTime)} – ${fmtTime(provider.closeTime)}` : '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Owner info — read only */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                      <div>
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Owner (read-only)</p>
                        <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{provider.user?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Owner Mobile (read-only)</p>
                        <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{provider.user?.mobileNumber || '—'}</p>
                      </div>
                    </div>
                    {/* Editable contact number */}
                    <div>
                      <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Business Contact Number</label>
                      <input type="text" value={contactForm.contactNumber} onChange={(e) => setContactForm((p) => ({ ...p, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10-digit number" maxLength={10} className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                      {/* Cooldown warning */}
                      {getContactChangeCooldown() && contactForm.contactNumber !== provider.contactNumber && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: 'var(--color-warning-dark, #92400e)' }}>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Phone was changed recently. Next change in {getContactChangeCooldown()}.
                        </div>
                      )}
                      {/* OTP required if number changed */}
                      {contactForm.contactNumber !== provider.contactNumber && !getContactChangeCooldown() && /^\d{10}$/.test(contactForm.contactNumber) && (
                        <PhoneOtpVerifier
                          phoneNumber={contactForm.contactNumber}
                          purpose="business_verification"
                          onOtpReady={async (otp) => {
                            try {
                              await updateContactMut.mutateAsync({ id: id!, contactNumber: contactForm.contactNumber, otp });
                              setContactOtpVerified(true);
                              toast.success('Contact number updated');
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message || 'Failed to update contact number');
                            }
                          }}
                          verified={contactOtpVerified}
                        />
                      )}
                    </div>
                    {/* Hours */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Open Time</label>
                        <input type="time" value={contactForm.openTime} onChange={(e) => setContactForm((p) => ({ ...p, openTime: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Close Time</label>
                        <input type="time" value={contactForm.closeTime} onChange={(e) => setContactForm((p) => ({ ...p, closeTime: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={() => saveContactInfo()} disabled={updateProviderMut.isPending} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
                        {updateProviderMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save Hours
                      </button>
                      <button onClick={cancelEdit} className="px-4 py-2 text-xs font-medium rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Section: Location ── */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#f59e0b20' }}>
                    <MapPin className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Location</p>
                </div>
                {editingSection !== 'location' ? (
                  <button onClick={() => startEdit('location')} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80" style={{ color: 'var(--color-primary)', background: 'var(--surface-2)' }}>
                    <Pencil className="w-3 h-3" />Edit
                  </button>
                ) : (
                  <button onClick={cancelEdit} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md" style={{ color: 'var(--color-danger)', background: 'var(--surface-2)' }}>
                    <X className="w-3 h-3" />Cancel
                  </button>
                )}
              </div>
              <div className="px-5 pb-5">
                {editingSection !== 'location' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>City</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{provider.city || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Area</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{provider.area || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Pincode</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{provider.pincode || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Address</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{provider.address || '—'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>City</label>
                        <input type="text" value={locationForm.city} onChange={(e) => setLocationForm((p) => ({ ...p, city: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Area</label>
                        <input type="text" value={locationForm.area} onChange={(e) => setLocationForm((p) => ({ ...p, area: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Pincode</label>
                        <input type="text" value={locationForm.pincode} onChange={(e) => setLocationForm((p) => ({ ...p, pincode: e.target.value }))} maxLength={10} className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Address</label>
                        <input type="text" value={locationForm.address} onChange={(e) => setLocationForm((p) => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={saveLocation} disabled={updateProviderMut.isPending || !locationForm.city.trim()} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
                        {updateProviderMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save
                      </button>
                      <button onClick={cancelEdit} className="px-4 py-2 text-xs font-medium rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Section: Online Presence ── */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#6366f120' }}>
                    <Globe className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Online Presence</p>
                </div>
                {editingSection !== 'social' ? (
                  <button onClick={() => startEdit('social')} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80" style={{ color: 'var(--color-primary)', background: 'var(--surface-2)' }}>
                    <Pencil className="w-3 h-3" />Edit
                  </button>
                ) : (
                  <button onClick={cancelEdit} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md" style={{ color: 'var(--color-danger)', background: 'var(--surface-2)' }}>
                    <X className="w-3 h-3" />Cancel
                  </button>
                )}
              </div>
              <div className="px-5 pb-5">
                {editingSection !== 'social' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Website', value: provider.websiteUrl, href: provider.websiteUrl ? (provider.websiteUrl.startsWith('http') ? provider.websiteUrl : `https://${provider.websiteUrl}`) : null, display: provider.websiteUrl?.replace(/^https?:\/\//, '').replace(/\/$/, ''), color: 'var(--color-primary)' },
                      { label: 'Instagram', value: provider.instagramHandle, href: provider.instagramHandle ? `https://instagram.com/${provider.instagramHandle}` : null, display: provider.instagramHandle ? `@${provider.instagramHandle}` : null, color: '#E4405F' },
                      { label: 'Facebook', value: provider.facebookHandle, href: provider.facebookHandle ? (provider.facebookHandle.startsWith('http') ? provider.facebookHandle : `https://facebook.com/${provider.facebookHandle}`) : null, display: provider.facebookHandle, color: '#1877F2' },
                      { label: 'YouTube', value: provider.youtubeHandle, href: provider.youtubeHandle ? (provider.youtubeHandle.startsWith('http') ? provider.youtubeHandle : `https://youtube.com/@${provider.youtubeHandle.replace(/^@/, '')}`) : null, display: provider.youtubeHandle, color: '#FF0000' },
                      { label: 'WhatsApp', value: provider.whatsappNumber, href: provider.whatsappNumber ? `https://wa.me/${provider.whatsappNumber.replace(/[^0-9]/g, '')}` : null, display: provider.whatsappNumber, color: '#25D366' },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase w-16 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                        {s.value && s.href ? (
                          <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate hover:underline" style={{ color: s.color }}>{s.display}</a>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { key: 'websiteUrl' as const, label: 'Website URL', placeholder: 'https://example.com' },
                      { key: 'instagramHandle' as const, label: 'Instagram Handle', placeholder: 'yourhandle (without @)' },
                      { key: 'facebookHandle' as const, label: 'Facebook', placeholder: 'Page name or URL' },
                      { key: 'youtubeHandle' as const, label: 'YouTube', placeholder: '@channel or URL' },
                      { key: 'whatsappNumber' as const, label: 'WhatsApp Number', placeholder: '+966XXXXXXXXX' },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                        <input type="text" value={socialForm[f.key]} onChange={(e) => setSocialForm((prev) => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={saveSocial} disabled={updateProviderMut.isPending} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
                        {updateProviderMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save
                      </button>
                      <button onClick={cancelEdit} className="px-4 py-2 text-xs font-medium rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Section: Categories ── */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ec489920' }}>
                    <Tags className="w-3.5 h-3.5" style={{ color: '#ec4899' }} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Categories</p>
                  {editingSection === 'categories' && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                      {categoryForm.length}/{MAX_PROVIDER_CATEGORIES} selected
                    </span>
                  )}
                </div>
                {editingSection !== 'categories' ? (
                  <button onClick={() => startEdit('categories')} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80" style={{ color: 'var(--color-primary)', background: 'var(--surface-2)' }}>
                    <Pencil className="w-3 h-3" />Edit
                  </button>
                ) : (
                  <button onClick={cancelEdit} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md" style={{ color: 'var(--color-danger)', background: 'var(--surface-2)' }}>
                    <X className="w-3 h-3" />Cancel
                  </button>
                )}
              </div>
              <div className="px-5 pb-5">
                {editingSection !== 'categories' ? (
                  provider.providerCategories && provider.providerCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {provider.providerCategories.map((pc) => (
                        <span key={pc.id} className="px-3 py-1.5 text-xs font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                          {pc.category?.name || 'Unknown'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No categories assigned — this business won't surface in category browsing.</p>
                  )
                ) : (
                  <div className="space-y-3">
                    {/* Selected chips */}
                    {categoryForm.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {categoryForm.map((catId) => {
                          const match = (categoryTree || []).flatMap((c: any) => [c, ...(c.children || [])]).find((c: any) => c.id === catId);
                          return (
                            <span key={catId} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-white" style={{ background: 'var(--color-primary)' }}>
                              {match?.name || 'Selected category'}
                              <button type="button" onClick={() => toggleProviderCategory(catId)} className="hover:opacity-70" title="Remove">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Search categories…"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    {/* Tree */}
                    {categoryTree && categoryTree.length > 0 ? (
                      <div className="space-y-1.5 max-h-80 overflow-y-auto">
                        {(categorySearch.trim()
                          ? categoryTree.filter((cat: any) => {
                              const q = categorySearch.trim().toLowerCase();
                              if (cat.name.toLowerCase().includes(q)) return true;
                              return cat.children?.some((ch: any) => ch.name.toLowerCase().includes(q));
                            })
                          : categoryTree
                        ).map((cat: any) => {
                          const hasChildren = cat.children && cat.children.length > 0;
                          const isExpanded = categorySearch.trim() ? true : expandedCatGroups.has(cat.id);
                          const childrenToShow = categorySearch.trim()
                            ? (cat.children || []).filter((ch: any) =>
                                ch.name.toLowerCase().includes(categorySearch.trim().toLowerCase()) ||
                                cat.name.toLowerCase().includes(categorySearch.trim().toLowerCase()))
                            : cat.children || [];
                          const selectedChildCount = childrenToShow.filter((ch: any) => categoryForm.includes(ch.id)).length;
                          const parentSelected = categoryForm.includes(cat.id);

                          return (
                            <div key={cat.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (hasChildren) {
                                    setExpandedCatGroups((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(cat.id)) next.delete(cat.id); else next.add(cat.id);
                                      return next;
                                    });
                                  } else {
                                    toggleProviderCategory(cat.id);
                                  }
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                                style={{
                                  background: parentSelected && !hasChildren ? 'var(--color-primary)' : 'transparent',
                                  color: parentSelected && !hasChildren ? 'white' : 'var(--text-primary)',
                                }}
                              >
                                {cat.icon && (
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${
                                    GRADIENT_PALETTE[cat.iconColor || 'amber']?.gradient || 'from-amber-400 to-orange-500'
                                  }`}>
                                    <IconByName name={cat.icon} size={11} className="text-white" strokeWidth={2.5} />
                                  </span>
                                )}
                                <span className="flex-1 text-xs font-semibold truncate">{cat.name}</span>
                                {selectedChildCount > 0 && hasChildren && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--color-primary)' }}>
                                    {selectedChildCount}
                                  </span>
                                )}
                                {parentSelected && !hasChildren && <CheckCircle className="w-3.5 h-3.5" />}
                                {hasChildren && (
                                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} style={{ color: 'var(--text-muted)' }} />
                                )}
                              </button>
                              {hasChildren && isExpanded && (
                                <div className="px-3 pb-2.5 pt-1 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid var(--border-default)' }}>
                                  {childrenToShow.map((child: any) => {
                                    const sel = categoryForm.includes(child.id);
                                    return (
                                      <button
                                        key={child.id}
                                        type="button"
                                        onClick={() => toggleProviderCategory(child.id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors"
                                        style={{
                                          background: sel ? 'var(--color-primary)' : 'var(--surface-1)',
                                          color: sel ? 'white' : 'var(--text-secondary)',
                                          border: `1px solid ${sel ? 'var(--color-primary)' : 'var(--border-default)'}`,
                                        }}
                                      >
                                        {sel && <CheckCircle className="w-3 h-3" />}
                                        {child.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No categories available</p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={saveCategories} disabled={updateCategoriesMut.isPending} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
                        {updateCategoriesMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save
                      </button>
                      <button onClick={cancelEdit} className="px-4 py-2 text-xs font-medium rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══ PRODUCTS ══ */}
        {tab === 'products' && (
          <div className="rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            {/* Header with count + type breakdown */}
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {products.length} {products.length === 1 ? 'Item' : 'Items'}
                </p>
                {products.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {products.filter(p => p.productType !== 'service').length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full" style={{ background: '#f59e0b18', color: '#d97706' }}>
                        📦 {products.filter(p => p.productType !== 'service').length} Products
                      </span>
                    )}
                    {products.filter(p => p.productType === 'service').length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-teal-50 text-teal-600">
                        🛠️ {products.filter(p => p.productType === 'service').length} Services
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                  <Package className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No products or services yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Items added by this provider will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 p-5">
                {products.map((p) => {
                  const isService = p.productType === 'service';
                  const hasImage = !!(p.photoUrl || p.photoUrls?.[0]);
                  return (
                    <div
                      key={p.id}
                      className="group rounded-xl overflow-hidden cursor-pointer transition-all duration-200"
                      style={{
                        background: 'var(--surface-0)',
                        border: `1px solid ${p.isHero ? '#7c3aed30' : 'var(--border-default)'}`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                        (e.currentTarget as HTMLElement).style.borderColor = p.isHero ? '#7c3aed' : 'var(--color-primary)';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                        (e.currentTarget as HTMLElement).style.borderColor = p.isHero ? '#7c3aed30' : 'var(--border-default)';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      }}
                      onClick={() => setSelectedProduct(p)}
                    >
                      {/* Image area */}
                      <div className="relative aspect-[16/10] overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                        {hasImage ? (
                          <img
                            src={p.photoUrl || p.photoUrls[0]}
                            alt={p.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                            <Package className="w-8 h-8 opacity-20" style={{ color: 'var(--text-muted)' }} />
                            <span className="text-[10px] font-medium opacity-40" style={{ color: 'var(--text-muted)' }}>No image</span>
                          </div>
                        )}

                        {/* Overlay badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between pointer-events-none">
                          <div className="flex flex-col gap-1">
                            {p.isHero && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg text-white shadow-sm backdrop-blur-sm" style={{ background: 'rgba(124,58,237,0.9)' }}>
                                <Star className="w-2.5 h-2.5" style={{ fill: 'white' }} /> Hero
                              </span>
                            )}
                            {isService && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg text-white shadow-sm backdrop-blur-sm" style={{ background: 'rgba(20,184,166,0.9)' }}>
                                🛠️ Service
                              </span>
                            )}
                          </div>
                          {!p.isActive && (
                            <span className="px-2 py-1 text-[10px] font-bold rounded-lg text-white shadow-sm backdrop-blur-sm" style={{ background: 'rgba(239,68,68,0.85)' }}>
                              Inactive
                            </span>
                          )}
                        </div>

                        {/* Photo count badge */}
                        {p.photoUrls?.length > 1 && (
                          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-white backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.5)' }}>
                            <Camera className="w-3 h-3" /> {p.photoUrls.length}
                          </div>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="p-4">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-[13px] font-semibold leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                            {p.name}
                          </h4>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleProductHero(p); }}
                            className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                            title={p.isHero ? 'Remove hero' : 'Make hero'}
                          >
                            <Star className="w-3.5 h-3.5" style={{ color: p.isHero ? '#7c3aed' : 'var(--text-muted)', fill: p.isHero ? '#7c3aed' : 'none' }} />
                          </button>
                        </div>

                        {/* Description */}
                        {p.description && (
                          <p className="text-[11px] leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--text-muted)' }}>
                            {p.description}
                          </p>
                        )}

                        {/* Bottom meta row */}
                        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                          <div>
                            {p.price != null ? (
                              <p className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                                ₹{p.price.toLocaleString()}
                              </p>
                            ) : (
                              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                Price on request
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full"
                              style={{
                                background: isService ? '#14b8a615' : '#f59e0b12',
                                color: isService ? '#0d9488' : '#b45309',
                              }}
                            >
                              {isService ? '🛠️ Service' : '📦 Product'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ REVIEWS ══ */}
        {tab === 'reviews' && (
          <div className="rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{reviews.length} Reviews</p>
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No reviews yet</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {reviews.map((r) => {
                  const rating = (r as any).starRating ?? (r as any).rating ?? 0;
                  const text = (r as any).reviewText ?? (r as any).comment ?? null;
                  const date = (r as any).postedAt ?? (r as any).createdAt ?? null;
                  return (
                    <div key={r.id} className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: 'var(--color-info)' }}
                          >
                            {(r.reviewer?.name || '?')[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {r.reviewer?.name || 'Anonymous'}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className="w-3 h-3" style={{ color: i < rating ? '#f59e0b' : 'var(--border-default)', fill: i < rating ? '#f59e0b' : 'none' }} />
                            ))}
                          </div>
                          <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>{rating}/5</span>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDate(date ? String(date) : null)}</span>
                      </div>
                      {text && <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>}
                      {r.replyText && (
                        <div className="mt-2 pl-3 text-xs" style={{ borderLeft: '2px solid var(--border-default)', color: 'var(--text-muted)' }}>
                          <span className="font-semibold">Provider reply:</span> {r.replyText}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ PHOTOS ══ */}
        {tab === 'photos' && (
          <div className="rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{photos.length} Photos</p>
            </div>
            {photos.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No photos uploaded</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="rounded-lg overflow-hidden aspect-square" style={{ border: '1px solid var(--border-default)' }}>
                    <img src={photo.imageUrl} alt="Provider photo" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ VERIFICATION ══ */}
        {tab === 'verification' && (
          <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <p className="text-xs font-semibold uppercase mb-4" style={{ color: 'var(--text-muted)' }}>Verification Documents</p>
            {provider.user?.verification ? (
              <div className="space-y-4">
                {/* Aadhaar */}
                <div className="rounded-lg p-4" style={{ background: 'var(--surface-1)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Aadhaar Document</p>
                    <StatusBadge status={provider.user.verification.aadhaarStatus} />
                  </div>
                  {provider.user.verification.aadhaarDocUrl && (
                    <a href={provider.user.verification.aadhaarDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                      View Document →
                    </a>
                  )}
                </div>
                {/* Ijamat */}
                <div className="rounded-lg p-4" style={{ background: 'var(--surface-1)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Ijamat Document</p>
                    <StatusBadge status={provider.user.verification.ijamatStatus} />
                  </div>
                  {provider.user.verification.ijamatNumber && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Number: {provider.user.verification.ijamatNumber}</p>
                  )}
                  {provider.user.verification.ijamatDocUrl && (
                    <a href={provider.user.verification.ijamatDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                      View Document →
                    </a>
                  )}
                </div>
                {/* Admin Notes */}
                {provider.user.verification.adminNotes && (
                  <div className="rounded-lg p-4" style={{ background: 'var(--surface-1)' }}>
                    <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Admin Notes</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{provider.user.verification.adminNotes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No verification documents submitted</p>
              </div>
            )}
          </div>
        )}

        {/* ══ ACTIVITY / WARNINGS ══ */}
        {tab === 'activity' && (
          <div className="rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Warnings & Activity</p>
            </div>
            {warningsList.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No warnings or activity</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {warningsList.map((w: any, i: number) => (
                  <div key={w.id || i} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{w.type || 'Warning'}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDate(w.createdAt)}</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{w.message || w.reason || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ DEALS / OFFERS ══ */}
        {tab === 'deals' && (
          <div className="rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{offers.length} Deals & Offers</p>
            </div>
            {offers.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No deals or offers yet</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {offers.map((offer: ProviderOffer) => (
                  <div key={offer.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{offer.title}</p>
                          <StatusBadge status={offer.isActive ? 'active' : 'closed'} size="sm" showDot={false} />
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: offer.approvalStatus === 'approved' ? 'var(--color-success)' : offer.approvalStatus === 'rejected' ? 'var(--color-danger)' : 'var(--color-warning-light)', color: offer.approvalStatus === 'approved' ? '#FFFFFF' : offer.approvalStatus === 'rejected' ? '#FFFFFF' : 'var(--color-warning-dark)' }}>
                            {offer.approvalStatus.replace('_', ' ')}
                          </span>
                        </div>
                        {offer.description && <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{offer.description}</p>}
                        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                            {offer.discountType === 'percentage' ? `${offer.discountValue}% off` : `₹${offer.discountValue} off`}
                          </span>
                          {offer.minOrderAmount != null && <span>Min: ₹{offer.minOrderAmount}</span>}
                          {offer.maxDiscount != null && <span>Max: ₹{offer.maxDiscount}</span>}
                          <span>Used: {offer.usageCount}{offer.usageLimit ? `/${offer.usageLimit}` : ''}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Valid</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{fmtDate(offer.startsAt)} – {fmtDate(offer.endsAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ ANALYTICS ══ */}
        {tab === 'analytics' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Products" value={products.length} icon={<Package className="w-5 h-5" />} accent="var(--color-primary)" />
              <StatCard title="Reviews" value={reviews.length} icon={<MessageSquare className="w-5 h-5" />} accent="var(--color-info)" />
              <StatCard title="Avg Rating" value={provider.averageRating?.toFixed(1) || '—'} icon={<Star className="w-5 h-5" />} accent="var(--color-warning)" />
              <StatCard title="Active Deals" value={offers.filter((o: ProviderOffer) => o.isActive).length} icon={<Gift className="w-5 h-5" />} accent="var(--color-success)" />
            </div>

            {/* Rating Distribution */}
            <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <p className="text-xs font-semibold uppercase mb-4" style={{ color: 'var(--text-muted)' }}>Rating Distribution</p>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r) => ((r as any).starRating ?? (r as any).rating) === star).length;
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-4 text-right" style={{ color: 'var(--text-primary)' }}>{star}</span>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--color-warning)' }} />
                      </div>
                      <span className="text-xs font-medium w-8" style={{ color: 'var(--text-muted)' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product Performance */}
            {products.length > 0 && (
              <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
                <p className="text-xs font-semibold uppercase mb-4" style={{ color: 'var(--text-muted)' }}>Product Summary</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Total Products</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{products.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Active</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>{products.filter((p) => p.isActive).length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Inactive</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-danger)' }}>{products.filter((p) => !p.isActive).length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Avg Price</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {(() => { const priced = products.filter((p) => p.price != null); return priced.length > 0 ? `₹${Math.round(priced.reduce((s, p) => s + (p.price || 0), 0) / priced.length).toLocaleString()}` : '—'; })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>With Photos</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{products.filter((p) => p.photoUrl || (p.photoUrls && p.photoUrls.length > 0)).length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Photos</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{photos.length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Deals Performance */}
            {offers.length > 0 && (
              <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
                <p className="text-xs font-semibold uppercase mb-4" style={{ color: 'var(--text-muted)' }}>Deals Performance</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Total Deals</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{offers.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Active</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>{offers.filter((o: ProviderOffer) => o.isActive).length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Total Usage</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{offers.reduce((s: number, o: ProviderOffer) => s + o.usageCount, 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Approved</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-info)' }}>{offers.filter((o: ProviderOffer) => o.approvalStatus === 'approved').length}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Product Detail Panel ─── */}
      <DetailPanel
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || 'Product Detail'}
        subtitle={selectedProduct?.provider?.brandName || provider.brandName}
        actions={
          selectedProduct && (
            <div className="flex gap-2">
              <button
                onClick={() => handleToggleProductHero(selectedProduct)}
                className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5"
                style={{
                  background: selectedProduct.isHero ? '#7c3aed' : 'var(--surface-2)',
                  color: selectedProduct.isHero ? 'white' : 'var(--text-secondary)',
                }}
              >
                <Star className="w-3.5 h-3.5" style={{ fill: selectedProduct.isHero ? 'white' : 'none' }} />
                {selectedProduct.isHero ? 'Hero' : 'Make Hero'}
              </button>
              <button
                onClick={() => handleToggleProductActive(selectedProduct)}
                className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{
                  background: selectedProduct.isActive ? 'var(--surface-2)' : 'var(--color-success)',
                  color: selectedProduct.isActive ? 'var(--text-secondary)' : 'white',
                }}
              >
                {selectedProduct.isActive ? 'Disable' : 'Activate'}
              </button>
              <button
                onClick={() => setConfirmDeleteProduct(selectedProduct)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: 'var(--color-danger)' }}
              >
                <Trash2 className="w-4 h-4 inline mr-1.5" />
                Delete
              </button>
            </div>
          )
        }
      >
        {selectedProduct && (
          <div className="space-y-5">
            {(selectedProduct.photoUrl || selectedProduct.photoUrls?.[0]) && (
              <img
                src={selectedProduct.photoUrl || selectedProduct.photoUrls[0]}
                alt={selectedProduct.name}
                className="w-full rounded-xl object-cover"
                style={{ maxHeight: '200px' }}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Name', value: selectedProduct.name },
                { label: 'Price', value: selectedProduct.price != null ? `₹${selectedProduct.price.toLocaleString()}` : '—' },
                { label: 'Display Order', value: selectedProduct.displayOrder?.toString() },
                { label: 'Provider', value: selectedProduct.provider?.brandName || provider.brandName },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{field.label}</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{field.value || '—'}</p>
                </div>
              ))}
              <div>
                <p className="text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Status</p>
                <StatusBadge status={selectedProduct.isActive ? 'active' : 'disabled'} />
              </div>
            </div>
            {selectedProduct.description && (
              <div>
                <p className="text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedProduct.description}</p>
              </div>
            )}
            {/* Category assignment */}
            <div className="pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
              <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Category</p>
              <SearchableCategoryPicker
                categoryId={productCategoryId}
                subcategoryId={productSubcategoryId}
                onCategoryChange={(id) => { setProductCategoryId(id); setProductSubcategoryId(''); setCategoryDirty(true); }}
                onSubcategoryChange={(id) => { setProductSubcategoryId(id); setCategoryDirty(true); }}
              />
              {categoryDirty && (
                <button
                  onClick={handleSaveProductCategory}
                  disabled={updateProductMutation.isPending}
                  className="mt-3 px-4 py-2 text-xs font-semibold rounded-lg text-white disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {updateProductMutation.isPending ? 'Saving…' : 'Save Category'}
                </button>
              )}
            </div>
          </div>
        )}
      </DetailPanel>

      {/* ─── Product Delete Confirmation ─── */}
      <ConfirmDialog
        open={!!confirmDeleteProduct}
        onClose={() => setConfirmDeleteProduct(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        description={`Are you sure you want to delete "${confirmDeleteProduct?.name || 'this product'}"?`}
        confirmLabel="Delete Product"
        variant="danger"
        isLoading={deleteProductMutation.isPending}
      />

      <ConfirmDialog
        open={!!confirmRemoveAsset}
        onClose={() => setConfirmRemoveAsset(null)}
        onConfirm={handleRemoveAsset}
        title={confirmRemoveAsset === 'logo' ? 'Remove Logo' : 'Remove Banner'}
        description={
          confirmRemoveAsset === 'logo'
            ? `Remove the logo for "${provider.brandName}"? The business will fall back to its initial.`
            : `Remove the cover banner for "${provider.brandName}"?`
        }
        confirmLabel="Remove"
        variant="danger"
        isLoading={updateImagesMut.isPending}
      />

      {/* ─── Confirm Dialog ─── */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleAction}
        title={confirmAction === 'approve' ? 'Approve Provider' : confirmAction === 'unsuspend' ? 'Revoke Suspension' : 'Suspend Provider'}
        description={
          confirmAction === 'approve'
            ? `Approve "${provider.brandName}"? They will become visible on the platform.`
            : confirmAction === 'unsuspend'
              ? `Revoke suspension for "${provider.brandName}"?`
              : `Suspend "${provider.brandName}"? Their listing will be hidden.`
        }
        confirmLabel={confirmAction === 'approve' ? 'Approve' : confirmAction === 'unsuspend' ? 'Revoke' : 'Suspend'}
        variant={confirmAction === 'suspend' ? 'danger' : 'default'}
        isLoading={approveMut.isPending || suspendMut.isPending || unsuspendMut.isPending}
      />
    </div>
  );
}
