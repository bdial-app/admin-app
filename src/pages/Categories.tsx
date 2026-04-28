import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Folder, FolderOpen, Plus, Save, Edit3, ArrowRight, Loader2, ToggleLeft, ToggleRight, X, Tag } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';

interface Category {
  id: string; parentId: string | null; name: string; slug: string; description: string | null;
  isActive: boolean; displayOrder: number; createdAt: string; children?: Category[];
  keywords?: string[] | null;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Category>>({});
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [keywordInput, setKeywordInput] = useState('');
  const keywordRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories/tree');
      const list = response.data ?? [];
      setCategories(Array.isArray(list) ? list : []);
    } catch { console.error('Failed to fetch categories'); }
    finally { setLoading(false); }
  };

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectCategory = (cat: Category) => { setSelectedCategory(cat); setFormData(cat); setIsEditing(false); };

  const handleAddRootCategory = () => {
    const newCat = { id: Math.random().toString(36).substr(2, 9), parentId: null, name: "New Category", slug: "new-category",
      description: "", isActive: true, displayOrder: categories.length + 1, createdAt: new Date().toISOString(), children: [] };
    setSelectedCategory(newCat as Category); setFormData(newCat); setIsEditing(true);
  };

  const handleAddSubCategory = () => {
    if (!selectedCategory) return;
    const newCat = { id: Math.random().toString(36).substr(2, 9), parentId: selectedCategory.id, name: "New Sub-Category", slug: "new-sub-category",
      description: "", isActive: true, displayOrder: (selectedCategory.children?.length || 0) + 1, createdAt: new Date().toISOString(), children: [] };
    setExpandedNodes(prev => ({ ...prev, [selectedCategory.id]: true }));
    setSelectedCategory(newCat as Category); setFormData(newCat); setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedCategory) return;
    const isNew = selectedCategory.id.length < 15;
    const payload = { name: formData.name, isActive: formData.isActive, displayOrder: formData.displayOrder, parentId: selectedCategory.parentId, keywords: formData.keywords ?? [] };

    try {
      if (isNew) {
        const response = await api.post('/categories', payload);
        await fetchCategories(); setIsEditing(false); setSelectedCategory(response.data);
        toast.success('Category created!');
      } else {
        const response = await api.patch(`/categories/${selectedCategory.id}`, payload);
        await fetchCategories(); setIsEditing(false); setSelectedCategory(response.data);
        toast.success('Category updated!');
      }
    } catch { toast.error('Failed to save category'); }
  };

  const renderTreeNodes = (nodes: Category[], level = 0) => (
    <ul className={`${level === 0 ? '' : 'pl-5 mt-0.5'} space-y-0.5`}
      style={level > 0 ? { borderLeft: '1px solid var(--border-default)' } : undefined}>
      {nodes.map(node => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes[node.id];
        const isSelected = selectedCategory?.id === node.id;
        return (
          <li key={node.id}>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
              style={{
                background: isSelected ? 'var(--sidebar-active)' : 'transparent',
                color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget).style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget).style.background = 'transparent'; }}
              onClick={() => handleSelectCategory(node)}>
              {hasChildren ? (
                <button onClick={e => toggleNode(node.id, e)} className="p-0.5 rounded transition-colors" style={{ color: 'var(--text-muted)' }}>
                  {isExpanded ? <FolderOpen className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> : <Folder className="w-4 h-4" />}
                </button>
              ) : (
                <div className="w-5 flex justify-center"><div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--surface-3)' }} /></div>
              )}
              <span className={`text-sm truncate ${isSelected ? 'font-semibold' : 'font-medium'}`}>{node.name}</span>
              {!node.isActive && <span className="ml-auto text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>Draft</span>}
            </div>
            {hasChildren && isExpanded && renderTreeNodes(node.children || [], level + 1)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-5 h-[calc(100vh-8rem)] flex flex-col">
      <div><h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Category Management</h2></div>
      <div className="flex flex-1 gap-5 min-h-0">
        {/* Left: Tree */}
        <div className="w-1/3 card flex flex-col overflow-hidden">
          <div className="px-4 py-3 flex justify-between items-center flex-shrink-0" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--surface-1)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Categories</h3>
            <button onClick={handleAddRootCategory} className="p-1.5 rounded-lg transition-colors hover:bg-primary-light" title="Add Root Category"
              style={{ color: 'var(--color-primary)' }}><Plus className="w-4 h-4" /></button>
          </div>
          <div className="p-3 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex justify-center items-center h-32"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} /></div>
            ) : categories.length === 0 ? (
              <div className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No categories found.</div>
            ) : renderTreeNodes(categories)}
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex-1 card flex flex-col overflow-hidden">
          {selectedCategory ? (
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 flex justify-between items-center flex-shrink-0" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--surface-1)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Category Details</h3>
                <div className="flex gap-2">
                  {!isEditing ? (<>
                    <button onClick={handleAddSubCategory} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}><Plus className="w-3.5 h-3.5" />Sub-category</button>
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}><Edit3 className="w-3.5 h-3.5" />Edit</button>
                  </>) : (
                    <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors"
                      style={{ background: 'var(--color-primary)' }}><Save className="w-3.5 h-3.5" />Save</button>
                  )}
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {isEditing ? (
                  <div className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Name</label>
                      <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                        style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
                      <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl focus-ring" rows={3}
                        style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', resize: 'none' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" />Search Keywords</span>
                      </label>
                      <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
                        Add synonyms / related terms so customers can find providers in this category (e.g. &quot;glazier&quot;, &quot;mirror&quot; for Glass)
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(formData.keywords ?? []).map((kw, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                            style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                            {kw}
                            <button type="button" onClick={() => setFormData({ ...formData, keywords: (formData.keywords ?? []).filter((_, j) => j !== i) })}
                              className="hover:opacity-70"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input ref={keywordRef} type="text" value={keywordInput} onChange={e => setKeywordInput(e.target.value)}
                          placeholder="Type keyword and press Enter"
                          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter' && keywordInput.trim()) {
                              e.preventDefault();
                              const kw = keywordInput.trim().toLowerCase();
                              if (!(formData.keywords ?? []).includes(kw)) {
                                setFormData({ ...formData, keywords: [...(formData.keywords ?? []), kw] });
                              }
                              setKeywordInput('');
                            }
                          }}
                          className="flex-1 px-3 py-2 text-sm rounded-lg focus-ring"
                          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                        <button type="button" onClick={() => {
                          const kw = keywordInput.trim().toLowerCase();
                          if (kw && !(formData.keywords ?? []).includes(kw)) {
                            setFormData({ ...formData, keywords: [...(formData.keywords ?? []), kw] });
                          }
                          setKeywordInput('');
                          keywordRef.current?.focus();
                        }} className="px-3 py-2 text-xs font-semibold rounded-lg text-white"
                          style={{ background: 'var(--color-primary)' }}>Add</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <button type="button" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                        className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {formData.isActive ? <ToggleRight className="w-6 h-6" style={{ color: 'var(--color-success)' }} /> : <ToggleLeft className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />}
                        {formData.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Order</label>
                        <input type="number" value={formData.displayOrder || 0} onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                          className="w-16 px-2 py-1 text-sm rounded-lg focus-ring text-center"
                          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-y-4 max-w-xl">
                      <div>
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Status</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${selectedCategory.isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500'}`}
                          style={!selectedCategory.isActive ? { background: 'var(--surface-2)' } : undefined}>
                          {selectedCategory.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Created</h4>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{new Date(selectedCategory.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Name</h4>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selectedCategory.name}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Slug</h4>
                        <p className="text-xs font-mono px-1.5 py-0.5 rounded inline-block" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{selectedCategory.slug}</p>
                      </div>
                      <div className="col-span-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Description</h4>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedCategory.description || <em style={{ color: 'var(--text-muted)' }}>No description</em>}</p>
                      </div>
                      <div className="col-span-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <Tag className="w-3 h-3" />Search Keywords
                        </h4>
                        {selectedCategory.keywords && selectedCategory.keywords.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedCategory.keywords.map((kw, i) => (
                              <span key={i} className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
                                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{kw}</span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}><em>No keywords</em></p>
                        )}
                      </div>
                    </div>
                    {/* Sub-categories */}
                    <div className="pt-6" style={{ borderTop: '1px dashed var(--border-default)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          <Folder className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />Sub-categories ({selectedCategory.children?.length || 0})</h4>
                      </div>
                      {selectedCategory.children && selectedCategory.children.length > 0 ? (
                        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                          {selectedCategory.children.map((child, i) => (
                            <div key={child.id} className="px-4 py-3 flex items-center justify-between cursor-pointer transition-colors"
                              style={{ borderBottom: i < (selectedCategory.children?.length ?? 0) - 1 ? '1px solid var(--border-light)' : 'none', background: 'var(--surface-0)' }}
                              onMouseEnter={e => (e.currentTarget).style.background = 'var(--surface-1)'}
                              onMouseLeave={e => (e.currentTarget).style.background = 'var(--surface-0)'}
                              onClick={() => handleSelectCategory(child)}>
                              <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{child.name}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{child.slug}</p></div>
                              <ArrowRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm p-4 rounded-xl text-center" style={{ color: 'var(--text-muted)', background: 'var(--surface-1)', border: '1px dashed var(--border-default)' }}>
                          No sub-categories. Add one using the button above.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--surface-2)' }}>
                <Folder className="w-7 h-7" style={{ color: 'var(--text-muted)' }} /></div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No Category Selected</h3>
              <p className="text-sm max-w-sm mt-1" style={{ color: 'var(--text-muted)' }}>Select a category from the tree to view details or configure sub-categories.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;
