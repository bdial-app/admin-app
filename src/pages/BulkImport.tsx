import { useState } from 'react';
import { Download, Store, Package } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ROUTES } from '../utils/constants';
import { downloadTextFile, templateCsv } from '../utils/bulk-import';
import BulkImportProviders from './BulkImportProviders';
import BulkImportProducts from './BulkImportProducts';

type Tab = 'providers' | 'products';

const TABS: { key: Tab; label: string; icon: React.ElementType; blurb: string }[] = [
  { key: 'providers', label: 'Businesses', icon: Store, blurb: 'Upload a sheet of businesses, vet every row, then create them in one go' },
  { key: 'products', label: 'Products & Services', icon: Package, blurb: 'Upload a sheet of items for businesses that already exist' },
];

/** A sheet of items, for admins who have no example to work from. */
const PRODUCT_TEMPLATE = [
  'Business,Item name,Description,Price,Type,Photo link',
  'MASPICES,Garam Masala 100g,House blend ground fresh,120,product,',
  '9876543210,Bridal Mehndi,Full hands and feet,2500,service,',
  'Sochic,Chikankari Kurta,Hand embroidered cotton,1899,product,https://example.com/kurta.jpg',
].join('\n');

/**
 * Both bulk uploads behind one door. They share nothing but this shell — a
 * business sheet creates businesses, an item sheet fills the businesses that
 * are already there.
 */
export default function BulkImport() {
  const [tab, setTab] = useState<Tab>('providers');
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div>
      <PageHeader
        title="Bulk Import"
        description={active.blurb}
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Providers', path: ROUTES.PROVIDERS }, { label: 'Bulk Import' }]}
        actions={
          <button
            onClick={() =>
              tab === 'providers'
                ? downloadTextFile('tijarah-provider-import-template.csv', templateCsv())
                : downloadTextFile('tijarah-product-import-template.csv', PRODUCT_TEMPLATE)
            }
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', background: 'var(--surface-0)' }}
          >
            <Download className="w-4 h-4" /> Template
          </button>
        }
      />

      <div className="flex gap-1 p-1 rounded-lg w-fit mb-5" style={{ background: 'var(--surface-1)' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
              style={{
                background: on ? 'var(--surface-0)' : 'transparent',
                color: on ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: on ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Each flow keeps its own state while the other is hidden, so switching
          tabs mid-import never throws a vetted sheet away. */}
      <div style={{ display: tab === 'providers' ? 'block' : 'none' }}><BulkImportProviders /></div>
      <div style={{ display: tab === 'products' ? 'block' : 'none' }}><BulkImportProducts /></div>
    </div>
  );
}
