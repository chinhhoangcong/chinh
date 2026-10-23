export interface Product {
  id: string;
  sku: string;        // Mã SKU (ví dụ: FLX-AO-DEN-M)
  name: string;       // Tên sản phẩm
  color: string;      // Màu sắc (Đen, Trắng, Xanh Navy, Be...)
  size: string;       // Size (S, M, L, XL, 2XL, 39, 40...)
  quantity: number;   // Số lượng tồn kho
  facility: string;   // Cơ sở (Cơ sở 1 - Hà Nội, Cơ sở 2 - TP.HCM...)
  location: string;   // Vị trí kệ (Kệ A1-02...)
  barcode: string;    // Mã vạch quét
  unit?: string;      // Đơn vị tính (Cái, Chiếc, Bộ, Đôi...)
  minStock?: number;  // Cảnh báo tồn tối thiểu
  costPrice?: number; // Giá vốn
  sellingPrice?: number; // Giá bán
  category?: string;  // Danh mục sản phẩm
  supplier?: string;  // Nhà cung cấp / Xưởng may
  description?: string; // Ghi chú
  updatedAt: string;
  lastScannedAt?: string;
}

export type TransactionType = 'IN' | 'OUT' | 'AUDIT';

export interface WarehouseTransaction {
  id: string;
  type: TransactionType;
  productId: string;
  barcode: string;
  productName: string;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  expectedQuantity?: number;
  note?: string;
  staffName: string;
  warehouseBranch: string;
  timestamp: string;
  synced: boolean;
}

export interface WarehouseStats {
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  todayTransactionsCount: number;
  lastSyncAt: string;
}

export interface OfflineAction {
  id: string;
  barcode: string;
  type: TransactionType;
  amount: number;
  note?: string;
  staffName: string;
  warehouseBranch: string;
  timestamp: string;
  productName?: string;
}

export type ScanMode = 'LOOKUP' | 'IN' | 'OUT' | 'AUDIT';
