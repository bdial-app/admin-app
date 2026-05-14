import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star, MapPin, Phone, Clock, Package,
  MessageSquare, Camera, Shield, AlertTriangle,
  CheckCircle2, XCircle, Users, Eye, BarChart3, Gift, Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DetailPanel } from '../components/ui/DetailPanel';
import {
  useProvider, useApproveProvider, useSuspendProvider,
  useUnsuspendProvider, useProviderWarnings,
} from '../hooks/useProviders';
import { useProducts, useUpdateProduct, useDeleteProduct } from '../hooks/useProducts';
import { useReviews } from '../hooks/useReviews';
import { useOffers } from '../hooks/useOffers';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Product, ProviderOffer } from '../types';

type Tab = 'overview' | 'products' | 'reviews' | 'photos' | 'verification' | 'activity' | 'analytics' | 'deals';

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: 'overview', label: 'Overview', icon: Eye },
  { key: 'products', label: 'Products', icon: Package },
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

  const { data: provider, isLoading } = useProvider(id || '');
  const approveMut = useApproveProvider();
  const suspendMut = useSuspendProvider();
  const unsuspendMut = useUnsuspendProvider();

  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  const handleToggleProductActive = async (product: Product) => {
    try {
      await updateProductMutation.mutateAsync({ id: product.id, body: { isActive: !product.isActive } });
      toast.success(product.isActive ? 'Product disabled' : 'Product activated');
      setSelectedProduct((prev) => prev?.id === product.id ? { ...prev, isActive: !product.isActive } : prev);
    } catch { toast.error('Failed to update product'); }
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
            {(provider.status === 'pending' || provider.status === 'in_review' || provider.status === 'unverified') && (
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
      <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar */}
          {provider.profilePhotoUrl ? (
            <img src={provider.profilePhotoUrl} alt={provider.brandName} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
              {(provider.brandName || '?')[0]?.toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
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
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit overflow-x-auto" style={{ background: 'var(--surface-1)' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Products" value={products.length} icon={<Package className="w-5 h-5" />} accent="var(--color-primary)" />
              <StatCard title="Reviews" value={reviews.length} icon={<MessageSquare className="w-5 h-5" />} accent="var(--color-info)" />
              <StatCard title="Avg Rating" value={provider.averageRating?.toFixed(1) || '—'} icon={<Star className="w-5 h-5" />} accent="var(--color-warning)" />
              <StatCard title="Photos" value={photos.length} icon={<Camera className="w-5 h-5" />} accent="var(--color-success)" />
            </div>

            {provider.description && (
              <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
                <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{provider.description}</p>
              </div>
            )}

            {/* Info Grid */}
            <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Business Details</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { l: 'Owner', v: provider.user?.name },
                  { l: 'Mobile', v: provider.user?.mobileNumber },
                  { l: 'Contact', v: provider.contactNumber },
                  { l: 'City', v: provider.city },
                  { l: 'Area', v: provider.area },
                  { l: 'Pincode', v: provider.pincode },
                  { l: 'Available', v: provider.isAvailable ? 'Yes' : 'No' },
                  { l: 'Women-Led', v: provider.isWomenLed ? 'Yes' : 'No' },
                  { l: 'Joined', v: fmtDate(provider.createdAt) },
                ].map((f) => (
                  <div key={f.l}>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{f.l}</p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{f.v || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories */}
            {provider.providerCategories && provider.providerCategories.length > 0 && (
              <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
                <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Categories</p>
                <div className="flex flex-wrap gap-2">
                  {provider.providerCategories.map((pc) => (
                    <span key={pc.id} className="px-3 py-1.5 text-xs font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                      {pc.category?.name || 'Unknown'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ PRODUCTS ══ */}
        {tab === 'products' && (
          <div className="rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{products.length} Products</p>
            </div>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No products yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg overflow-hidden cursor-pointer transition-all"
                    style={{ border: '1px solid var(--border-default)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; }}
                    onClick={() => setSelectedProduct(p)}
                  >
                    {(p.photoUrl || p.photoUrls?.[0]) && (
                      <img src={p.photoUrl || p.photoUrls[0]} alt={p.name} className="w-full h-32 object-cover" />
                    )}
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                        <StatusBadge status={p.isActive ? 'active' : 'suspended'} size="sm" showDot={false} />
                      </div>
                      {p.price != null && (
                        <p className="text-sm font-bold mt-1" style={{ color: 'var(--color-primary)' }}>₹{p.price.toLocaleString()}</p>
                      )}
                      {p.description && (
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
                      )}
                    </div>
                  </div>
                ))}
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
                {reviews.map((r) => (
                  <div key={r.id} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {r.reviewer?.name || 'Anonymous'}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3" style={{ color: i < r.rating ? '#f59e0b' : 'var(--border-default)', fill: i < r.rating ? '#f59e0b' : 'none' }} />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDate(r.createdAt)}</span>
                    </div>
                    {r.comment && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.comment}</p>}
                    {r.replyText && (
                      <div className="mt-2 pl-3 text-xs" style={{ borderLeft: '2px solid var(--border-default)', color: 'var(--text-muted)' }}>
                        <span className="font-semibold">Provider reply:</span> {r.replyText}
                      </div>
                    )}
                  </div>
                ))}
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
                  const count = reviews.filter((r) => r.rating === star).length;
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
