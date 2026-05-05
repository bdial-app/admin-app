import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Folder, FolderOpen, Plus, Save, Edit3, Loader2, X,
  ToggleLeft, ToggleRight, Upload, Trash2, ImageIcon, ChevronRight, Search,
} from 'lucide-react';
import { categoriesService } from '../services/categories.service';
import { toast } from 'react-toastify';
import { PageHeader } from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';

interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  iconStorageKey: string | null;
  imageUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  children?: Category[];
}

/* ─── Helpers ──────────────────────────────────────────── */
const isNewCategory = (cat: Category) => cat.id.length < 15;
const categoryThumb = (cat: Category) => cat.icon || cat.imageUrl || null;

/* ─── Reusable upload zone ─────────────────────────────── */
function UploadZone({
  label, hint, current, onUpload, onRemove, uploading, accept, height = 'h-32', previewClass = 'object-cover',
}: {
  label: string; hint: string; current: string | null; uploading: boolean;
  accept: string; height?: string; previewClass?: string;
  onUpload: (f: File) => void; onRemove: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onUpload(f);
  }, [onUpload]);

  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />

      {current ? (
        <div className="relative group rounded-xl overflow-hidden inline-block" style={{ border: '1px solid var(--border-default)' }}>
          <img src={current} alt={label} className={`${height} ${previewClass} rounded-xl`}
            style={{ minWidth: label.includes('Icon') ? '64px' : '200px', maxWidth: '320px' }} />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
            <button onClick={() => ref.current?.click()} disabled={uploading}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm transition-colors"
              style={{ background: 'var(--surface-0)', color: 'var(--text-primary)' }}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Replace'}
            </button>
            <button onClick={onRemove} disabled={uploading}
              className="p-1.5 rounded-lg bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} disabled={uploading}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`w-full max-w-xs ${height} rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer`}
          style={{
            background: dragOver ? 'var(--color-primary-light)' : 'var(--surface-1)',
            border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--border-default)'}`,
            color: 'var(--text-muted)',
          }}>
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          <span className="text-[11px] font-medium">{hint}</span>
        </button>
      )}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────── */
const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Category>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [treeSearch, setTreeSearch] = useState('');

  // Staged files for new categories (uploaded after save)
  const [stagedIcon, setStagedIcon] = useState<File | null>(null);
  const [stagedImage, setStagedImage] = useState<File | null>(null);
  const [stagedIconPreview, setStagedIconPreview] = useState<string | null>(null);
  const [stagedImagePreview, setStagedImagePreview] = useState<string | null>(null);

  useEffect(() => { fetchCategories(); }, []);

  // Clean up blob URLs
  useEffect(() => {
    return () => {
      if (stagedIconPreview) URL.revokeObjectURL(stagedIconPreview);
      if (stagedImagePreview) URL.revokeObjectURL(stagedImagePreview);
    };
  }, [stagedIconPreview, stagedImagePreview]);

  const clearStaged = () => {
    if (stagedIconPreview) URL.revokeObjectURL(stagedIconPreview);
    if (stagedImagePreview) URL.revokeObjectURL(stagedImagePreview);
    setStagedIcon(null); setStagedImage(null);
    setStagedIconPreview(null); setStagedImagePreview(null);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const list = await categoriesService.list();
      const arr = (list as any)?.data ?? list ?? [];
      setCategories(Array.isArray(arr) ? arr : []);
    } catch { console.error('Failed to fetch categories'); }
    finally { setLoading(false); }
  };

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat); setFormData(cat); setIsEditing(false); clearStaged();
  };

  const handleAddRootCategory = () => {
    clearStaged();
    const newCat: Category = {
      id: Math.random().toString(36).substr(2, 9), parentId: null, name: '', slug: '',
      description: '', icon: null, iconStorageKey: null, imageUrl: null,
      isActive: true, displayOrder: categories.length + 1, createdAt: new Date().toISOString(), children: [],
    };
    setSelectedCategory(newCat); setFormData(newCat); setIsEditing(true);
  };

  const handleAddSubCategory = () => {
    if (!selectedCategory) return;
    clearStaged();
    const newCat: Category = {
      id: Math.random().toString(36).substr(2, 9), parentId: selectedCategory.id, name: '', slug: '',
      description: '', icon: null, iconStorageKey: null, imageUrl: null,
      isActive: true, displayOrder: (selectedCategory.children?.length || 0) + 1, createdAt: new Date().toISOString(), children: [],
    };
    setExpandedNodes(prev => ({ ...prev, [selectedCategory.id]: true }));
    setSelectedCategory(newCat); setFormData(newCat); setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedCategory || !formData.name?.trim()) {
      toast.error('Category name is required');
      return;
    }
    const isNew = isNewCategory(selectedCategory);
    const payload = {
      name: formData.name, description: formData.description || '',
      isActive: formData.isActive, displayOrder: formData.displayOrder,
      parentId: selectedCategory.parentId,
    };

    try {
      setSaving(true);
      let saved: Category;
      if (isNew) {
        saved = await categoriesService.create(payload as any);
        toast.success('Category created!');
      } else {
        saved = await categoriesService.update(selectedCategory.id, payload as any);
        toast.success('Category updated!');
      }

      // Upload staged files after create
      if (stagedIcon) {
        try {
          saved = await categoriesService.uploadIcon(saved.id, stagedIcon);
        } catch { toast.error('Created, but icon upload failed'); }
      }
      if (stagedImage) {
        try {
          saved = await categoriesService.uploadImage(saved.id, stagedImage);
        } catch { toast.error('Created, but image upload failed'); }
      }

      clearStaged();
      await fetchCategories();
      setIsEditing(false);
      setSelectedCategory(saved);
      setFormData(saved);
    } catch { toast.error('Failed to save category'); }
    finally { setSaving(false); }
  };

  /* ── Upload handlers ── */
  const handleUploadIcon = async (file: File) => {
    if (!selectedCategory) return;
    if (isNewCategory(selectedCategory)) {
      setStagedIcon(file);
      setStagedIconPreview(URL.createObjectURL(file));
      return;
    }
    try {
      setUploadingIcon(true);
      const updated = await categoriesService.uploadIcon(selectedCategory.id, file);
      setSelectedCategory(updated); setFormData(updated); await fetchCategories();
      toast.success('Icon uploaded!');
    } catch { toast.error('Failed to upload icon'); }
    finally { setUploadingIcon(false); }
  };

  const handleDeleteIcon = async () => {
    if (!selectedCategory) return;
    if (isNewCategory(selectedCategory)) {
      if (stagedIconPreview) URL.revokeObjectURL(stagedIconPreview);
      setStagedIcon(null); setStagedIconPreview(null);
      return;
    }
    try {
      setUploadingIcon(true);
      const updated = await categoriesService.deleteIcon(selectedCategory.id);
      setSelectedCategory(updated); setFormData(updated); await fetchCategories();
      toast.success('Icon removed');
    } catch { toast.error('Failed to delete icon'); }
    finally { setUploadingIcon(false); }
  };

  const handleUploadImage = async (file: File) => {
    if (!selectedCategory) return;
    if (isNewCategory(selectedCategory)) {
      setStagedImage(file);
      setStagedImagePreview(URL.createObjectURL(file));
      return;
    }
    try {
      setUploadingImage(true);
      const updated = await categoriesService.uploadImage(selectedCategory.id, file);
      setSelectedCategory(updated); setFormData(updated); await fetchCategories();
      toast.success('Image uploaded!');
    } catch { toast.error('Failed to upload image'); }
    finally { setUploadingImage(false); }
  };

  const handleDeleteImage = async () => {
    if (!selectedCategory) return;
    if (isNewCategory(selectedCategory)) {
      if (stagedImagePreview) URL.revokeObjectURL(stagedImagePreview);
      setStagedImage(null); setStagedImagePreview(null);
      return;
    }
    try {
      setUploadingImage(true);
      const updated = await categoriesService.deleteImage(selectedCategory.id);
      setSelectedCategory(updated); setFormData(updated); await fetchCategories();
      toast.success('Image removed');
    } catch { toast.error('Failed to delete image'); }
    finally { setUploadingImage(false); }
  };

  /* ── Tree filtering ── */
  const filterTree = (nodes: Category[], query: string): Category[] => {
    if (!query) return nodes;
    const lq = query.toLowerCase();
    return nodes.reduce<Category[]>((acc, node) => {
      const childMatch = node.children ? filterTree(node.children, query) : [];
      if (node.name.toLowerCase().includes(lq) || childMatch.length > 0) {
        acc.push({ ...node, children: childMatch.length > 0 ? childMatch : node.children });
      }
      return acc;
    }, []);
  };

  const filteredCategories = filterTree(categories, treeSearch);

  /* ── Tree renderer ── */
  const renderTreeNodes = (nodes: Category[], level = 0) => (
    <ul className={level > 0 ? 'pl-4 ml-2 space-y-0.5' : 'space-y-0.5'}
      style={level > 0 ? { borderLeft: '1.5px solid var(--border-light)' } : undefined}>
      {nodes.map(node => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes[node.id] || !!treeSearch;
        const isSelected = selectedCategory?.id === node.id;
        const thumb = categoryThumb(node);
        return (
          <li key={node.id}>
            <div
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all group ${isSelected ? 'shadow-sm' : ''}`}
              style={{
                background: isSelected ? 'var(--sidebar-active)' : 'transparent',
                border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              onClick={() => handleSelectCategory(node)}
            >
              {/* Expand toggle */}
              {hasChildren ? (
                <button onClick={e => toggleNode(node.id, e)}
                  className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0">
                  {isExpanded
                    ? <FolderOpen className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                    : <Folder className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                </button>
              ) : (
                <span className="w-5 flex-shrink-0" />
              )}

              {/* Thumbnail */}
              {thumb ? (
                <img src={thumb} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                  style={{ border: '1px solid var(--border-light)' }} />
              ) : (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--surface-2)' }}>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                    {node.name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}

              {/* Name */}
              <span className={`text-[13px] truncate flex-1 ${isSelected ? 'font-semibold' : 'font-medium'}`}
                style={{ color: isSelected ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                {node.name}
              </span>

              {/* Badges */}
              {!node.isActive && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: 'var(--color-warning-dark)', background: 'var(--color-warning-light)' }}>
                  Draft
                </span>
              )}
              {hasChildren && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
                  {node.children!.length}
                </span>
              )}
            </div>
            {hasChildren && isExpanded && renderTreeNodes(node.children!, level + 1)}
          </li>
        );
      })}
    </ul>
  );

  /* ── Current resolved icon/image for display ── */
  const displayIcon = selectedCategory
    ? (isNewCategory(selectedCategory) ? stagedIconPreview : selectedCategory.icon)
    : null;
  const displayImage = selectedCategory
    ? (isNewCategory(selectedCategory) ? stagedImagePreview : selectedCategory.imageUrl)
    : null;

  /* ── Render ── */
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      <PageHeader
        title="Categories"
        description="Manage categories, sub-categories, icons and images"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Categories' }]}
        actions={
          <button onClick={handleAddRootCategory}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-all hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}>
            <Plus className="w-4 h-4" /> New Category
          </button>
        }
      />

      <div className="flex flex-1 gap-5 min-h-0">
        {/* ── Left: Category Tree ── */}
        <div className="w-80 flex-shrink-0 card flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text" placeholder="Search categories…" value={treeSearch}
                onChange={e => setTreeSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-[13px] rounded-lg outline-none transition-colors"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
              {treeSearch && (
                <button onClick={() => setTreeSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5 transition-colors">
                  <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
            </div>
          </div>

          {/* Tree */}
          <div className="p-2 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</span>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-[13px] text-center py-8" style={{ color: 'var(--text-muted)' }}>
                {treeSearch ? 'No matching categories.' : 'No categories yet.'}
              </div>
            ) : renderTreeNodes(filteredCategories)}
          </div>

          {/* Footer count */}
          {!loading && (
            <div className="px-3 py-2 text-[11px] font-medium flex-shrink-0"
              style={{ borderTop: '1px solid var(--border-light)', color: 'var(--text-muted)', background: 'var(--surface-1)' }}>
              {categories.length} categories
            </div>
          )}
        </div>

        {/* ── Right: Detail / Edit ── */}
        <div className="flex-1 card flex flex-col overflow-hidden">
          {selectedCategory ? (
            <>
              {/* Header */}
              <div className="px-5 py-3.5 flex items-center gap-3 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--surface-1)' }}>
                {/* Category avatar */}
                {(displayIcon || displayImage) ? (
                  <img src={(displayIcon || displayImage)!} alt="" className="w-9 h-9 rounded-xl object-cover"
                    style={{ border: '1px solid var(--border-default)' }} />
                ) : (
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--sidebar-active)' }}>
                    <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                      {formData.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {isNewCategory(selectedCategory)
                      ? (formData.name || 'New Category')
                      : selectedCategory.name}
                  </h3>
                  {selectedCategory.parentId && (
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>Sub-category</p>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {!isEditing ? (
                    <>
                      <button onClick={handleAddSubCategory}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                        <Plus className="w-3.5 h-3.5" /> Sub-category
                      </button>
                      <button onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                        style={{ background: 'var(--sidebar-active)', color: 'var(--color-primary)' }}>
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setIsEditing(false); setFormData(selectedCategory); clearStaged(); }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                        style={{ color: 'var(--text-muted)' }}>
                        Cancel
                      </button>
                      <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'var(--color-primary)' }}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {isNewCategory(selectedCategory) ? 'Create' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {isEditing ? (
                  /* ─── Edit Form ─── */
                  <div className="space-y-6 max-w-xl">
                    {/* Name + Description */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                          Category Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <input
                          type="text" placeholder="e.g. Food & Catering" autoFocus
                          value={formData.name || ''}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition-all"
                          style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
                        <textarea
                          placeholder="Brief description of this category…"
                          value={formData.description || ''}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition-all" rows={3}
                          style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', resize: 'vertical' }}
                        />
                      </div>
                    </div>

                    {/* Status + Order row */}
                    <div className="flex items-center gap-8">
                      <button type="button" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                        className="flex items-center gap-2 text-sm font-medium transition-colors" style={{ color: 'var(--text-secondary)' }}>
                        {formData.isActive
                          ? <ToggleRight className="w-7 h-7" style={{ color: 'var(--color-success)' }} />
                          : <ToggleLeft className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />}
                        {formData.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Order</label>
                        <input type="number" value={formData.displayOrder ?? 0}
                          onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2.5 py-1.5 text-sm rounded-lg outline-none text-center"
                          style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                      </div>
                    </div>

                    {/* Media section */}
                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Media</h4>
                      <div className="grid grid-cols-2 gap-5">
                        <UploadZone
                          label="Icon" hint="PNG or SVG, small square" accept="image/png,image/svg+xml"
                          current={displayIcon} uploading={uploadingIcon} height="h-16" previewClass="object-contain p-1"
                          onUpload={handleUploadIcon} onRemove={handleDeleteIcon}
                        />
                        <UploadZone
                          label="Cover Image" hint="PNG/JPEG, rectangular" accept="image/png,image/jpeg,image/webp"
                          current={displayImage} uploading={uploadingImage} height="h-28"
                          onUpload={handleUploadImage} onRemove={handleDeleteImage}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ─── View Mode ─── */
                  <div className="space-y-6">
                    {/* Media preview banner */}
                    {(displayIcon || displayImage) ? (
                      <div className="flex items-start gap-5 p-4 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                        {displayIcon && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Icon</p>
                            <img src={displayIcon} alt="icon" className="w-16 h-16 rounded-xl object-contain p-1"
                              style={{ border: '1px solid var(--border-default)', background: 'var(--surface-0)' }} />
                          </div>
                        )}
                        {displayImage && (
                          <div className="flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Cover Image</p>
                            <img src={displayImage} alt="cover" className="h-24 max-w-sm rounded-xl object-cover"
                              style={{ border: '1px solid var(--border-default)' }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 rounded-xl"
                        style={{ background: 'var(--surface-1)', border: '1px dashed var(--border-default)' }}>
                        <ImageIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                          No icon or image uploaded. Click <strong>Edit</strong> to add media.
                        </p>
                      </div>
                    )}

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Name</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedCategory.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Slug</p>
                        <code className="text-xs px-2 py-0.5 rounded"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{selectedCategory.slug}</code>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Status</p>
                        <StatusBadge status={selectedCategory.isActive ? 'active' : 'disabled'} />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Display Order</p>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedCategory.displayOrder}</p>
                      </div>
                      {selectedCategory.description && (
                        <div className="col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Description</p>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedCategory.description}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Created</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(selectedCategory.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Sub-categories */}
                    {selectedCategory.children && selectedCategory.children.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                          style={{ color: 'var(--text-muted)' }}>
                          <Folder className="w-3.5 h-3.5" />
                          Sub-categories ({selectedCategory.children.length})
                        </h4>
                        <div className="grid gap-2">
                          {selectedCategory.children.map(child => {
                            const cThumb = categoryThumb(child);
                            return (
                              <div
                                key={child.id}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all group"
                                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-light)' }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                                  e.currentTarget.style.background = 'var(--sidebar-active)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = 'var(--border-light)';
                                  e.currentTarget.style.background = 'var(--surface-0)';
                                }}
                                onClick={() => handleSelectCategory(child)}
                              >
                                {cThumb ? (
                                  <img src={cThumb} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                    style={{ border: '1px solid var(--border-light)' }} />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'var(--surface-2)' }}>
                                    <span className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                      {child.name?.[0]?.toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{child.name}</p>
                                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{child.slug}</p>
                                </div>
                                {!child.isActive && (
                                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ color: 'var(--color-warning-dark)', background: 'var(--color-warning-light)' }}>
                                    Draft
                                  </span>
                                )}
                                <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ color: 'var(--color-primary)' }} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Empty sub-categories */}
                    {(!selectedCategory.children || selectedCategory.children.length === 0) && !selectedCategory.parentId && (
                      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                        <div className="text-center py-6 rounded-xl"
                          style={{ background: 'var(--surface-1)', border: '1px dashed var(--border-default)' }}>
                          <Folder className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                          <p className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>No sub-categories yet</p>
                          <button onClick={handleAddSubCategory}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                            style={{ background: 'var(--sidebar-active)', color: 'var(--color-primary)' }}>
                            <Plus className="w-3.5 h-3.5" /> Add Sub-category
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ─── Empty state ─── */
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'var(--surface-2)' }}>
                <Folder className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No Category Selected</h3>
              <p className="text-sm max-w-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Select a category from the tree or create a new one to get started.
              </p>
              <button onClick={handleAddRootCategory}
                className="mt-5 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-all hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                <Plus className="w-4 h-4" /> New Category
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;
