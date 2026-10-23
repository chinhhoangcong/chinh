import React, { useState, useEffect } from 'react';
import { X, Save, Package, Barcode, MapPin, Tag, Building2, ShieldAlert, Sparkles, Palette, Ruler } from 'lucide-react';
import { Product } from '../types/warehouse';
import { WarehouseService } from '../services/api';
import { sound } from '../services/audio';

interface ProductFormModalProps {
  product?: Product | null;
  onClose: () => void;
  onSuccess: (product: Product, message: string) => void;
}

const COMMON_COLORS = ['Đen', 'Trắng', 'Xanh Navy', 'Be', 'Xám Tiêu', 'Kaki', 'Nâu', 'Rêu', 'Đỏ Đô'];
const COMMON_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '29', '30', '31', '32', 'FreeSize'];
const FACILITIES = [
  'Cơ sở 1 (Hà Nội)',
  'Cơ sở 2 (TP.HCM)',
  'Kho Tổng (TP.HCM)'
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  onClose,
  onSuccess
}) => {
  const isEdit = Boolean(product);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    color: 'Đen',
    size: 'M',
    quantity: 10,
    facility: 'Cơ sở 1 (Hà Nội)',
    location: 'Kệ A1-01',
    barcode: '',
    unit: 'Cái',
    minStock: 10,
    costPrice: 120000,
    sellingPrice: 249000,
    category: 'Áo Thun',
    supplier: 'Xưởng May FELIXXI',
    description: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        color: product.color || 'Đen',
        size: product.size || 'M',
        quantity: product.quantity ?? 10,
        facility: product.facility || 'Cơ sở 1 (Hà Nội)',
        location: product.location || 'Kệ A1-01',
        barcode: product.barcode || '',
        unit: product.unit || 'Cái',
        minStock: product.minStock ?? 10,
        costPrice: product.costPrice ?? 0,
        sellingPrice: product.sellingPrice ?? 0,
        category: product.category || 'Áo Thun',
        supplier: product.supplier || '',
        description: product.description || ''
      });
    } else {
      // Auto-generate realistic barcode and SKU prefix for FELIXXI
      const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000);
      setFormData(f => ({
        ...f,
        barcode: `893${randomSuffix.toString().slice(0, 10)}`,
        sku: `FLX-${Date.now().toString().slice(-4)}`
      }));
    }
  }, [product]);

  // Helper to suggest SKU from name, color, size
  const autoSuggestSku = () => {
    let prefix = 'FLX';
    const n = formData.name.toUpperCase();
    if (n.includes('THUN')) prefix += '-TSHIRT';
    else if (n.includes('POLO')) prefix += '-POLO';
    else if (n.includes('JEAN')) prefix += '-JEAN';
    else if (n.includes('HOODIE')) prefix += '-HOOD';
    else if (n.includes('KHOÁC') || n.includes('BOMBER')) prefix += '-JACK';
    else if (n.includes('SƠ MI')) prefix += '-SHIRT';
    else prefix += '-ITEM';

    const colCode = formData.color.slice(0, 3).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/g, '') || 'COL';
    const szCode = formData.size.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'M';
    
    setFormData(prev => ({ ...prev, sku: `${prefix}-${colCode}-${szCode}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim() || !formData.barcode.trim()) {
      setError('Vui lòng nhập đầy đủ Mã SKU, Tên sản phẩm và Mã vạch');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Partial<Product> = {
        ...(product ? { id: product.id } : {}),
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        color: formData.color.trim() || 'Tiêu chuẩn',
        size: formData.size.trim() || 'FreeSize',
        quantity: Number(formData.quantity) || 0,
        facility: formData.facility.trim() || 'Cơ sở 1 (Hà Nội)',
        location: formData.location.trim() || 'Kệ A1',
        barcode: formData.barcode.trim(),
        unit: formData.unit.trim() || 'Cái',
        minStock: Number(formData.minStock) || 0,
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        category: formData.category,
        supplier: formData.supplier.trim(),
        description: formData.description.trim()
      };

      const res = await WarehouseService.saveProduct(payload);
      sound.playSuccess();
      onSuccess(res.product, isEdit ? 'Cập nhật thông tin SKU thành công' : 'Đã thêm SKU mới vào kho');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu sản phẩm');
      sound.playError();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                {isEdit ? 'Chỉnh Sửa Thuộc Tính SKU' : 'Thêm Mới Mặt Hàng / SKU Kho'}
              </h3>
              <p className="text-xs text-slate-400">Kho hàng thời trang FELIXXI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 bg-white text-slate-900">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Mã SKU & Tên sản phẩm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-900">
                  1. Mã SKU (*):
                </label>
                <button
                  type="button"
                  onClick={autoSuggestSku}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  title="Tự tạo mã SKU theo Tên, Màu và Size"
                >
                  <Sparkles className="w-3 h-3" /> Gợi ý SKU
                </button>
              </div>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="Ví dụ: FLX-TSHIRT-BLK-M"
                className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Mã vạch Barcode (*):
              </label>
              <input
                type="text"
                required
                value={formData.barcode}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="8935001800123"
                className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono font-bold text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 2. Tên sản phẩm */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              2. Tên sản phẩm (*):
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ví dụ: Áo Thun Cotton Compact FELIXXI"
              className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* 3. Màu sắc & 4. Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            {/* Color */}
            <div>
              <label className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-indigo-600" /> 3. Màu sắc:
              </label>
              <input
                type="text"
                required
                value={formData.color}
                onChange={e => setFormData({ ...formData, color: e.target.value })}
                placeholder="Ví dụ: Đen, Trắng, Xanh Navy..."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-1.5"
              />
              {/* Quick color chips */}
              <div className="flex flex-wrap gap-1">
                {COMMON_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                      formData.color === c
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-indigo-600" /> 4. Size:
              </label>
              <input
                type="text"
                required
                value={formData.size}
                onChange={e => setFormData({ ...formData, size: e.target.value.toUpperCase() })}
                placeholder="Ví dụ: S, M, L, XL, 30, 31..."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-1.5"
              />
              {/* Quick size chips */}
              <div className="flex flex-wrap gap-1">
                {COMMON_SIZES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, size: s }))}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                      formData.size === s
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Số lượng, Đơn vị tính & Cảnh báo tồn */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                5. Số lượng (*):
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className="w-full text-xs px-2.5 py-2.5 bg-white border border-slate-300 rounded-xl text-center font-extrabold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Đơn vị tính:
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Cái, Chiếc, Bộ..."
                className="w-full text-xs px-2.5 py-2.5 bg-white border border-slate-300 rounded-xl text-center font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Cảnh báo min:
              </label>
              <input
                type="number"
                min="0"
                value={formData.minStock}
                onChange={e => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                className="w-full text-xs px-2.5 py-2.5 bg-white border border-slate-300 rounded-xl text-center font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 6. Cơ sở & 7. Vị trí kệ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" /> 6. Cơ sở:
              </label>
              <select
                value={formData.facility}
                onChange={e => setFormData({ ...formData, facility: e.target.value })}
                className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 font-semibold cursor-pointer"
              >
                {FACILITIES.map(fac => (
                  <option key={fac} value={fac} className="text-slate-900 bg-white">{fac}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" /> 7. Vị trí kệ:
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ví dụ: Kệ A1-01, Ô B2..."
                className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Giá vốn nhập (VNĐ):
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.costPrice}
                onChange={e => setFormData({ ...formData, costPrice: parseInt(e.target.value) || 0 })}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Giá bán xuất (VNĐ):
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.sellingPrice}
                onChange={e => setFormData({ ...formData, sellingPrice: parseInt(e.target.value) || 0 })}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Đang lưu vào hệ thống...' : isEdit ? 'Lưu Cập Nhật Mặt Hàng' : 'Thêm Vào Kho FELIXXI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
