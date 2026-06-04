import { useState } from 'react';
import {
  Search, Filter, X, Package, Image, ImageOff, Eye,
  Trash2, ToggleLeft, ToggleRight, Copy, Edit3, IndianRupee,
  CheckCircle2, XCircle, ShoppingBag, Wrench,
  ChevronLeft, ChevronRight, Star, Plus,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatCard } from '../components/ui/StatCard';
import { FormField } from '../components/ui/FormField';
import { useProducts, useProductStats, useUpdateProduct, useDeleteProduct, useCreateProduct } from '../hooks/useProducts';
import { useProviders } from '../hooks/useProviders';
import { productsService } from '../services/products.service';
import { ROUTES } from '../utils/constants';
import type { Product, ProductFilters } from '../types';
import { toast } from 'react-toastify';
import { PermissionGate } from '../components/auth/PermissionGate';

const LIMIT = 25;

const formatPrice = (price: number | null | undefined) =>
  price != null && price > 0 ? `\u20B9${Number(price).toLocaleString('en-IN')}` : '\u2014';

const STATUS_PILLS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Disabled' },
];

const TYPE_PILLS = [
  { value: '', label: 'All Types' },
  { value: 'product', label: 'Products', icon: ShoppingBag },
  { value: 'service', label: 'Services', icon: Wrench },
];

export default function Products() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'product' | 'service'>('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [hasImages, setHasImages] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [imageViewIdx, setImageViewIdx] = useState(0);

  const filters: ProductFilters = {
    page,
    limit: LIMIT,
    search: search || undefined,
    isActive: statusFilter === 'true' ? true : statusFilter === 'false' ? false : '',
    productType: (typeFilter as '' | 'product' | 'service') || undefined,
    priceMin: priceMin || undefined,
    priceMax: priceMax || undefined,
    hasImages: hasImages || undefined,
  };

  const { data, isLoading } = useProducts(filters);
  const { data: stats } = useProductStats();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const createMutation = useCreateProduct();

  const activeFilterCount = [typeFilter, priceMin, priceMax, hasImages].filter(Boolean).length;

  const clearFilters = () => {
    setTypeFilter('');
    setPriceMin('');
    setPriceMax('');
    setHasImages('');
    setPage(1);
  };

  const handleToggle = async (product: Product) => {
    try {
      await updateMutation.mutateAsync({ id: product.id, body: { isActive: !product.isActive } });
      toast.success(product.isActive ? 'Product disabled' : 'Product activated');
    } catch { toast.error('Failed to update'); }
  };

  const handleToggleHero = async (product: Product) => {
    try {
      await updateMutation.mutateAsync({ id: product.id, body: { isHero: !product.isHero } });
      toast.success(product.isHero ? 'Removed hero status' : 'Marked as hero product');
    } catch { toast.error('Failed to update hero status'); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast.success('Product disabled');
      setConfirmDelete(null);
      setSelectedProduct(null);
    } catch { toast.error('Failed to delete'); }
  };

  // ─── Edit form state ──────────────────
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', displayOrder: '', productType: 'product' as 'product' | 'service' });

  const openEdit = (p: Product) => {
    setEditForm({
      name: p.name || '',
      description: p.description || '',
      price: p.price?.toString() || '',
      displayOrder: p.displayOrder?.toString() || '0',
      productType: (p.productType as 'product' | 'service') || 'product',
    });
    setEditProduct(p);
  };

  const handleSaveEdit = async () => {
    if (!editProduct) return;
    try {
      await updateMutation.mutateAsync({
        id: editProduct.id,
        body: {
          name: editForm.name,
          description: editForm.description || null,
          price: editForm.price ? Number(editForm.price) : null,
          displayOrder: Number(editForm.displayOrder) || 0,
          productType: editForm.productType || 'product',
        },
      });
      toast.success('Product updated');
      setEditProduct(null);
      setSelectedProduct(null);
    } catch { toast.error('Failed to update'); }
  };

  // ─── Create form state ────────────────
  const emptyCreateForm = {
    providerId: '',
    providerName: '',
    name: '',
    description: '',
    price: '',
    displayOrder: '0',
    productType: 'product' as 'product' | 'service',
    isActive: true,
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createImages, setCreateImages] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const { data: providerResults } = useProviders({ page: 1, limit: 10, search: providerSearch || undefined });

  const MAX_IMAGES = 5;

  const openCreate = () => {
    setCreateForm(emptyCreateForm);
    setCreateImages([]);
    setProviderSearch('');
    setCreateOpen(true);
  };

  const addCreateImages = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setCreateImages((prev) => [...prev, ...incoming].slice(0, MAX_IMAGES));
  };

  const handleCreate = async () => {
    if (!createForm.providerId) { toast.error('Select a provider'); return; }
    if (!createForm.name.trim()) { toast.error('Enter a product name'); return; }
    setCreating(true);
    try {
      const created = await createMutation.mutateAsync({
        providerId: createForm.providerId,
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        price: createForm.price ? Number(createForm.price) : null,
        displayOrder: Number(createForm.displayOrder) || 0,
        productType: createForm.productType,
        isActive: createForm.isActive,
      });
      // Upload any selected images to the newly created product (one or many).
      if (createImages.length && created?.id) {
        try {
          await productsService.uploadImages(created.id, createImages);
        } catch {
          toast.warn('Product created, but image upload failed. You can add photos from the edit panel.');
        }
      }
      toast.success(`${createForm.productType === 'service' ? 'Service' : 'Product'} created for ${createForm.providerName}`);
      setCreateOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  // ─── Table Columns ────────────────────
  const columns: Column<Product>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (row) => {
        const thumb = row.photoUrls?.[0] || row.photoUrl;
        return (
          <div className="flex items-center gap-3">
            {thumb ? (
              <img
                src={thumb}
                alt={row.name}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                style={{ border: '1px solid var(--border-default)' }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--surface-2)' }}
              >
                <Package className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>
                {row.name || 'Untitled'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>
                  {row.provider?.brandName || 'Unknown provider'}
                </span>
                {row.photoUrls?.length > 0 && (
                  <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
                    {row.photoUrls.length} img
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => {
        const isService = row.productType === 'service';
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md capitalize"
            style={{
              background: isService ? '#6366f115' : 'var(--color-success-light)',
              color: isService ? '#6366f1' : 'var(--color-success)',
            }}
          >
            {isService ? <Wrench className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
            {row.productType || 'product'}
          </span>
        );
      },
    },
    {
      key: 'price',
      header: 'Price',
      render: (row) => (
        <span className="text-sm font-semibold" style={{ color: row.price ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {formatPrice(row.price)}
        </span>
      ),
    },
    {
      key: 'images',
      header: 'Images',
      render: (row) => {
        const count = row.photoUrls?.length || 0;
        return (
          <div className="flex items-center gap-1">
            {count > 0 ? (
              <>
                <Image className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>{count}</span>
              </>
            ) : (
              <>
                <ImageOff className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>None</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'hero',
      header: 'Hero',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleHero(row); }}
          className="p-1 rounded-md transition-colors"
          title={row.isHero ? 'Remove hero status' : 'Make hero product'}
          style={{ color: row.isHero ? '#7c3aed' : 'var(--text-muted)' }}
        >
          <Star className="w-4 h-4" style={{ fill: row.isHero ? '#7c3aed' : 'none' }} />
        </button>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      render: (row) => (
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>#{row.displayOrder ?? 0}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded"
          style={{
            background: row.isActive ? 'var(--color-success-light)' : 'var(--surface-2)',
            color: row.isActive ? 'var(--color-success)' : 'var(--text-muted)',
          }}
        >
          {row.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {row.isActive ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (row) => (
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedProduct(row); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text-muted)' }}
            title="View details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <PermissionGate permission="products.update">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text-muted)' }}
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          </PermissionGate>
          <PermissionGate permission="products.update">
          <button
            onClick={(e) => { e.stopPropagation(); handleToggle(row); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
            title={row.isActive ? 'Disable' : 'Activate'}
          >
            {row.isActive
              ? <ToggleRight className="w-4 h-4 text-green-600" />
              : <ToggleLeft className="w-4 h-4 text-gray-400" />
            }
          </button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        description={data?.meta ? `${data.meta.total.toLocaleString()} products & services` : 'Manage provider products & services'}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Products' },
        ]}
        actions={
          <PermissionGate permission="products.update">
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </PermissionGate>
        }
      />

      {/* ═══ Stats ═══ */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <StatCard
            title="Total Products"
            value={stats.total}
            icon={<Package className="w-5 h-5" />}
            accent="var(--color-primary)"
          />
          <StatCard
            title="Active"
            value={stats.active}
            icon={<CheckCircle2 className="w-5 h-5" />}
            accent="var(--color-success)"
          />
          <StatCard
            title="With Images"
            value={stats.withImages}
            icon={<Image className="w-5 h-5" />}
            accent="var(--color-info)"
          />
          <StatCard
            title="Avg Price"
            value={formatPrice(stats.avgPrice)}
            icon={<IndianRupee className="w-5 h-5" />}
            accent="#d97706"
          />
          <StatCard
            title="No Images"
            value={stats.withoutImages}
            icon={<ImageOff className="w-5 h-5" />}
            accent="var(--color-danger)"
          />
        </div>
      )}

      {/* ═══ Type breakdown + top providers ═══ */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {/* Type Breakdown */}
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Types</p>
            <div className="flex-1 flex gap-2">
              {(stats.typeBreakdown ?? []).map(t => {
                const isService = t.type === 'service';
                return (
                  <button
                    key={t.type}
                    onClick={() => { setTypeFilter(typeFilter === t.type ? '' : t.type as '' | 'product' | 'service'); setPage(1); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: typeFilter === t.type ? (isService ? '#6366f115' : 'var(--color-success-light)') : 'var(--surface-1)',
                      color: typeFilter === t.type ? (isService ? '#6366f1' : 'var(--color-success)') : 'var(--text-secondary)',
                      border: `1px solid ${typeFilter === t.type ? (isService ? '#6366f1' : 'var(--color-success)') : 'var(--border-default)'}`,
                    }}
                  >
                    {isService ? <Wrench className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                    {t.type || 'product'}: <span className="font-bold">{t.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Top Providers */}
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <p className="text-xs font-bold uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Top</p>
            <div className="flex-1 flex flex-wrap gap-1.5">
              {(stats.topProviders ?? []).slice(0, 5).map((p, i) => (
                <span key={p.providerId} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg" style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)' }}>
                  <span className="font-bold" style={{ color: i < 3 ? '#f59e0b' : 'var(--text-muted)' }}>#{i + 1}</span>
                  {p.brandName} <span className="opacity-60">({p.count})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Search + Filters ═══ */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by product name, description, provider\u2026"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[var(--surface-2)]">
                <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          {/* Status Pills */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
            {STATUS_PILLS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors"
                style={{
                  background: statusFilter === opt.value ? 'var(--surface-0)' : 'transparent',
                  color: statusFilter === opt.value ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: statusFilter === opt.value ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2.5 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
            style={{
              background: showFilters || activeFilterCount > 0 ? 'var(--color-primary-light)' : 'var(--surface-1)',
              color: showFilters || activeFilterCount > 0 ? 'var(--color-primary)' : 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: 'var(--color-primary)' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Type</label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value as '' | 'product' | 'service'); setPage(1); }}
                className="px-3 py-2 text-sm rounded-lg focus-ring"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              >
                {TYPE_PILLS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Price Range</label>
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: 'var(--text-muted)' }}>\u20B9</span>
                  <input type="number" value={priceMin} onChange={(e) => { setPriceMin(e.target.value); setPage(1); }} placeholder="Min" min={0}
                    className="w-20 pl-5 pr-1 py-2 text-sm rounded-lg focus-ring"
                    style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>\u2013</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: 'var(--text-muted)' }}>\u20B9</span>
                  <input type="number" value={priceMax} onChange={(e) => { setPriceMax(e.target.value); setPage(1); }} placeholder="Max" min={0}
                    className="w-20 pl-5 pr-1 py-2 text-sm rounded-lg focus-ring"
                    style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Images</label>
              <select
                value={hasImages}
                onChange={(e) => { setHasImages(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm rounded-lg focus-ring"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              >
                <option value="">All</option>
                <option value="true">With images</option>
                <option value="false">No images</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="px-3 py-2 text-xs font-medium rounded-md flex items-center gap-1" style={{ color: 'var(--color-danger)' }}>
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══ Data Table ═══ */}
      <DataTable<Product>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={setSelectedProduct}
        emptyIcon={<Package className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />}
        emptyTitle="No products found"
        emptyDescription={search || statusFilter || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'Products will appear here as providers add them'}
      />

      {/* ═══════════════════════════════════════════════════ */}
      {/* PRODUCT DETAIL PANEL                               */}
      {/* ═══════════════════════════════════════════════════ */}
      <DetailPanel
        open={!!selectedProduct && !editProduct}
        onClose={() => setSelectedProduct(null)}
        title="Product Details"
        subtitle={selectedProduct?.provider?.brandName}
        width="lg"
        actions={
          selectedProduct && (
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(selectedProduct)}
                className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => { handleToggle(selectedProduct); setSelectedProduct(null); }}
                className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{
                  background: selectedProduct.isActive ? 'var(--color-danger-light)' : 'var(--color-success-light)',
                  color: selectedProduct.isActive ? 'var(--color-danger)' : 'var(--color-success)',
                }}
              >
                {selectedProduct.isActive ? 'Disable' : 'Activate'}
              </button>
            </div>
          )
        }
      >
        {selectedProduct && (
          <div className="space-y-5">
            {/* Image Gallery */}
            {selectedProduct.photoUrls?.length > 0 ? (
              <div>
                <div className="relative rounded-xl overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                  <img
                    src={selectedProduct.photoUrls[imageViewIdx] || selectedProduct.photoUrls[0]}
                    alt={selectedProduct.name}
                    className="w-full h-56 object-contain"
                  />
                  {selectedProduct.photoUrls.length > 1 && (
                    <>
                      <button
                        onClick={() => setImageViewIdx(i => (i - 1 + selectedProduct.photoUrls.length) % selectedProduct.photoUrls.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setImageViewIdx(i => (i + 1) % selectedProduct.photoUrls.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded bg-black/50 text-white">
                        {imageViewIdx + 1}/{selectedProduct.photoUrls.length}
                      </span>
                    </>
                  )}
                </div>
                {/* Thumbnails */}
                {selectedProduct.photoUrls.length > 1 && (
                  <div className="flex gap-2 mt-2">
                    {selectedProduct.photoUrls.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setImageViewIdx(i)}
                        className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all"
                        style={{
                          border: imageViewIdx === i ? '2px solid var(--color-primary)' : '1px solid var(--border-default)',
                          opacity: imageViewIdx === i ? 1 : 0.6,
                        }}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-32 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                <div className="text-center">
                  <ImageOff className="w-8 h-8 mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No images uploaded</p>
                </div>
              </div>
            )}

            {/* Name + Status Banner */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedProduct.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md capitalize"
                    style={{
                      background: selectedProduct.productType === 'service' ? '#6366f115' : 'var(--color-success-light)',
                      color: selectedProduct.productType === 'service' ? '#6366f1' : 'var(--color-success)',
                    }}
                  >
                    {selectedProduct.productType === 'service' ? <Wrench className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                    {selectedProduct.productType || 'product'}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded"
                    style={{
                      background: selectedProduct.isActive ? 'var(--color-success-light)' : 'var(--surface-2)',
                      color: selectedProduct.isActive ? 'var(--color-success)' : 'var(--text-muted)',
                    }}
                  >
                    {selectedProduct.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {selectedProduct.isActive ? 'Active' : 'Disabled'}
                  </span>
                  {selectedProduct.isHero && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded"
                      style={{ background: '#7c3aed15', color: '#7c3aed' }}
                    >
                      <Star className="w-3 h-3" style={{ fill: '#7c3aed' }} />
                      Hero
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                {formatPrice(selectedProduct.price)}
              </p>
            </div>

            {/* Description */}
            {selectedProduct.description && (
              <div className="p-4 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedProduct.description}</p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <DetailCell label="Display Order" value={`#${selectedProduct.displayOrder ?? 0}`} />
              <DetailCell label="Currency" value={selectedProduct.currency || 'INR'} />
              <DetailCell label="Images" value={`${selectedProduct.photoUrls?.length || 0} uploaded`} />
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Provider</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedProduct.provider?.brandName || 'Unknown'}</p>
              </div>
            </div>

            {/* IDs */}
            <div className="space-y-2">
              <IdRow label="Product ID" value={selectedProduct.id} />
              <IdRow label="Provider ID" value={selectedProduct.providerId} />
            </div>

            {/* Delete */}
            <button
              onClick={() => setConfirmDelete(selectedProduct)}
              className="w-full p-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)20' }}
            >
              <Trash2 className="w-4 h-4" /> Delete Product
            </button>
          </div>
        )}
      </DetailPanel>

      {/* ═══════════════════════════════════════════════════ */}
      {/* EDIT PANEL                                         */}
      {/* ═══════════════════════════════════════════════════ */}
      <DetailPanel
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        title="Edit Product"
        subtitle={editProduct?.name}
        width="lg"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setEditProduct(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}>
              Cancel
            </button>
            <button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
              {updateMutation.isPending ? 'Saving\u2026' : 'Save Changes'}
            </button>
          </div>
        }
      >
        {editProduct && (
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Type</label>
              <div className="flex gap-2">
                {(['product', 'service'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setEditForm({ ...editForm, productType: t })}
                    className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${
                      editForm.productType === t
                        ? t === 'service' ? 'bg-teal-50 border-teal-400 text-teal-700' : 'bg-amber-50 border-amber-400 text-amber-700'
                        : 'border-gray-200 text-gray-500'
                    }`}>
                    {t === 'product' ? '📦 Product' : '🛠️ Service'}
                  </button>
                ))}
              </div>
            </div>
            <FormField label="Product Name" required>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input w-full" />
            </FormField>
            <FormField label="Description">
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="input w-full"
                rows={3}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Price (\u20B9)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>\u20B9</span>
                  <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className="input w-full pl-7" min={0} />
                </div>
              </FormField>
              <FormField label="Display Order">
                <input type="number" value={editForm.displayOrder} onChange={(e) => setEditForm({ ...editForm, displayOrder: e.target.value })} className="input w-full" min={0} />
              </FormField>
            </div>
            {/* Hero Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: editProduct.isHero ? '#7c3aed10' : 'var(--surface-1)', border: `1px solid ${editProduct.isHero ? '#7c3aed40' : 'var(--border-default)'}` }}>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" style={{ color: '#7c3aed', fill: editProduct.isHero ? '#7c3aed' : 'none' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Hero Product</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Featured in "Best Products This Week" on home feed</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleHero(editProduct)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                style={{
                  background: editProduct.isHero ? '#7c3aed' : 'var(--surface-2)',
                  color: editProduct.isHero ? 'white' : 'var(--text-secondary)',
                }}
              >
                {editProduct.isHero ? 'Remove' : 'Make Hero'}
              </button>
            </div>          </div>
        )}
      </DetailPanel>

      {/* ═══ Create Product ═══ */}
      <DetailPanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Product"
        subtitle="Create a product or service for a provider"
        width="lg"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}>
              Cancel
            </button>
            <button onClick={handleCreate} disabled={creating} className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
              {creating ? (createImages.length ? 'Creating & uploading…' : 'Creating…') : 'Create'}
            </button>
          </div>
        }
      >
        <div className="p-5 space-y-5">
          {/* Provider picker */}
          <FormField label="Provider" required>
            {createForm.providerId ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{createForm.providerName}</span>
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, providerId: '', providerName: '' })}
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    placeholder="Search provider by name…"
                    className="input w-full pl-9"
                  />
                </div>
                {providerSearch && (
                  <div className="mt-1.5 max-h-48 overflow-y-auto rounded-lg" style={{ border: '1px solid var(--border-default)' }}>
                    {(providerResults?.items ?? []).length === 0 ? (
                      <p className="text-xs px-3 py-2.5" style={{ color: 'var(--text-muted)' }}>No providers found</p>
                    ) : (
                      (providerResults?.items ?? []).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setCreateForm({ ...createForm, providerId: p.id, providerName: p.brandName }); setProviderSearch(''); }}
                          className="w-full text-left px-3 py-2 text-sm hover:opacity-80"
                          style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)' }}
                        >
                          {p.brandName}
                          {p.city ? <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>· {p.city}</span> : null}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </FormField>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Type</label>
            <div className="flex gap-2">
              {(['product', 'service'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setCreateForm({ ...createForm, productType: t })}
                  className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${
                    createForm.productType === t
                      ? t === 'service' ? 'bg-teal-50 border-teal-400 text-teal-700' : 'bg-amber-50 border-amber-400 text-amber-700'
                      : 'border-gray-200 text-gray-500'
                  }`}>
                  {t === 'product' ? '📦 Product' : '🛠️ Service'}
                </button>
              ))}
            </div>
          </div>

          <FormField label="Name" required>
            <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="input w-full" placeholder="e.g. Bridal Mehndi Package" />
          </FormField>
          <FormField label="Description">
            <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className="input w-full" rows={3} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Price (₹)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>{'₹'}</span>
                <input type="number" value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })} className="input w-full pl-7" min={0} placeholder="0" />
              </div>
            </FormField>
            <FormField label="Display Order">
              <input type="number" value={createForm.displayOrder} onChange={(e) => setCreateForm({ ...createForm, displayOrder: e.target.value })} className="input w-full" min={0} />
            </FormField>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Active</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Visible to customers immediately</p>
            </div>
            <button
              type="button"
              onClick={() => setCreateForm({ ...createForm, isActive: !createForm.isActive })}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              style={{
                background: createForm.isActive ? 'var(--color-primary)' : 'var(--surface-2)',
                color: createForm.isActive ? 'white' : 'var(--text-secondary)',
              }}
            >
              {createForm.isActive ? 'Active' : 'Inactive'}
            </button>
          </div>

          {/* Images (one or many) */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Images <span style={{ color: 'var(--text-muted)' }}>(optional · up to {MAX_IMAGES})</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {createImages.map((file, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCreateImages((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/60 text-white"
                    aria-label="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {createImages.length < MAX_IMAGES && (
                <label className="aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer gap-1" style={{ border: '1px dashed var(--border-default)', color: 'var(--text-muted)' }}>
                  <Image className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { addCreateImages(e.target.files); e.target.value = ''; }}
                  />
                </label>
              )}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              The first image becomes the main photo. JPG/PNG, up to 10MB each.
            </p>
          </div>
        </div>
      </DetailPanel>

      {/* ═══ Delete Confirmation ═══ */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        description={`Are you sure you want to disable "${confirmDelete?.name || 'this product'}"? It will be soft-deleted and hidden from customers.`}
        confirmLabel="Delete Product"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Helper Components ───────────────────

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'var(--surface-1)' }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-[10px] font-mono flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{value}</p>
      <button onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied!'); }} className="p-1 rounded hover:bg-[var(--surface-2)]">
        <Copy className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  );
}
