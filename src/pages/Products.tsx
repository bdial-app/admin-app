import { useState } from 'react';
import {
  Package, Image, ImageOff, Eye,
  Trash2, ToggleLeft, ToggleRight, Copy, Edit3, IndianRupee,
  CheckCircle2, XCircle, ShoppingBag, Wrench,
  ChevronLeft, ChevronRight, Star, Plus, BarChart3,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProductForm } from '../components/products/ProductForm';
import { ProductAnalytics } from '../components/products/ProductAnalytics';
import { emptyProductForm, type GalleryItem, type ProductFormValues } from '../components/products/product-form-values';
import { StatCard } from '../components/ui/StatCard';
import { FilterBar, useUrlFilters } from '../components/ui/filters';
import { PRODUCT_FILTER_DEFS, PRODUCT_FILTER_KEYS, PRODUCT_SORTS, productSegments, withProductOptions } from '../components/products/product-filters';
import { useProducts, useProductFilterOptions, useProductStats, useUpdateProduct, useDeleteProduct, useCreateProduct } from '../hooks/useProducts';
import { productsService } from '../services/products.service';
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
  const { data: stats } = useProductStats();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const createMutation = useCreateProduct();

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

  // ─── Edit form state ──────────────────
  const [editForm, setEditForm] = useState<ProductFormValues>(emptyProductForm);
  const [editGallery, setEditGallery] = useState<GalleryItem[]>([]);
  const [savingEdit, setSavingEdit] = useState<string | null>(null);

  const openEdit = (p: Product) => {
    setEditForm({
      providerId: p.providerId,
      providerName: p.provider?.brandName ?? '',
      name: p.name || '',
      description: p.description || '',
      price: p.price?.toString() || '',
      displayOrder: p.displayOrder?.toString() || '0',
      productType: (p.productType as 'product' | 'service') || 'product',
      isActive: p.isActive,
      categoryId: p.categoryId ?? '',
      subcategoryId: p.subcategoryId ?? '',
    });
    setEditGallery((p.photoUrls ?? []).map((url) => ({ key: url, url })));
    setEditProduct(p);
  };

  const closeEdit = () => {
    // Free the previews of photos picked but never saved.
    editGallery.forEach((g) => g.file && URL.revokeObjectURL(g.url));
    setEditProduct(null);
  };

  /**
   * Save in order: drop removed photos, upload new ones, then the details and
   * the final photo order (the first is the card photo) in one update.
   */
  /** Photos that saving will delete (saved ones no longer in the gallery). */
  const photosToRemove = editProduct
    ? (editProduct.photoUrls ?? []).filter((u) => !editGallery.some((g) => !g.file && g.url === u))
    : [];
  const [confirmPhotoRemoval, setConfirmPhotoRemoval] = useState(false);

  /** Deleting photos can't be undone: ask first. */
  const requestSaveEdit = () => {
    if (!editForm.name.trim()) { toast.error('Give it a name'); return; }
    if (photosToRemove.length) setConfirmPhotoRemoval(true);
    else void handleSaveEdit();
  };

  const handleSaveEdit = async () => {
    setConfirmPhotoRemoval(false);
    if (!editProduct) return;
    if (!editForm.name.trim()) { toast.error('Give it a name'); return; }
    const id = editProduct.id;
    try {
      const removed = (editProduct.photoUrls ?? []).filter((u) => !editGallery.some((g) => !g.file && g.url === u));
      if (removed.length) setSavingEdit('Removing photos…');
      let current = editProduct.photoUrls ?? [];
      for (const url of removed) current = (await productsService.deleteImage(id, url)).photoUrls ?? [];

      const files = editGallery.filter((g) => g.file).map((g) => g.file as File);
      let uploaded: string[] = [];
      if (files.length) {
        setSavingEdit(`Uploading ${files.length} photo${files.length === 1 ? '' : 's'}…`);
        const before = new Set(current);
        uploaded = ((await productsService.uploadImages(id, files)).photoUrls ?? []).filter((u) => !before.has(u));
      }
      let next = 0;
      const photoUrls = editGallery.map((g) => (g.file ? uploaded[next++] : g.url)).filter((u): u is string => !!u);

      setSavingEdit('Saving…');
      await updateMutation.mutateAsync({
        id,
        body: {
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          price: editForm.price ? Number(editForm.price) : null,
          displayOrder: Number(editForm.displayOrder) || 0,
          productType: editForm.productType,
          isActive: editForm.isActive,
          categoryId: editForm.categoryId || null,
          subcategoryId: editForm.subcategoryId || null,
          photoUrls,
        },
      });
      toast.success(`${editForm.productType === 'service' ? 'Service' : 'Product'} saved`);
      closeEdit();
      setSelectedProduct(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save — nothing you saw as saved was lost; try again');
    } finally {
      setSavingEdit(null);
    }
  };

  // ─── Create form state ────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ProductFormValues>(emptyProductForm);
  const [createImages, setCreateImages] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const MAX_IMAGES = 5;

  const openCreate = () => {
    setCreateForm(emptyProductForm);
    setCreateImages([]);
    setCreateOpen(true);
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
        categoryId: createForm.categoryId || null,
        subcategoryId: createForm.subcategoryId || null,
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
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create product');
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
        onClose={closeEdit}
        title={`Edit ${editForm.productType === 'service' ? 'service' : 'product'}`}
        subtitle={editForm.providerName ? `${editProduct?.name} · ${editForm.providerName}` : editProduct?.name}
        width="900px"
        actions={
          <div className="flex gap-2">
            <button onClick={closeEdit} disabled={!!savingEdit} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}>
              Cancel
            </button>
            <button onClick={requestSaveEdit} disabled={!!savingEdit || !editForm.name.trim()} className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
              {savingEdit ?? 'Save changes'}
            </button>
          </div>
        }
      >
        {editProduct && (
          <ProductForm
            value={editForm}
            onChange={setEditForm}
            images={[]}
            onImagesChange={() => undefined}
            maxImages={MAX_IMAGES}
            lockProvider
            gallery={editGallery}
            onGalleryChange={setEditGallery}
            extra={
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: editProduct.isHero ? '#7c3aed10' : 'var(--surface-1)', border: `1px solid ${editProduct.isHero ? '#7c3aed40' : 'var(--border-default)'}` }}>
                <div className="flex items-center gap-2.5">
                  <Star className="w-4 h-4" style={{ color: '#7c3aed', fill: editProduct.isHero ? '#7c3aed' : 'none' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Hero product</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Featured in "Best Products This Week" on the home feed</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => { await handleToggleHero(editProduct); setEditProduct({ ...editProduct, isHero: !editProduct.isHero }); }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                  style={{ background: editProduct.isHero ? '#7c3aed' : 'var(--surface-2)', color: editProduct.isHero ? 'white' : 'var(--text-secondary)' }}
                >
                  {editProduct.isHero ? 'Remove' : 'Make hero'}
                </button>
              </div>
            }
          />
        )}
      </DetailPanel>

      {/* ═══ Create Product ═══ */}
      <DetailPanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add a product or service"
        subtitle="It will be listed on the business you choose"
        width="900px"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}>
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !createForm.providerId || !createForm.name.trim()}
              title={!createForm.providerId ? 'Choose the business first' : !createForm.name.trim() ? 'Give it a name' : undefined}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {creating ? (createImages.length ? 'Saving & uploading…' : 'Saving…') : 'Add to catalogue'}
            </button>
          </div>
        }
      >
        <ProductForm
          value={createForm}
          onChange={setCreateForm}
          images={createImages}
          onImagesChange={setCreateImages}
          maxImages={MAX_IMAGES}
        />
      </DetailPanel>

      {/* ═══ Confirm photo deletion on save ═══ */}
      <ConfirmDialog
        open={confirmPhotoRemoval}
        onClose={() => setConfirmPhotoRemoval(false)}
        onConfirm={() => void handleSaveEdit()}
        title={`Delete ${photosToRemove.length} photo${photosToRemove.length === 1 ? '' : 's'}?`}
        description={`${photosToRemove.length === 1 ? 'This photo' : 'These photos'} will be removed from "${editForm.name.trim()}" and deleted permanently when you save. Your other changes are saved too.`}
        confirmLabel={`Delete & save`}
        variant="danger"
        isLoading={!!savingEdit}
      >
        <div className="mt-3 flex flex-wrap gap-2">
          {photosToRemove.map((url) => (
            <img key={url} src={url} alt="" className="h-14 w-14 rounded-lg object-cover" style={{ border: '1px solid var(--border-default)' }} />
          ))}
        </div>
      </ConfirmDialog>

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
