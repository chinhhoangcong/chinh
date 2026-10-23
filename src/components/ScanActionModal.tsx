import React, { useState, useEffect } from 'react';
import {
  X,
  PackagePlus,
  PackageMinus,
  ClipboardCheck,
  MapPin,
  Tag,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Building,
  Info,
  Palette,
  Ruler,
  Layers,
  Sparkles
} from 'lucide-react';
import { Product, TransactionType } from '../types/warehouse';
import { WarehouseService } from '../services/api';
import { sound } from '../services/audio';

interface ScanActionModalProps {
  barcode: string | null;
  onClose: () => void;
  onSuccess: (updatedProduct: Product, message: string) => void;
  staffName: string;
  warehouseBranch: string;
}

const COMMON_COLORS = ['Đen', 'Trắng', 'Xanh Navy', 'Be', 'Xám Tiêu', 'Kaki'];
const COMMON_SIZES = ['S', 'M', 'L', 'XL', '2XL', '30', '31', '32'];
const FACILITIES = [
  'Cơ sở 1 (Hà Nội)',
  'Cơ sở 2 (TP.HCM)',
  'Kho Tổng (TP.HCM)'
];

export const ScanActionModal: React.FC<ScanActionModalProps> = ({
  barcode,
  onClose,
  onSuccess,
  staffName,
  warehouseBranch
}) => {
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'IN' | 'OUT' | 'AUDIT'>('IN');

  // Transaction form states
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New product registration state (when barcode not in database)
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [newForm, setNewForm] = useState({
    sku: '',
    name: '',
    color: 'Đen',
    size: 'M',
    quantity: 10,
    facility: 'Cơ sở 1 (Hà Nội)',
    location: 'Kệ A1-01',
    unit: 'Cái',
    minStock: 10,
    costPrice: 120000,
    sellingPrice: 249000
  });

  // Load product info on open
  useEffect(() => {
    if (!barcode) return;

    let mounted = true;
    setLoading(true);
    setFeedback(null);

    WarehouseService.getProductByBarcode(barcode)
      .then(p => {
        if (!mounted) return;
        if (p) {
          setProduct(p);
          setIsNewProduct(false);
          setQuantity(1);
        } else {
          setProduct(null);
          setIsNewProduct(true);
          setNewForm({
            sku: `FLX-${barcode.slice(-4)}`,
            name: '',
            color: 'Đen',
            size: 'M',
            quantity: 10,
            facility: warehouseBranch || 'Cơ sở 1 (Hà Nội)',
            location: 'Kệ A1-01',
            unit: 'Cái',
            minStock: 10,
            costPrice: 120000,
            sellingPrice: 249000
          });
        }
      })
      .catch(err => {
        if (!mounted) return;
        console.error(err);
        setFeedback({ type: 'error', message: 'Không thể truy vấn thông tin mã vạch này' });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [barcode, warehouseBranch]);

  if (!barcode) return null;

  // Handle standard transaction: IN, OUT, AUDIT
  const handleExecuteTransaction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!product) return;

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setFeedback({ type: 'error', message: 'Số lượng phải lớn hơn 0' });
      return;
    }

    if (activeTab === 'OUT' && qty > product.quantity) {
      setFeedback({
        type: 'error',
        message: `Số lượng xuất (${qty}) vượt quá tồn kho hiện tại (${product.quantity} ${product.unit || 'cái'})!`
      });
      sound.playError();
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await WarehouseService.recordTransaction({
        barcode: product.barcode,
        type: activeTab as TransactionType,
        amount: qty,
        note: note.trim(),
        staffName,
        warehouseBranch: product.facility || warehouseBranch
      });

      if (res.product) {
        sound.playSuccess();
        onSuccess(res.product, res.message);
        onClose();
      }
    } catch (err: any) {
      sound.playError();
      setFeedback({
        type: 'error',
        message: err.message || 'Thao tác không thành công, vui lòng thử lại'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle registering brand new product
  const handleCreateNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim() || !newForm.sku.trim()) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập tên sản phẩm và mã SKU' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await WarehouseService.saveProduct({
        barcode,
        sku: newForm.sku.trim().toUpperCase(),
        name: newForm.name.trim(),
        color: newForm.color.trim() || 'Tiêu chuẩn',
        size: newForm.size.trim().toUpperCase() || 'FreeSize',
        quantity: Number(newForm.quantity) || 0,
        facility: newForm.facility.trim() || 'Cơ sở 1 (Hà Nội)',
        location: newForm.location.trim() || 'Kệ A1',
        unit: newForm.unit.trim() || 'Cái',
        minStock: Number(newForm.minStock) || 10,
        costPrice: Number(newForm.costPrice) || 0,
        sellingPrice: Number(newForm.sellingPrice) || 0
      });

      sound.playSuccess();
      onSuccess(res.product, `Đã thêm SKU mới: ${res.product.sku} - ${res.product.name} (Tồn kho: ${res.product.quantity} cái)`);
      onClose();
    } catch (err: any) {
      sound.playError();
      setFeedback({ type: 'error', message: err.message || 'Lỗi lưu sản phẩm mới' });
    } finally {
      setSubmitting(false);
    }
  };

  // Stock status badge
  const getStockBadge = (p: Product) => {
    if (p.quantity <= 0) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-200">
          Hết hàng (0)
        </span>
      );
    }
    if (p.quantity <= (p.minStock || 10)) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          Sắp hết ({p.quantity} {p.unit || 'cái'})
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
        Còn hàng ({p.quantity} {p.unit || 'cái'})
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-sm border border-indigo-500/30">
              |||
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                {isNewProduct ? 'Đăng Ký SKU Mới FELIXXI' : 'Nhập / Xuất / Kiểm Kê Kho'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">Mã vạch: {barcode}</p>
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Loading indicator */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">Đang tra cứu dữ liệu kho FELIXXI...</p>
            </div>
          )}

          {/* Error / Success Alerts */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 ${
                feedback.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200 font-semibold'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
              }`}
            >
              {feedback.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{feedback.message}</div>
            </div>
          )}

          {/* CASE 1: PRODUCT FOUND IN SYSTEM */}
          {!loading && product && (
            <div className="space-y-4">
              {/* Product Info Card with all 7 SKU Attributes */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded-md">
                        {product.sku}
                      </span>
                      {product.color && (
                        <span className="text-[11px] font-bold bg-white text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Palette className="w-3 h-3 text-indigo-500" /> {product.color}
                        </span>
                      )}
                      {product.size && (
                        <span className="text-[11px] font-bold bg-white text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Ruler className="w-3 h-3 text-indigo-500" /> Size {product.size}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-slate-900 leading-snug mt-1.5">
                      {product.name}
                    </h4>
                  </div>
                  {getStockBadge(product)}
                </div>

                {/* Facility, Location, Stock */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Cơ sở: <strong className="text-slate-900 font-bold">{product.facility || 'Cơ sở 1'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Vị trí: <strong className="text-slate-900 font-bold">{product.location}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Giá bán: <strong className="text-slate-900 font-bold">{product.sellingPrice?.toLocaleString('vi-VN')} đ</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Tồn kho: <strong className="text-indigo-700 font-extrabold text-sm">{product.quantity}</strong> {product.unit || 'cái'}</span>
                  </div>
                </div>
              </div>

              {/* Action Tabs: IN / OUT / AUDIT */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('IN')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'IN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PackagePlus className="w-4 h-4" /> Nhập Kho (+)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('OUT')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'OUT'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PackageMinus className="w-4 h-4" /> Xuất Kho (-)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('AUDIT')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'AUDIT'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" /> Kiểm Kê (=)
                </button>
              </div>

              {/* Transaction Input Form */}
              <form onSubmit={handleExecuteTransaction} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-900">
                      {activeTab === 'IN' && 'Số lượng nhập thêm:'}
                      {activeTab === 'OUT' && 'Số lượng xuất kho:'}
                      {activeTab === 'AUDIT' && 'Số lượng thực tế trên kệ (Kiểm kê):'}
                    </label>
                    <span className="text-xs text-slate-600 font-semibold">
                      Đơn vị: <strong className="text-indigo-600">{product.unit || 'Cái'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold text-lg text-slate-800 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 h-11 text-center font-extrabold text-xl text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold text-lg text-slate-800 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-slate-500 font-bold">Nhanh:</span>
                    {[1, 5, 10, 20, 50].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setQuantity(val)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          quantity === val
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        +{val}
                      </button>
                    ))}
                  </div>

                  {/* Stock preview */}
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-600">Tồn kho hiện tại: <strong className="text-slate-900">{product.quantity}</strong> cái</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">
                      Sau thay đổi:{' '}
                      <strong className={`font-bold ${
                        activeTab === 'IN' ? 'text-emerald-600' :
                        activeTab === 'OUT' ? 'text-amber-600' : 'text-purple-600'
                      }`}>
                        {activeTab === 'IN' ? product.quantity + quantity :
                         activeTab === 'OUT' ? Math.max(0, product.quantity - quantity) :
                         quantity} cái
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Ghi chú phiếu xuất/nhập/kiểm kê:
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Ví dụ: Nhập bổ sung đợt 2, xuất giao cho khách..."
                    className="w-full text-xs px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-white text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    activeTab === 'OUT' ? 'bg-amber-600 hover:bg-amber-700' :
                    'bg-purple-600 hover:bg-purple-700'
                  } ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {submitting ? (
                    'Đang đồng bộ...'
                  ) : activeTab === 'IN' ? (
                    <>
                      <PackagePlus className="w-4 h-4" /> Xác Nhận Nhập +{quantity} cái
                    </>
                  ) : activeTab === 'OUT' ? (
                    <>
                      <PackageMinus className="w-4 h-4" /> Xác Nhận Xuất -{quantity} cái
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-4 h-4" /> Cập Nhật Kiểm Kê: {quantity} cái
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* CASE 2: BRAND NEW PRODUCT REGISTRATION */}
          {!loading && isNewProduct && (
            <form onSubmit={handleCreateNewProduct} className="space-y-3.5">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Mã vạch mới:</strong> Chưa có trong kho FELIXXI. Nhập 7 thuộc tính SKU bên dưới để thêm mới ngay:
                </div>
              </div>

              {/* SKU & Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Mã SKU (*):</label>
                  <input
                    type="text"
                    required
                    value={newForm.sku}
                    onChange={e => setNewForm({ ...newForm, sku: e.target.value.toUpperCase() })}
                    placeholder="FLX-TSHIRT-BLK-M"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 placeholder:text-slate-400 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Cơ sở (*):</label>
                  <select
                    value={newForm.facility}
                    onChange={e => setNewForm({ ...newForm, facility: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {FACILITIES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Tên sản phẩm (*):</label>
                <input
                  type="text"
                  required
                  value={newForm.name}
                  onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="Ví dụ: Áo Thun Trơn Compact FELIXXI"
                  className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Color & Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Màu sắc (*):</label>
                  <input
                    type="text"
                    required
                    value={newForm.color}
                    onChange={e => setNewForm({ ...newForm, color: e.target.value })}
                    placeholder="Đen, Trắng..."
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-1"
                  />
                  <div className="flex flex-wrap gap-1">
                    {COMMON_COLORS.slice(0, 4).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewForm({ ...newForm, color: c })}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700 cursor-pointer"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Size (*):</label>
                  <input
                    type="text"
                    required
                    value={newForm.size}
                    onChange={e => setNewForm({ ...newForm, size: e.target.value.toUpperCase() })}
                    placeholder="S, M, L..."
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-1"
                  />
                  <div className="flex flex-wrap gap-1">
                    {COMMON_SIZES.slice(0, 5).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewForm({ ...newForm, size: s })}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700 cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quantity & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Số lượng tồn ban đầu:</label>
                  <input
                    type="number"
                    min="0"
                    value={newForm.quantity}
                    onChange={e => setNewForm({ ...newForm, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl text-center font-extrabold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Vị trí kệ kho:</label>
                  <input
                    type="text"
                    value={newForm.location}
                    onChange={e => setNewForm({ ...newForm, location: e.target.value })}
                    placeholder="Kệ A1-01"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PackagePlus className="w-4 h-4" />
                  {submitting ? 'Đang lưu vào kho...' : 'Lưu SKU Mới Vào Kho FELIXXI'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-slate-400" /> {warehouseBranch}
          </span>
          <span>Nhân viên: <strong className="text-slate-700">{staffName}</strong></span>
        </div>
      </div>
    </div>
  );
};
