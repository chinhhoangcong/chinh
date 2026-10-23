import { Product, WarehouseTransaction, WarehouseStats, OfflineAction } from '../types/warehouse';

const OFFLINE_QUEUE_KEY = 'warehouse_offline_queue';
const CACHED_PRODUCTS_KEY = 'warehouse_cached_products';

export class WarehouseService {
  private static isOnlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private static listeners: Array<(status: boolean) => void> = [];

  static init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnlineStatus = true;
        this.notifyStatus(true);
        this.syncOfflineQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnlineStatus = false;
        this.notifyStatus(false);
      });
    }
  }

  static onNetworkChange(callback: (isOnline: boolean) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private static notifyStatus(status: boolean) {
    this.listeners.forEach(l => l(status));
  }

  static isOnline(): boolean {
    return this.isOnlineStatus;
  }

  // Local storage offline queue
  static getOfflineQueue(): OfflineAction[] {
    try {
      const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveOfflineQueue(queue: OfflineAction[]) {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save offline queue', e);
    }
  }

  static addToOfflineQueue(action: OfflineAction) {
    const queue = this.getOfflineQueue();
    queue.push(action);
    this.saveOfflineQueue(queue);
  }

  static clearOfflineQueue() {
    try {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch {}
  }

  // Cached products in localStorage for offline viewing
  static getCachedProducts(): Product[] {
    try {
      const data = localStorage.getItem(CACHED_PRODUCTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static setCachedProducts(products: Product[]) {
    try {
      localStorage.setItem(CACHED_PRODUCTS_KEY, JSON.stringify(products));
    } catch {}
  }

  // Fetch all products
  static async getProducts(search?: string, category?: string, status?: string): Promise<{ products: Product[]; fromCache?: boolean }> {
    const query = new URLSearchParams();
    if (search) query.append('search', search);
    if (category) query.append('category', category);
    if (status) query.append('status', status);

    try {
      const res = await fetch(`/api/products?${query.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.setCachedProducts(data.products);
      return { products: data.products, fromCache: false };
    } catch (err) {
      console.warn('API error, falling back to cache:', err);
      let cached = this.getCachedProducts();
      if (search) {
        const q = search.toLowerCase();
        cached = cached.filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q) || p.sku.toLowerCase().includes(q));
      }
      return { products: cached, fromCache: true };
    }
  }

  // Lookup product by barcode
  static async getProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(barcode)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Lỗi truy vấn sản phẩm');
      const data = await res.json();
      return data.product;
    } catch {
      // Offline fallback lookup
      const cached = this.getCachedProducts();
      return cached.find(p => p.barcode === barcode.trim()) || null;
    }
  }

  // Execute inventory transaction (IN, OUT, AUDIT)
  static async recordTransaction(payload: {
    barcode: string;
    type: 'IN' | 'OUT' | 'AUDIT';
    amount: number;
    note?: string;
    staffName?: string;
    warehouseBranch?: string;
    newProductData?: Partial<Product>;
  }): Promise<{ success: boolean; product?: Product; transaction?: WarehouseTransaction; message: string; isOffline?: boolean }> {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Thao tác không thành công');
      }

      // Update local cache
      if (data.product) {
        const cached = this.getCachedProducts();
        const idx = cached.findIndex(p => p.id === data.product.id);
        if (idx !== -1) {
          cached[idx] = data.product;
        } else {
          cached.unshift(data.product);
        }
        this.setCachedProducts(cached);
      }

      return { ...data, isOffline: false };
    } catch (err: any) {
      // If network fails, queue offline
      if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        const offlineItem: OfflineAction = {
          id: `off-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          barcode: payload.barcode,
          type: payload.type,
          amount: payload.amount,
          note: payload.note,
          staffName: payload.staffName || 'Nhân viên quét Offline',
          warehouseBranch: payload.warehouseBranch || 'Kho Tổng',
          timestamp: new Date().toISOString(),
          productName: payload.newProductData?.name
        };

        this.addToOfflineQueue(offlineItem);

        // Optimistically update cached product quantity
        const cached = this.getCachedProducts();
        const p = cached.find(item => item.barcode === payload.barcode);
        if (p) {
          if (payload.type === 'IN') p.quantity += payload.amount;
          if (payload.type === 'OUT') p.quantity = Math.max(0, p.quantity - payload.amount);
          if (payload.type === 'AUDIT') p.quantity = payload.amount;
          this.setCachedProducts(cached);
        }

        return {
          success: true,
          product: p,
          isOffline: true,
          message: `Đang lưu ngoại tuyến! Đã xếp vào hàng chờ tự động đồng bộ khi có mạng (${payload.type === 'IN' ? '+' : payload.type === 'OUT' ? '-' : '='}${payload.amount}).`
        };
      }
      throw err;
    }
  }

  // Create or update full product
  static async saveProduct(productData: Partial<Product>): Promise<{ product: Product; isNew: boolean; message: string }> {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi lưu sản phẩm');
    return data;
  }

  // Delete product
  static async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Lỗi xoá sản phẩm');
    }
  }

  // Get transactions history
  static async getTransactions(limit = 100, type?: string, barcode?: string): Promise<WarehouseTransaction[]> {
    const query = new URLSearchParams();
    query.append('limit', String(limit));
    if (type && type !== 'ALL') query.append('type', type);
    if (barcode) query.append('barcode', barcode);

    try {
      const res = await fetch(`/api/transactions?${query.toString()}`);
      if (!res.ok) throw new Error('Lỗi tải lịch sử giao dịch');
      const data = await res.json();
      return data.transactions || [];
    } catch {
      return [];
    }
  }

  // Get warehouse statistics
  static async getStats(): Promise<WarehouseStats> {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Lỗi tải thống kê');
      return await res.json();
    } catch {
      const cached = this.getCachedProducts();
      return {
        totalProducts: cached.length,
        totalQuantity: cached.reduce((sum, p) => sum + (p.quantity || 0), 0),
        totalValue: cached.reduce((sum, p) => sum + ((p.quantity || 0) * (p.costPrice || 0)), 0),
        lowStockCount: cached.filter(p => p.quantity > 0 && p.quantity <= p.minStock).length,
        outOfStockCount: cached.filter(p => p.quantity <= 0).length,
        todayTransactionsCount: 0,
        lastSyncAt: new Date().toISOString()
      };
    }
  }

  // Sync all offline queued items to server
  static async syncOfflineQueue(): Promise<{ syncedCount: number; message: string }> {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) {
      return { syncedCount: 0, message: 'Kho đã đồng bộ hoàn tất, không có giao dịch chờ.' };
    }

    try {
      const res = await fetch('/api/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offlineQueue: queue })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi đồng bộ');

      this.clearOfflineQueue();
      if (data.products) {
        this.setCachedProducts(data.products);
      }
      return {
        syncedCount: data.syncedCount,
        message: data.message || `Đã đồng bộ thành công ${data.syncedCount} giao dịch vào kho!`
      };
    } catch (err: any) {
      throw new Error(err.message || 'Không thể đồng bộ lúc này, vui lòng thử lại.');
    }
  }

  // Reset to default sample warehouse
  static async resetDemo(): Promise<void> {
    const res = await fetch('/api/reset-demo', { method: 'POST' });
    if (!res.ok) throw new Error('Lỗi đặt lại dữ liệu mẫu');
  }

  // Export inventory to CSV
  static exportToCSV(products: Product[]): void {
    const headers = [
      'Mã SKU',
      'Tên Sản Phẩm',
      'Màu Sắc',
      'Size',
      'Số Lượng Tồn',
      'Cơ Sở',
      'Vị Trí Kệ',
      'Mã Vạch (Barcode)',
      'Giá Xuất (VNĐ)',
      'Giá Nhập (VNĐ)',
      'Cập Nhật Lúc'
    ];

    const rows = products.map(p => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.color || ''}"`,
      `"${p.size || ''}"`,
      p.quantity,
      `"${p.facility || ''}"`,
      `"${p.location}"`,
      `"${p.barcode}"`,
      p.sellingPrice || 0,
      p.costPrice || 0,
      `"${new Date(p.updatedAt).toLocaleString('vi-VN')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-ton-kho-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

WarehouseService.init();
