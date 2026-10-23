import React, { useState, useEffect, useCallback } from 'react';
import {
  Barcode,
  Boxes,
  History,
  Printer,
  PackagePlus,
  PackageMinus,
  ClipboardCheck,
  Search,
  RefreshCw,
  Plus,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  Sparkles,
  Database
} from 'lucide-react';
import { Product, WarehouseStats, ScanMode } from './types/warehouse';
import { WarehouseService } from './services/api';
import { BarcodeScanner } from './components/BarcodeScanner';
import { ScanActionModal } from './components/ScanActionModal';
import { InventoryTable } from './components/InventoryTable';
import { TransactionHistory } from './components/TransactionHistory';
import { BarcodeGeneratorModal } from './components/BarcodeGeneratorModal';
import { ProductFormModal } from './components/ProductFormModal';
import { SyncStatusBar } from './components/SyncStatusBar';
import { PWAInstallButton } from './components/PWAInstallButton';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'SCAN' | 'INVENTORY' | 'HISTORY' | 'LABELS'>('SCAN');

  // Scanner states
  const [scanMode, setScanMode] = useState<ScanMode>('IN');
  const [activeBarcode, setActiveBarcode] = useState<string | null>(null);

  // Warehouse data
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<WarehouseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  // Staff and warehouse branch state (stored in localStorage for convenience)
  const [staffName, setStaffName] = useState<string>(() => {
    return localStorage.getItem('wh_staff_name') || 'Nguyễn Văn Kho';
  });
  const [warehouseBranch, setWarehouseBranch] = useState<string>(() => {
    return localStorage.getItem('wh_branch_name') || 'Kho Tổng (TP.HCM)';
  });

  // Modal triggers
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printTargetProduct, setPrintTargetProduct] = useState<Product | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Staff & branch change persistence
  const handleStaffChange = (name: string) => {
    setStaffName(name);
    localStorage.setItem('wh_staff_name', name);
  };

  const handleBranchChange = (branch: string) => {
    setWarehouseBranch(branch);
    localStorage.setItem('wh_branch_name', branch);
  };

  // Fetch warehouse data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, statsRes] = await Promise.all([
        WarehouseService.getProducts(),
        WarehouseService.getStats()
      ]);
      setProducts(prodRes.products);
      setStats(statsRes);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('Failed to load warehouse data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle scanned barcode from camera
  const handleBarcodeScanned = (code: string) => {
    setActiveBarcode(code);
  };

  // Callback when a scan action modal completes
  const handleScanSuccess = (updatedProduct: Product, message: string) => {
    showToast(message, 'success');
    loadData();
  };

  // Handle demo reset
  const handleResetDemo = async () => {
    if (window.confirm('Khôi phục dữ liệu kho mẫu ban đầu? Toàn bộ giao dịch thử nghiệm sẽ được làm mới.')) {
      try {
        await WarehouseService.resetDemo();
        showToast('Đã khôi phục dữ liệu mẫu ban đầu!', 'info');
        loadData();
      } catch (err: any) {
        showToast(err.message || 'Lỗi đặt lại dữ liệu', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. Sync & Device Status Top Bar */}
      <SyncStatusBar
        staffName={staffName}
        onStaffNameChange={handleStaffChange}
        warehouseBranch={warehouseBranch}
        onBranchChange={handleBranchChange}
        onManualSyncTrigger={loadData}
      />

      {/* 2. Main Application Header */}
      <header className="bg-slate-900 border-b border-slate-800/80 px-4 sm:px-6 py-4 no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white shrink-0">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Kho FELIXXI
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Mobile Barcode
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Quét mã vạch camera điện thoại • Tự động đồng bộ tồn kho thời gian thực
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          {stats && (
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-1 md:pb-0 text-xs">
              <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl px-3 py-2 flex items-center gap-2 shrink-0">
                <Boxes className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Mặt hàng</div>
                  <div className="font-bold text-white text-sm">{stats.totalProducts}</div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl px-3 py-2 flex items-center gap-2 shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Tổng tồn kho</div>
                  <div className="font-bold text-white text-sm">{stats.totalQuantity.toLocaleString('vi-VN')}</div>
                </div>
              </div>

              {stats.lowStockCount > 0 && (
                <div className="bg-amber-950/70 border border-amber-800/60 rounded-xl px-3 py-2 flex items-center gap-2 shrink-0">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-[10px] text-amber-300 font-medium">Sắp hết hàng</div>
                    <div className="font-bold text-amber-400 text-sm">{stats.lowStockCount}</div>
                  </div>
                </div>
              )}

              {stats.outOfStockCount > 0 && (
                <div className="bg-red-950/70 border border-red-800/60 rounded-xl px-3 py-2 flex items-center gap-2 shrink-0">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <div>
                    <div className="text-[10px] text-rose-300 font-medium">Hết hàng</div>
                    <div className="font-bold text-rose-400 text-sm">{stats.outOfStockCount}</div>
                  </div>
                </div>
              )}

              <PWAInstallButton className="shrink-0" />
            </div>
          )}
        </div>
      </header>

      {/* 3. Navigation Tabs */}
      <div className="bg-slate-900/60 border-b border-slate-800/60 px-4 sm:px-6 sticky top-0 z-30 backdrop-blur-md no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex items-center gap-1 sm:gap-2 py-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('SCAN')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'SCAN'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Máy Quét Camera</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('INVENTORY')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'INVENTORY'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Danh Mục Kho ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'HISTORY'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Nhật Ký Quét</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPrintTargetProduct(null);
                setShowPrintModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all whitespace-nowrap"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>In Tem Mã Vạch</span>
            </button>
          </nav>

          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Làm mới dữ liệu từ máy chủ kho"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4. Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 no-print">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`mb-4 p-3.5 rounded-xl text-xs font-bold flex items-center justify-between gap-3 shadow-lg animate-fadeIn ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : toast.type === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-indigo-600 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: SCANNER */}
        {activeTab === 'SCAN' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Camera Scanner Viewport */}
            <div className="lg:col-span-7 flex flex-col items-center">
              {/* Scan Mode Switcher Pills */}
              <div className="w-full max-w-xl mb-3 flex items-center justify-between bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setScanMode('IN')}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    scanMode === 'IN'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PackagePlus className="w-3.5 h-3.5" /> Nhập Kho (+)
                </button>

                <button
                  type="button"
                  onClick={() => setScanMode('OUT')}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    scanMode === 'OUT'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PackageMinus className="w-3.5 h-3.5" /> Xuất Kho (-)
                </button>

                <button
                  type="button"
                  onClick={() => setScanMode('AUDIT')}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    scanMode === 'AUDIT'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" /> Kiểm Kê (=)
                </button>

                <button
                  type="button"
                  onClick={() => setScanMode('LOOKUP')}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    scanMode === 'LOOKUP'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" /> Tra Cứu
                </button>
              </div>

              {/* Barcode Camera Component */}
              <BarcodeScanner
                onScan={handleBarcodeScanned}
                active={activeTab === 'SCAN'}
                scanMode={scanMode}
              />
            </div>

            {/* Right: Quick Inventory Glance & Instructions */}
            <div className="lg:col-span-5 space-y-4">
              {/* Quick instructions card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  <Smartphone className="w-4 h-4" /> Hướng dẫn quét trên điện thoại
                </div>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">1</span>
                    <span>Đưa camera vào sát mã vạch (EAN-13, Code 128, QR Code) trên bao bì hoặc thùng hàng.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">2</span>
                    <span>Khi nghe tiếng <strong>Bíp</strong>, hệ thống tự động nhận dạng sản phẩm và hiện phiếu nhập/xuất.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">3</span>
                    <span>Dữ liệu ngay lập tức được <strong>tự động đồng bộ</strong> vào máy chủ kho hàng trung tâm.</span>
                  </li>
                </ul>
              </div>

              {/* Recent Products in Warehouse */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Sản phẩm quét gần đây
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('INVENTORY')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Xem tất cả ({products.length}) →
                  </button>
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {products.slice(0, 6).map(p => (
                    <div
                      key={p.id}
                      onClick={() => setActiveBarcode(p.barcode)}
                      className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div className="flex-1 truncate pr-2">
                        <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 truncate transition-colors">
                          {p.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-mono">
                          <span>{p.barcode}</span>
                          <span>•</span>
                          <span className="text-indigo-300">{p.location}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold ${
                          p.quantity <= 0 ? 'text-red-400' :
                          p.quantity <= p.minStock ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {p.quantity} {p.unit}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          {p.sellingPrice.toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY MANAGEMENT */}
        {activeTab === 'INVENTORY' && (
          <InventoryTable
            products={products}
            onRefresh={loadData}
            onSelectBarcode={code => setActiveBarcode(code)}
            onEditProduct={prod => {
              setEditingProduct(prod);
              setShowProductModal(true);
            }}
            onPrintBarcode={prod => {
              setPrintTargetProduct(prod);
              setShowPrintModal(true);
            }}
            onAddNewProduct={() => {
              setEditingProduct(null);
              setShowProductModal(true);
            }}
            staffName={staffName}
            warehouseBranch={warehouseBranch}
          />
        )}

        {/* TAB 3: TRANSACTION AUDIT HISTORY */}
        {activeTab === 'HISTORY' && (
          <TransactionHistory lastUpdated={lastUpdated} />
        )}
      </main>

      {/* 5. Modals */}
      {/* Barcode Action Modal (Pops up when barcode is scanned or clicked) */}
      {activeBarcode && (
        <ScanActionModal
          barcode={activeBarcode}
          onClose={() => setActiveBarcode(null)}
          onSuccess={handleScanSuccess}
          staffName={staffName}
          warehouseBranch={warehouseBranch}
        />
      )}

      {/* Product Form Modal (Add / Edit full product) */}
      {showProductModal && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSuccess={(prod, msg) => {
            showToast(msg, 'success');
            loadData();
          }}
        />
      )}

      {/* Printable Barcode Sheet Modal */}
      {showPrintModal && (
        <BarcodeGeneratorModal
          products={products}
          selectedProduct={printTargetProduct}
          onClose={() => {
            setShowPrintModal(false);
            setPrintTargetProduct(null);
          }}
        />
      )}

      {/* 6. Footer */}
      <footer className="mt-auto py-4 px-6 bg-slate-900 border-t border-slate-800 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-400" />
          <span>Hệ thống Quản lý Kho Hàng Nội bộ • Lưu trữ thời gian thực</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDemo}
            className="hover:text-slate-300 underline transition-colors"
          >
            Khôi phục kho dữ liệu mẫu
          </button>
          <span>•</span>
          <span>Camera Engine: HTML5-QRCode v2</span>
        </div>
      </footer>
    </div>
  );
}
