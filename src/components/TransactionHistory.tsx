import React, { useState, useEffect } from 'react';
import {
  History,
  PackagePlus,
  PackageMinus,
  ClipboardCheck,
  Search,
  Filter,
  Calendar,
  Building,
  User,
  RotateCw
} from 'lucide-react';
import { WarehouseTransaction } from '../types/warehouse';
import { WarehouseService } from '../services/api';

interface TransactionHistoryProps {
  lastUpdated: string;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ lastUpdated }) => {
  const [transactions, setTransactions] = useState<WarehouseTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await WarehouseService.getTransactions(150, filterType);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterType, lastUpdated]);

  const filtered = transactions.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.productName.toLowerCase().includes(q) ||
      t.barcode.includes(q) ||
      t.staffName.toLowerCase().includes(q) ||
      (t.note && t.note.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Filter */}
      <div className="bg-white text-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo mã vạch, tên hàng, nhân viên quét, ghi chú..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Type pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'IN', label: 'Nhập kho (+)' },
            { id: 'OUT', label: 'Xuất kho (-)' },
            { id: 'AUDIT', label: 'Kiểm kê (=)' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterType === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={fetchTransactions}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors ml-1"
            title="Làm mới lịch sử"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Thời Gian</th>
                <th className="py-3 px-4">Loại Thao Tác</th>
                <th className="py-3 px-4">Sản Phẩm & Mã Vạch</th>
                <th className="py-3 px-4 text-center">Biến Động</th>
                <th className="py-3 px-4 text-center">Trước / Sau</th>
                <th className="py-3 px-4">Ghi Chú & Nhân Viên</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Đang tải nhật ký kho...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <History className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Chưa có giao dịch quét nào</p>
                    <p className="text-xs text-slate-400 mt-1">Khi bạn dùng camera quét mã vạch và nhập/xuất kho, nhật ký sẽ tự động hiển thị ở đây.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(tx => {
                  const isIN = tx.type === 'IN';
                  const isOUT = tx.type === 'OUT';
                  const isAUDIT = tx.type === 'AUDIT';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {new Date(tx.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {new Date(tx.timestamp).toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      {/* Transaction Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isIN && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <PackagePlus className="w-3.5 h-3.5 text-emerald-600" /> Nhập kho
                          </span>
                        )}
                        {isOUT && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <PackageMinus className="w-3.5 h-3.5 text-amber-600" /> Xuất kho
                          </span>
                        )}
                        {isAUDIT && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <ClipboardCheck className="w-3.5 h-3.5 text-purple-600" /> Kiểm kê
                          </span>
                        )}
                      </td>

                      {/* Product & Barcode */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{tx.productName}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {tx.barcode}
                        </div>
                      </td>

                      {/* Quantity Change */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`text-sm font-extrabold ${
                          isIN ? 'text-emerald-600' :
                          isOUT ? 'text-amber-600' :
                          tx.quantityChange >= 0 ? 'text-purple-600' : 'text-rose-600'
                        }`}>
                          {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                        </span>
                      </td>

                      {/* Before / After */}
                      <td className="py-3 px-4 text-center whitespace-nowrap text-xs">
                        <span className="text-slate-400">{tx.quantityBefore}</span>
                        <span className="mx-1.5 text-slate-300">➔</span>
                        <strong className="text-slate-900 font-bold">{tx.quantityAfter}</strong>
                      </td>

                      {/* Note & Staff */}
                      <td className="py-3 px-4">
                        <div className="text-slate-700 text-xs font-medium">
                          {tx.note || <span className="text-slate-300 italic">Không có ghi chú</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span className="flex items-center gap-0.5">
                            <User className="w-3 h-3 text-slate-400" /> {tx.staffName}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Building className="w-3 h-3 text-slate-400" /> {tx.warehouseBranch}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 font-medium">
          Hiển thị <strong>{filtered.length}</strong> giao dịch quét gần nhất
        </div>
      </div>
    </div>
  );
};
