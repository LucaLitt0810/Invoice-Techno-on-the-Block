'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Product, PRODUCT_UNITS } from '@/types';
import { formatCurrency } from '@/lib/utils/helpers';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Fetch ALL products (shared data, no company filter)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      unit: formData.get('unit') as string,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(data)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase.from('products').insert(data);
        if (error) throw error;
        toast.success('Product created successfully');
      }

      setShowModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Failed to save product');
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            Products & Services
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Shared products - all users can access and manage these.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
        </div>
        <input
          type="text"
          className="input block w-full pl-10 bg-dark-800 border-dark-500 text-white"
          placeholder="Search products by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Products table */}
      <div className="card bg-dark-800 border-dark-500">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-dark-500">
            <thead className="bg-dark-700">
              <tr>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Description</th>
                <th className="table-header-cell">Unit</th>
                <th className="table-header-cell">Price</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-500">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    {searchQuery ? 'No products found matching your search.' : 'No products yet. Create your first product!'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-dark-700/50">
                    <td className="table-cell font-medium text-white">
                      {product.name}
                    </td>
                    <td className="table-cell text-gray-400">
                      {product.description || '-'}
                    </td>
                    <td className="table-cell text-gray-400">
                      {PRODUCT_UNITS.find(u => u.value === product.unit)?.label || product.unit || 'Piece'}
                    </td>
                    <td className="table-cell text-white">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setShowModal(true);
                          }}
                          className="text-gray-400 hover:text-white"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ProductModal
          editingProduct={editingProduct}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// Separate component for modal to avoid hydration issues
function ProductModal({
  editingProduct,
  onClose,
  onSave,
}: {
  editingProduct: Product | null;
  onClose: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative bg-dark-800 border border-dark-500 max-w-lg w-full p-8">
          <h3 className="text-lg font-medium text-white uppercase tracking-wider mb-8">
            {editingProduct ? 'Edit Product' : 'Add Product'}
          </h3>
          <form onSubmit={onSave} className="space-y-6">
            <div>
              <label htmlFor="name" className="label">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                defaultValue={editingProduct?.name}
                className="input bg-dark-800 border-dark-500 text-white"
              />
            </div>
            <div>
              <label htmlFor="description" className="label">
                Description
              </label>
              <input
                type="text"
                name="description"
                id="description"
                defaultValue={editingProduct?.description || ''}
                className="input bg-dark-800 border-dark-500 text-white"
              />
            </div>
            <div>
              <label htmlFor="unit" className="label">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                name="unit"
                id="unit"
                required
                defaultValue={editingProduct?.unit || 'piece'}
                className="input bg-dark-800 border-dark-500 text-white"
              >
                {PRODUCT_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value} className="bg-dark-800">
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="price" className="label">
                Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                id="price"
                required
                min="0"
                step="0.01"
                defaultValue={editingProduct?.price}
                className="input bg-dark-800 border-dark-500 text-white"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
              >
                Cancel
              </button>
              <button type="submit" className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider">
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
