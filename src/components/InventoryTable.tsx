import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Minus,
  Download,
  Printer,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  Barcode as BarcodeIcon,
  Layers,
  MapPin,
  Building2,
  Palette,
  Ruler,
  CheckCircle2
} from 'lucide-react';
import { Product } from '../types/warehouse';
import { WarehouseService } from '../services/api';
import { sound } from '../services/audio';

interface InventoryTableProps {
  products: Product[];
  onRefresh: () => void;
  onSelectBarcode: (barcode: string) => void;
  onEditProduct: (product: Product) => void;
  onPrintBarcode: (product: Product) => void;
  onAddNewProduct: () => void;
  staffName: string;
  warehouseBranch: string;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  onRefresh,
  onSelectBarcode,
  onEditProduct,
  onPrintBarcode,
  onAddNewProduct,
  staffName,
  warehouseBranch
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [sortField, setSortField] = useState<'sku' | 'name' | 'quantity' | 'facility' | 'location' | 'updatedAt'>('updatedAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Quick adjust loading state
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  // Extract unique facilities from products
  const facilities = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.facility) set.add(p.facility);
    });
    return Array.from(set);
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        // Search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const match =
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.color && p.color.toLowerCase().includes(q)) ||
            (p.size && p.size.toLowerCase().includes(q)) ||
            (p.facility && p.facility.toLowerCase().includes(q)) ||
            (p.location && p.location.toLowerCase().includes(q)) ||
            (p.barcode && p.barcode.includes(q));
          if (!match) return false;
        }

        // Facility
        if (selectedFacility !== 'ALL' && p.facility !== selectedFacility) {
          return false;
        }

        // Stock status
        if (stockFilter === 'OUT_OF_STOCK' && p.quantity > 0) return false;
        if (stockFilter === 'LOW_STOCK' && (p.quantity <= 0 || p.quantity > (p.minStock || 10))) return false;
        if (stockFilter === 'IN_STOCK' && p.quantity <= (p.minStock || 10)) return false;

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      });
  }, [products, searchTerm, selectedFacility, stockFilter, sortField, sortAsc]);

  // Quick Stock Adjust (+1 or -1 directly from list)
  const handleQuickAdjust = async (product: Product, delta: number) => {
    if (delta < 0 && product.quantity <= 0) return;
    setAdjustingId(product.id);
    try {
      await WarehouseService.recordTransaction({
        barcode: product.barcode,
        type: delta > 0 ? 'IN' : 'OUT',
        amount: Math.abs(delta),
        note: `Thao tác nhanh trên bảng SKU kho (${delta > 0 ? '+' : ''}${delta})`,
        staffName,
        warehouseBranch: product.facility || warehouseBranch
      });
      sound.playSuccess();
      onRefresh();
    } catch (err: any) {
      sound.playError();
      alert(err.message || 'Lỗi điều chỉnh tồn kho');
    } finally {
      setAdjustingId(null);
    }
  };

  // Delete product with confirmation
  const handleDelete = async (product: Product) => {
    if (window.confirm(`Bạn có chắc muốn xoá SKU "${product.sku} - ${product.name}" khỏi kho?`)) {
      try {
        await WarehouseService.deleteProduct(product.id);
        sound.playSuccess();
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'Lỗi xoá sản phẩm');
      }
    }
  };

  const toggleSort = (field: 'sku' | 'name' | 'quantity' | 'facility' | 'location' | 'updatedAt') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="bg-white text-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Mã SKU, Tên, Màu, Size, Cơ sở, Kệ, Mã vạch..."
              className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 placeholder:text-slate-400 font-semibold"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddNewProduct}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm SKU Mới
            </button>

            <button
              type="button"
              onClick={() => WarehouseService.exportToCSV(products)}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Xuất danh sách tồn kho sang Excel / CSV"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Xuất Excel
            </button>
          </div>
        </div>

        {/* Filters: Facility dropdown & Stock status buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Stock status filter buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-bold mr-1">Tồn kho:</span>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'IN_STOCK', label: 'Còn hàng' },
              { id: 'LOW_STOCK', label: 'Sắp hết' },
              { id: 'OUT_OF_STOCK', label: 'Hết hàng' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStockFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stockFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Facility Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Cơ sở:
            </span>
            <select
              value={selectedFacility}
              onChange={e => setSelectedFacility(e.target.value)}
              className="bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả cơ sở ({products.length})</option>
              {facilities.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-extrabold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('sku')}
                    className="flex items-center gap-1 hover:text-indigo-600 font-bold"
                  >
                    Mã SKU & Tên Sản Phẩm <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3">Phân Loại (Màu / Size)</th>
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => toggleSort('facility')}
                    className="flex items-center gap-1 hover:text-indigo-600 font-bold"
                  >
                    Cơ Sở <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => toggleSort('location')}
                    className="flex items-center gap-1 hover:text-indigo-600 font-bold"
                  >
                    Vị Trí Kệ <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => toggleSort('quantity')}
                    className="flex items-center justify-center gap-1 hover:text-indigo-600 mx-auto font-bold"
                  >
                    Số Lượng <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-center">Nhập / Xuất Nhanh</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">Không tìm thấy sản phẩm nào</p>
                    <p className="text-xs text-slate-400 mt-1">Thử đổi từ khoá tìm kiếm hoặc bấm &quot;Thêm SKU Mới&quot;</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const isOutOfStock = p.quantity <= 0;
                  const isLowStock = p.quantity > 0 && p.quantity <= (p.minStock || 10);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      {/* 1. Mã SKU & 2. Tên Sản Phẩm */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {p.sku}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {p.barcode}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectBarcode(p.barcode)}
                            className="font-bold text-slate-900 text-xs hover:text-indigo-600 text-left transition-colors mt-1"
                          >
                            {p.name}
                          </button>
                        </div>
                      </td>

                      {/* 3. Màu sắc & 4. Size */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            <Palette className="w-3 h-3 text-indigo-500" />
                            {p.color || '—'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200">
                            <Ruler className="w-3 h-3 text-indigo-600" />
                            {p.size || '—'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Cơ sở */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-slate-800 font-semibold text-[11px]">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{p.facility || 'Cơ sở 1'}</span>
                        </div>
                      </td>

                      {/* 7. Vị trí kệ */}
                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-1 text-slate-900 font-extrabold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          <span>{p.location}</span>
                        </div>
                      </td>

                      {/* 5. Số lượng tồn kho */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-sm font-black ${
                            isOutOfStock ? 'text-red-600' :
                            isLowStock ? 'text-amber-600' : 'text-slate-900'
                          }`}>
                            {p.quantity} <span className="text-[11px] font-normal text-slate-500">cái</span>
                          </span>

                          {isOutOfStock ? (
                            <span className="text-[10px] text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.2 rounded-full font-bold mt-0.5">
                              Hết hàng
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded-full font-bold mt-0.5">
                              Min: {p.minStock || 10}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Quick Adjust Buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            disabled={adjustingId === p.id || p.quantity <= 0}
                            onClick={() => handleQuickAdjust(p, -1)}
                            className="w-7 h-7 bg-white hover:bg-amber-50 text-amber-700 rounded-lg font-bold flex items-center justify-center border border-slate-200 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                            title="Xuất nhanh 1 cái"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={adjustingId === p.id}
                            onClick={() => handleQuickAdjust(p, 1)}
                            className="w-7 h-7 bg-white hover:bg-emerald-50 text-emerald-700 rounded-lg font-bold flex items-center justify-center border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                            title="Nhập nhanh 1 cái"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectBarcode(p.barcode)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium text-xs flex items-center gap-1 cursor-pointer"
                            title="Quét / Nhập xuất phiếu chi tiết"
                          >
                            <BarcodeIcon className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onPrintBarcode(p)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="In tem mã vạch SKU"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditProduct(p)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Sửa thông tin SKU"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xoá khỏi kho"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 font-semibold gap-2">
          <span>Hiển thị <strong>{filteredProducts.length}</strong> / {products.length} SKU</span>
          <span>Tổng số lượng tồn: <strong className="text-indigo-700 font-extrabold">{filteredProducts.reduce((sum, p) => sum + p.quantity, 0)}</strong> cái</span>
        </div>
      </div>
    </div>
  );
};
