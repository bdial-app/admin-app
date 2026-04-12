import { useState, useEffect } from 'react';
import { Folder, FolderOpen, Plus, Save, Edit3, ArrowRight, Loader2 } from 'lucide-react';
import api from '../services/api';

interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  children?: Category[];
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Category>>({});
  const [loading, setLoading] = useState(true);
  
  // Recursively open category tree
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories?limit=1000');
      // Backend returns { data: Category[], meta: {...} } — unwrap the data array
      const list = response.data?.data ?? response.data ?? [];
      setCategories(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setFormData(cat);
    setIsEditing(false);
  };

  const handleAddRootCategory = () => {
    const newCat = {
      id: Math.random().toString(36).substr(2, 9),
      parentId: null,
      name: "New Category",
      slug: "new-category",
      description: "",
      isActive: true,
      displayOrder: categories.length + 1,
      createdAt: new Date().toISOString(),
      children: []
    };
    setSelectedCategory(newCat as Category);
    setFormData(newCat);
    setIsEditing(true);
  };

  const handleAddSubCategory = () => {
    if (!selectedCategory) return;
    const newCat = {
      id: Math.random().toString(36).substr(2, 9),
      parentId: selectedCategory.id,
      name: "New Sub-Category",
      slug: "new-sub-category",
      description: "",
      isActive: true,
      displayOrder: (selectedCategory.children?.length || 0) + 1,
      createdAt: new Date().toISOString(),
      children: []
    };
    // Force expand parent
    setExpandedNodes(prev => ({ ...prev, [selectedCategory.id]: true }));
    setSelectedCategory(newCat as Category);
    setFormData(newCat);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedCategory) return;

    const isNew = selectedCategory.id.length < 15; // our temporary id length is 9

    if (isNew) {
      try {
        const payload = {
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          isActive: formData.isActive,
          displayOrder: formData.displayOrder,
          parentId: selectedCategory.parentId
        };
        const response = await api.post('/categories', payload);
        await fetchCategories();
        setIsEditing(false);
        setSelectedCategory(response.data);
      } catch (error) {
        console.error('Failed to create category:', error);
      }
      return;
    }

    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        isActive: formData.isActive,
        displayOrder: formData.displayOrder,
        parentId: selectedCategory.parentId // Keep existing parentId
      };
      const response = await api.patch(`/categories/${selectedCategory.id}`, payload);
      await fetchCategories();
      setIsEditing(false);
      setSelectedCategory(response.data);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const renderTreeNodes = (nodes: Category[], level = 0) => {
    return (
      <ul className={`${level === 0 ? '' : 'pl-6 mt-1 border-l border-gray-200'} space-y-1`}>
        {nodes.map(node => {
          const hasChildren = node.children && node.children.length > 0;
          const isExpanded = expandedNodes[node.id];
          const isSelected = selectedCategory?.id === node.id;

          return (
            <li key={node.id} className="mt-1">
              <div 
                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
                onClick={() => handleSelectCategory(node)}
              >
                {hasChildren ? (
                  <button onClick={(e) => toggleNode(node.id, e)} className="p-0.5 hover:bg-gray-200 rounded text-gray-500">
                    {isExpanded ? <FolderOpen className="w-4 h-4 text-blue-500" /> : <Folder className="w-4 h-4 text-gray-400" />}
                  </button>
                ) : (
                  <div className="w-5 flex justify-center"><div className="w-1.5 h-1.5 rounded-full bg-gray-300" /></div>
                )}
                <span className={`text-sm ${isSelected ? 'font-semibold' : 'font-medium'} truncate`}>{node.name}</span>
                {!node.isActive && <span className="ml-auto text-[10px] uppercase font-bold text-gray-400 px-1 border rounded">Draft</span>}
              </div>
              
              {hasChildren && isExpanded && renderTreeNodes(node.children || [], level + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Category Management</h2>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Pane: Tree View */}
        <div className="w-1/3 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-semibold text-gray-700">Categories</h3>
            <button onClick={handleAddRootCategory} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-md" title="Add Root Category">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">No categories found.</div>
            ) : (
              renderTreeNodes(categories)
            )}
          </div>
        </div>

        {/* Right Pane: Details & Editor */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
          {selectedCategory ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-700">Category Details</h3>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <>
                      <button onClick={handleAddSubCategory} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                        <Plus className="w-4 h-4" /> Add Sub-category
                      </button>
                      <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                    </>
                  ) : (
                    <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      <Save className="w-4 h-4" /> Save Changes
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {isEditing ? (
                  <div className="space-y-4 max-w-lg">
                    {/* EDIT MODE */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input 
                        type="text" 
                        value={formData.name || ''} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                      <input 
                        type="text" 
                        value={formData.slug || ''} 
                        onChange={(e) => setFormData({...formData, slug: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea 
                        value={formData.description || ''} 
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input 
                          type="checkbox" 
                          checked={formData.isActive || false}
                          onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        Active / Visible
                      </label>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mr-2">Display Order</label>
                        <input 
                          type="number" 
                          value={formData.displayOrder || 0} 
                          onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value)})}
                          className="w-20 px-2 py-1 border rounded-md sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* VIEW MODE */}
                    <div className="grid grid-cols-2 gap-y-4 max-w-xl">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${selectedCategory.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {selectedCategory.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created</h4>
                        <p className="text-sm text-gray-900">{new Date(selectedCategory.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</h4>
                        <p className="text-sm text-gray-900 font-medium">{selectedCategory.name}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Slug</h4>
                        <p className="text-sm text-gray-500 font-mono bg-gray-50 px-1 py-0.5 rounded border border-gray-200 inline-block">{selectedCategory.slug}</p>
                      </div>
                      <div className="col-span-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h4>
                        <p className="text-sm text-gray-700">{selectedCategory.description || <em className="text-gray-400">No description provided</em>}</p>
                      </div>
                      <div className="col-span-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Display Order</h4>
                        <p className="text-sm text-gray-900">{selectedCategory.displayOrder}</p>
                      </div>
                    </div>

                    {/* Sub-categories List */}
                    <div className="pt-6 mt-6 border-t border-gray-100 border-dashed">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                          <Folder className="w-4 h-4 mr-2 text-gray-400" /> 
                          Direct Sub-categories ({selectedCategory.children?.length || 0})
                        </h4>
                      </div>
                      
                      {selectedCategory.children && selectedCategory.children.length > 0 ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-md overflow-hidden">
                          <ul className="divide-y divide-gray-200">
                            {selectedCategory.children.map(child => (
                              <li key={child.id} className="px-4 py-3 flex items-center justify-between hover:bg-white transition-colors cursor-pointer" onClick={() => handleSelectCategory(child)}>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{child.name}</p>
                                  <p className="text-xs text-gray-500">{child.slug}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 border-dashed rounded-md p-4 text-center">
                          No sub-categories exist. Add one using the button above.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
              <Folder className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Category Selected</h3>
              <p className="text-sm max-w-sm mt-1">Select a category from the tree on the left to view details, edit, or configure sub-categories.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;
