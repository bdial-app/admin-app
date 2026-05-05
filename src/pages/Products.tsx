import { useState } from 'react';
import { Eye, Trash2, Package } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { useProducts, useUpdateProduct, useDeleteProduct } from '../hooks/useProducts';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Product } from '../types';

const LIMIT = 10;

const formatPrice = (price: number | null) =>
  price != null ? `₹${price.toLocaleString('en-IN')}` : '—';

export default function Products() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const { data, isLoading } = useProducts({
    page,
    limit: LIMIT,
    search: search || undefined,
    isActive: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
  });

  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast.success('Product disabled');
      setConfirmDelete(null);
      setSelectedProduct(null);
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await updateMutation.mutateAsync({ id: product.id, body: { isActive: !product.isActive } });
      toast.success(product.isActive ? 'Product disabled' : 'Product activated');
    } catch {
      toast.error('Failed to update product');
    }
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: row.isActive ? 'var(--color-primary-light)' : 'var(--surface-2)',
              color: row.isActive ? 'var(--color-primary)' : 'var(--text-muted)',
            }}
          >
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {row.name || '—'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {row.provider?.brandName || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (row) => (
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {formatPrice(row.price)}
        </span>
      ),
    },
    {   
      key: 'isActive',
      header: 'Status',
      render: (row) => <StatusBadge status={row.isActive ? 'active' : 'disabled'} />,
    },
    {
      key: 'displayOrder',
      header: 'Order',
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          #{row.displayOrder ?? '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (row) => (
        <div className="flex gap-1">
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onClick={(e) => { e.stopPropagation(); setSelectedProduct(row); }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-danger)' }}
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(row); }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        description={data?.meta ? `${data.meta.total.toLocaleString()} products total` : undefined}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Products' },
        ]}
      />

      <DataTable<Product>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search products…"
        searchValue={search}
        rowKey={(row) => row.id}
        onRowClick={setSelectedProduct}
        filters={
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value as '' | 'true' | 'false'); setPage(1); }}
            className="px-3 py-2 text-sm rounded-lg focus-ring"
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">All Products</option>
            <option value="true">Active</option>
            <option value="false">Disabled</option>
          </select>
        }
      />

      {/* Product Detail Panel */}
      <DetailPanel
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || 'Product Detail'}
        subtitle={selectedProduct?.provider?.brandName || undefined}
        actions={
          selectedProduct && (
            <div className="flex gap-2">
              <button
                onClick={() => handleToggleActive(selectedProduct)}
                className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{
                  background: selectedProduct.isActive ? 'var(--surface-2)' : 'var(--color-success)',
                  color: selectedProduct.isActive ? 'var(--text-secondary)' : 'white',
                }}
              >
                {selectedProduct.isActive ? 'Disable' : 'Activate'}
              </button>
              <button
                onClick={() => setConfirmDelete(selectedProduct)}
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
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Name', value: selectedProduct.name },
                { label: 'Price', value: formatPrice(selectedProduct.price) },
                { label: 'Display Order', value: selectedProduct.displayOrder?.toString() },
                { label: 'Provider', value: selectedProduct.provider?.brandName },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                    {field.label}
                  </p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {field.value || '—'}
                  </p>
                </div>
              ))}
              <div>
                <p className="text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                  Status
                </p>
                <StatusBadge status={selectedProduct.isActive ? 'active' : 'disabled'} />
              </div>
            </div>

            {selectedProduct.description && (
              <div>
                <p className="text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                  Description
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {selectedProduct.description}
                </p>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        description={`Are you sure you want to delete "${confirmDelete?.name || 'this product'}"? It will be soft-deleted and can be restored later.`}
        confirmLabel="Delete Product"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
