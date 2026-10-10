import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Image, ImageOff, Eye,
  Trash2, ToggleLeft, ToggleRight, Copy, Edit3, IndianRupee,
  CheckCircle2, XCircle, ShoppingBag, Wrench,
  ChevronLeft, ChevronRight, Star, Plus, BarChart3, Store, ArrowUpRight,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProductEditPanel } from '../components/products/ProductEditPanel';
import { ProductCreatePanel } from '../components/products/ProductCreatePanel';
import { ProductAnalytics } from '../components/products/ProductAnalytics';
import { StatCard } from '../components/ui/StatCard';
import { FilterBar, useUrlFilters } from '../components/ui/filters';
import { PRODUCT_FILTER_DEFS, PRODUCT_FILTER_KEYS, PRODUCT_SORTS, productSegments, withProductOptions } from '../components/products/product-filters';
import { useProducts, useProductFilterOptions, useProductStats, useUpdateProduct, useDeleteProduct } from '../hooks/useProducts';
import { ROUTES } from '../utils/constants';
import type { Product, ProductFilters } from '../types';
import { toast } from 'react-toastify';
import { PermissionGate } from '../components/auth/PermissionGate';

const LIMIT = 25;

const formatPrice = (price: number | null | undefined) =>
  price != null && price > 0 ? `\u20B9${Number(price).toLocaleString('en-IN')}` : '\u2014';

export default function Products() {
  const { values: filters, page, search, sort, update, replace, setSearch, setSort, setPage, hasNarrowing } = useUrlFilters(PRODUCT_FILTER_KEYS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [view, setView] = useState<'catalogue' | 'analytics'>('catalogue');
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [imageViewIdx, setImageViewIdx] = useState(0);

  const { data, isLoading } = useProducts({
    ...(filters as ProductFilters),
    sort: (sort || undefined) as ProductFilters['sort'],
    page,
    limit: LIMIT,
    search: search || undefined,
  });
  const { data: filterOptions } = useProductFilterOptions();
  const navigate = useNavigate();
  // Category names from the filter options already loaded for the filter bar.
  const categoryNames = new Map((filterOptions?.categories ?? []).map((c) => [c.id, c.name]));
  const categoryName = (id?: string | null) => (id ? (categoryNames.get(id) ?? null) : null);
  const { data: stats } = useProductStats();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const typeFilter = filters.productType ?? '';
  const totalCount = filterOptions?.counts.total ?? stats?.total;

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

  const openEdit = (p: Product) => setEditProduct(p);
  const [createOpen, setCreateOpen] = useState(false);
  const openCreate = () => setCreateOpen(true);

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
                <span className="text-[10px] truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>
                  {categoryName(row.categoryId) ?? 'No category'}
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
      key: 'business',
      header: 'Business',
      render: (row) => {
        const p = row.provider;
        if (!p) return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>;
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/providers/${row.providerId}`); }}
            className="group flex max-w-[220px] items-center gap-2.5 text-left"
            title="Open this business"
          >
            {p.profilePhotoUrl ? (
              <img src={p.profilePhotoUrl} alt="" className="h-8 w-8 flex-shrink-0 rounded-full object-cover" style={{ border: '1px solid var(--border-default)' }} />
            ) : (
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--surface-2)' }}>
                <Store className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium group-hover:underline" style={{ color: 'var(--color-primary)' }}>{p.brandName}</span>
              <span className="block truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {[p.area, p.city].filter(Boolean).join(', ') || '—'}
                {p.status && p.status !== 'active' ? ` · ${p.status}` : ''}
              </span>
            </span>
          </button>
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
        description={
          data?.meta
            ? hasNarrowing && totalCount != null
              ? `${data.meta.total.toLocaleString()} of ${totalCount.toLocaleString()} products & services match your filters`
              : `${data.meta.total.toLocaleString()} products & services`
            : 'Manage provider products & services'
        }
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

      {/* Catalogue (the list) or Analytics (how products perform) */}
      <div className="mb-4 flex gap-1 rounded-lg p-1 w-fit" style={{ background: 'var(--surface-1)' }}>
        {([
          { key: 'catalogue', label: 'Catalogue', icon: Package },
          { key: 'analytics', label: 'Analytics', icon: BarChart3 },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: view === t.key ? 'var(--surface-0)' : 'transparent',
              color: view === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: view === t.key ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {view === 'analytics' && <ProductAnalytics />}
      {view === 'catalogue' && (
      <>

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
                    onClick={() => update({ productType: typeFilter === t.type ? undefined : t.type })}
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

      {/* ═══ Filters ═══ */}
      <FilterBar
        defs={withProductOptions(PRODUCT_FILTER_DEFS, filterOptions)}
        values={filters}
        onChange={update}
        onReplace={replace}
        search={{ value: search, onChange: setSearch, placeholder: 'Search by product name, description, business…' }}
        sort={{ options: PRODUCT_SORTS, value: sort, onChange: setSort, defaultLabel: 'Sort: display order' }}
        segments={productSegments(filterOptions)}
        resultCount={hasNarrowing ? data?.meta?.total : undefined}
        totalCount={totalCount}
      />

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
        emptyTitle={hasNarrowing ? 'No products match these filters' : 'No products yet'}
        emptyDescription={hasNarrowing ? 'Remove a filter or pick a different segment above.' : 'Products will appear here as providers add them'}
      />
      </>
      )}

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
                {/* Viewing only — photos are added, removed and reordered in Edit. */}
                <button
                  onClick={() => openEdit(selectedProduct)}
                  className="mt-2 w-full py-2 text-xs font-medium rounded-lg border border-dashed flex items-center justify-center gap-1.5"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit photos
                </button>
              </div>
            ) : (
              <button
                onClick={() => openEdit(selectedProduct)}
                className="w-full h-32 rounded-xl flex items-center justify-center border border-dashed"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border-default)' }}
              >
                <div className="text-center">
                  <ImageOff className="w-8 h-8 mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No photos yet — add them in Edit</p>
                </div>
              </button>
            )}

            {/* Title, badges, price */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>{selectedProduct.name}</h3>
                <p className="whitespace-nowrap text-xl font-black" style={{ color: 'var(--text-primary)' }}>{formatPrice(selectedProduct.price)}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize"
                  style={{
                    background: selectedProduct.productType === 'service' ? '#6366f115' : 'var(--color-success-light)',
                    color: selectedProduct.productType === 'service' ? '#6366f1' : 'var(--color-success)',
                  }}
                >
                  {selectedProduct.productType === 'service' ? <Wrench className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                  {selectedProduct.productType || 'product'}
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: selectedProduct.isActive ? 'var(--color-success-light)' : 'var(--surface-2)',
                    color: selectedProduct.isActive ? 'var(--color-success)' : 'var(--text-muted)',
                  }}
                >
                  {selectedProduct.isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {selectedProduct.isActive ? 'Live for customers' : 'Hidden'}
                </span>
                {selectedProduct.isHero && (
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: '#7c3aed15', color: '#7c3aed' }}>
                    <Star className="h-3 w-3" style={{ fill: '#7c3aed' }} /> Hero
                  </span>
                )}
              </div>
            </div>

            {/* Sold by — the business, one click away */}
            {selectedProduct.provider && (
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-1)' }}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sold by</p>
                <div className="flex items-center gap-3">
                  {selectedProduct.provider.profilePhotoUrl ? (
                    <img src={selectedProduct.provider.profilePhotoUrl} alt="" className="h-11 w-11 flex-shrink-0 rounded-full object-cover" style={{ border: '1px solid var(--border-default)' }} />
                  ) : (
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--surface-2)' }}>
                      <Store className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedProduct.provider.brandName}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                      {[selectedProduct.provider.area, selectedProduct.provider.city].filter(Boolean).join(', ') || 'Location not set'}
                      {selectedProduct.provider.status ? ` · ${selectedProduct.provider.status === 'active' ? 'verified' : selectedProduct.provider.status}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/providers/${selectedProduct.providerId}`)}
                    className="flex flex-shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    View business <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => { setSearch(selectedProduct.provider?.brandName ?? ''); setSelectedProduct(null); }}
                  className="mt-2.5 text-xs font-medium underline-offset-2 hover:underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Show all their products
                </button>
              </div>
            )}

            {/* Description */}
            {selectedProduct.description && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedProduct.description}</p>
              </div>
            )}

            {/* Facts */}
            <div className="grid grid-cols-2 gap-3">
              <DetailCell label="Category" value={categoryName(selectedProduct.categoryId) ?? 'Not set'} />
              <DetailCell label="Position" value={`#${selectedProduct.displayOrder ?? 0} · lower shows first`} />
              <DetailCell label="Photos" value={`${selectedProduct.photoUrls?.length || 0} of 5`} />
              <DetailCell
                label="Added"
                value={selectedProduct.createdAt ? new Date(selectedProduct.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—'}
              />
            </div>

            {/* Less-used actions, out of the way */}
            <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
              <button
                onClick={() => { void navigator.clipboard.writeText(selectedProduct.id); toast.success('Product ID copied'); }}
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--text-muted)' }}
                title="For support and bug reports"
              >
                <Copy className="h-3 w-3" /> Copy product ID
              </button>
              <button
                onClick={() => setConfirmDelete(selectedProduct)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete product
              </button>
            </div>
          </div>
        )}
      </DetailPanel>

      {editProduct && (
        <ProductEditPanel
          key={editProduct.id}
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={() => setSelectedProduct(null)}
        />
      )}

      {createOpen && <ProductCreatePanel onClose={() => setCreateOpen(false)} />}

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

