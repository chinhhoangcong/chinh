import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Data types matching Kho FELIXXI SKU specifications:
// - mã SKU
// - tên sản phẩm
// - màu
// - size
// - số lượng
// - cơ sở
// - vị trí kệ
export interface Product {
  id: string;
  sku: string;        // Mã SKU (ví dụ: FLX-TSHIRT-BLK-M)
  name: string;       // Tên sản phẩm (Áo Thun Cotton FELIXXI Signature)
  color: string;      // Màu sắc (Đen, Trắng, Be, Xanh Navy, Xám...)
  size: string;       // Size (S, M, L, XL, 2XL, 30, 31, 32...)
  quantity: number;   // Số lượng tồn kho
  facility: string;   // Cơ sở (Cơ sở 1 - Hà Nội, Cơ sở 2 - TP.HCM, Kho Tổng...)
  location: string;   // Vị trí kệ (Kệ A1-01, Kệ B2-03...)
  barcode: string;    // Mã vạch quét (EAN-13 / Code 128)
  unit?: string;      // Đơn vị tính (Cái, Chiếc, Bộ...)
  minStock?: number;  // Cảnh báo tồn tối thiểu
  costPrice?: number; // Giá vốn
  sellingPrice?: number; // Giá bán
  category?: string;  // Danh mục (Áo thun, Polo, Quần jean, Áo khoác...)
  supplier?: string;  // Xưởng sản xuất / Nhà cung cấp
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

// Sample inventory data tailored for Kho FELIXXI
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sku: 'FLX-TSHIRT-BLK-M',
    name: 'Áo Thun Cotton Compact FELIXXI',
    color: 'Đen',
    size: 'M',
    quantity: 68,
    facility: 'Cơ sở 1 (Hà Nội)',
    location: 'Kệ A1-01',
    barcode: '8935001800123',
    unit: 'Cái',
    minStock: 20,
    costPrice: 120000,
    sellingPrice: 249000,
    category: 'Áo Thun',
    supplier: 'Xưởng May FELIXXI',
    description: 'Cotton 100% 250gsm dệt compact chống xù',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-002',
    sku: 'FLX-TSHIRT-WHT-L',
    name: 'Áo Thun Cotton Compact FELIXXI',
    color: 'Trắng',
    size: 'L',
    quantity: 45,
    facility: 'Cơ sở 1 (Hà Nội)',
    location: 'Kệ A1-02',
    barcode: '8934563148271',
    unit: 'Cái',
    minStock: 15,
    costPrice: 120000,
    sellingPrice: 249000,
    category: 'Áo Thun',
    supplier: 'Xưởng May FELIXXI',
    description: 'Cotton 100% màu trắng trơn cổ bo',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-003',
    sku: 'FLX-POLO-NAV-XL',
    name: 'Áo Polo Pique Dệt Bo Cổ FELIXXI',
    color: 'Xanh Navy',
    size: 'XL',
    quantity: 26,
    facility: 'Cơ sở 2 (TP.HCM)',
    location: 'Kệ B1-03',
    barcode: '8936036010022',
    unit: 'Cái',
    minStock: 10,
    costPrice: 165000,
    sellingPrice: 349000,
    category: 'Áo Polo',
    supplier: 'Xưởng May Cao Cấp',
    description: 'Vải cá sấu mắt chim thoáng khí',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-004',
    sku: 'FLX-POLO-BGE-M',
    name: 'Áo Polo Pique Dệt Bo Cổ FELIXXI',
    color: 'Be (Beige)',
    size: 'M',
    quantity: 4,
    facility: 'Cơ sở 2 (TP.HCM)',
    location: 'Kệ B1-04',
    barcode: '8938501234567',
    unit: 'Cái',
    minStock: 12,
    costPrice: 165000,
    sellingPrice: 349000,
    category: 'Áo Polo',
    supplier: 'Xưởng May Cao Cấp',
    description: 'Màu be cát sang trọng công sở',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-005',
    sku: 'FLX-JEAN-BLU-30',
    name: 'Quần Jean Slimfit Co Giãn FELIXXI',
    color: 'Xanh Nhạt',
    size: '30',
    quantity: 34,
    facility: 'Cơ sở 1 (Hà Nội)',
    location: 'Kệ C2-01',
    barcode: '8936017361234',
    unit: 'Cái',
    minStock: 10,
    costPrice: 210000,
    sellingPrice: 429000,
    category: 'Quần Jean',
    supplier: 'Xưởng Denim Việt',
    description: 'Denim wash 12oz co giãn 2 chiều',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-006',
    sku: 'FLX-JEAN-BLK-31',
    name: 'Quần Jean Slimfit Co Giãn FELIXXI',
    color: 'Đen',
    size: '31',
    quantity: 0,
    facility: 'Cơ sở 1 (Hà Nội)',
    location: 'Kệ C2-02',
    barcode: '8934822001554',
    unit: 'Cái',
    minStock: 10,
    costPrice: 210000,
    sellingPrice: 429000,
    category: 'Quần Jean',
    supplier: 'Xưởng Denim Việt',
    description: 'Màu đen tuyền wash bền màu (Hết hàng)',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-007',
    sku: 'FLX-HOOD-GRY-L',
    name: 'Áo Hoodie Nỉ Bông Unisex FELIXXI',
    color: 'Xám Tiêu',
    size: 'L',
    quantity: 19,
    facility: 'Kho Tổng (TP.HCM)',
    location: 'Kệ D1-02',
    barcode: '8935212300018',
    unit: 'Cái',
    minStock: 8,
    costPrice: 240000,
    sellingPrice: 489000,
    category: 'Áo Khoác & Hoodie',
    supplier: 'Xưởng Nỉ Chân Cua',
    description: 'Nỉ bông định lượng 380gsm dày dặn form rộng',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-008',
    sku: 'FLX-JACK-KHA-XL',
    name: 'Áo Khoác Bomber Kaki 2 Lớp FELIXXI',
    color: 'Kaki',
    size: 'XL',
    quantity: 15,
    facility: 'Kho Tổng (TP.HCM)',
    location: 'Kệ D2-01',
    barcode: '8934673890123',
    unit: 'Cái',
    minStock: 8,
    costPrice: 280000,
    sellingPrice: 550000,
    category: 'Áo Khoác & Hoodie',
    supplier: 'Xưởng May Áo Khoác',
    description: 'Lớp ngoài kaki wash mềm lót gió chống nước nhẹ',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-009',
    sku: 'FLX-SHIRT-WHT-M',
    name: 'Áo Sơ Mi Oxford Dài Tay FELIXXI',
    color: 'Trắng',
    size: 'M',
    quantity: 38,
    facility: 'Cơ sở 2 (TP.HCM)',
    location: 'Kệ B2-01',
    barcode: '8936071678901',
    unit: 'Cái',
    minStock: 12,
    costPrice: 190000,
    sellingPrice: 389000,
    category: 'Sơ Mi',
    supplier: 'Xưởng May Công Sở',
    description: 'Vải Oxford dệt sần đứng form hạn chế nhăn',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-010',
    sku: 'FLX-PANTS-BLK-L',
    name: 'Quần Tây Âu Co Giãn FELIXXI',
    color: 'Đen',
    size: 'L',
    quantity: 28,
    facility: 'Cơ sở 1 (Hà Nội)',
    location: 'Kệ C1-03',
    barcode: '8938519987654',
    unit: 'Cái',
    minStock: 10,
    costPrice: 195000,
    sellingPrice: 399000,
    category: 'Quần Âu',
    supplier: 'Xưởng May Công Sở',
    description: 'Chất tuysi cao cấp cạp chun sườn tiện lợi',
    updatedAt: new Date().toISOString()
  }
];

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'warehouse-db.json');

// Memory store
interface WarehouseDB {
  products: Product[];
  transactions: WarehouseTransaction[];
  lastSyncAt: string;
}

let db: WarehouseDB = {
  products: INITIAL_PRODUCTS,
  transactions: [],
  lastSyncAt: new Date().toISOString()
};

// Load database from file
function loadDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.products && Array.isArray(parsed.products) && parsed.products.length > 0) {
        // Ensure new attributes color, size, facility exist on all items
        parsed.products = parsed.products.map((p: any) => ({
          ...p,
          sku: p.sku || `FLX-${p.id.slice(-4)}`,
          color: p.color || 'Đen',
          size: p.size || 'M',
          facility: p.facility || 'Cơ sở 1 (Hà Nội)',
          location: p.location || 'Kệ A1'
        }));
        db = parsed;
        console.log(`Loaded ${db.products.length} products and ${db.transactions.length} transactions from storage.`);
        return;
      }
    }
    saveDB();
  } catch (err) {
    console.error('Error loading DB, using defaults:', err);
  }
}

// Save database to file
function saveDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db.lastSyncAt = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

loadDB();

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  // 1. Get warehouse status & stats
  app.get('/api/stats', (_req: Request, res: Response) => {
    const totalProducts = db.products.length;
    const totalQuantity = db.products.reduce((acc, p) => acc + (p.quantity || 0), 0);
    const totalValue = db.products.reduce((acc, p) => acc + ((p.quantity || 0) * (p.costPrice || 0)), 0);
    const lowStockCount = db.products.filter(p => p.quantity > 0 && p.quantity <= (p.minStock || 10)).length;
    const outOfStockCount = db.products.filter(p => p.quantity <= 0).length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTransactionsCount = db.transactions.filter(t => t.timestamp.startsWith(todayStr)).length;

    res.json({
      totalProducts,
      totalQuantity,
      totalValue,
      lowStockCount,
      outOfStockCount,
      todayTransactionsCount,
      lastSyncAt: db.lastSyncAt
    });
  });

  // 2. Get all products with search & filters (including facility, color, size)
  app.get('/api/products', (req: Request, res: Response) => {
    const { search, category, status, location, facility, color, size } = req.query;
    let list = [...db.products];

    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.color && p.color.toLowerCase().includes(q)) ||
        (p.size && p.size.toLowerCase().includes(q)) ||
        (p.facility && p.facility.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q))
      );
    }

    if (facility && typeof facility === 'string' && facility !== 'ALL') {
      list = list.filter(p => p.facility === facility);
    }

    if (color && typeof color === 'string' && color !== 'ALL') {
      list = list.filter(p => p.color === color);
    }

    if (size && typeof size === 'string' && size !== 'ALL') {
      list = list.filter(p => p.size === size);
    }

    if (category && typeof category === 'string' && category !== 'ALL') {
      list = list.filter(p => p.category === category);
    }

    if (location && typeof location === 'string' && location !== 'ALL') {
      list = list.filter(p => p.location.toLowerCase().includes(location.toLowerCase()));
    }

    if (status && typeof status === 'string') {
      if (status === 'OUT_OF_STOCK') {
        list = list.filter(p => p.quantity <= 0);
      } else if (status === 'LOW_STOCK') {
        list = list.filter(p => p.quantity > 0 && p.quantity <= (p.minStock || 10));
      } else if (status === 'IN_STOCK') {
        list = list.filter(p => p.quantity > (p.minStock || 10));
      }
    }

    res.json({
      products: list,
      total: list.length,
      lastSyncAt: db.lastSyncAt
    });
  });

  // 3. Find product by barcode
  app.get('/api/products/barcode/:barcode', (req: Request, res: Response) => {
    const barcode = req.params.barcode.trim();
    const product = db.products.find(p => p.barcode === barcode);
    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm với mã vạch này', barcode });
    }
    product.lastScannedAt = new Date().toISOString();
    saveDB();
    res.json({ product });
  });

  // 4. Create or update product (Mã SKU, Tên, Màu, Size, Số lượng, Cơ sở, Vị trí kệ)
  app.post('/api/products', (req: Request, res: Response) => {
    const {
      sku,
      name,
      color = 'Đen',
      size = 'M',
      quantity = 0,
      facility = 'Cơ sở 1 (Hà Nội)',
      location = 'Kệ A1',
      barcode,
      unit = 'Cái',
      minStock = 10,
      costPrice = 0,
      sellingPrice = 0,
      category = 'Thời trang',
      supplier = '',
      description = ''
    } = req.body;

    if (!name || (!sku && !barcode)) {
      return res.status(400).json({ error: 'Tên sản phẩm và Mã SKU / Mã vạch là bắt buộc' });
    }

    const cleanSku = (sku || `FLX-${Date.now().toString().slice(-6)}`).trim();
    const cleanBarcode = (barcode || cleanSku).trim();

    let existing = db.products.find(p => p.sku.toLowerCase() === cleanSku.toLowerCase() || p.barcode === cleanBarcode);

    if (existing) {
      // Update
      existing.name = name.trim();
      existing.sku = cleanSku;
      existing.color = color;
      existing.size = size;
      existing.facility = facility;
      existing.location = location;
      existing.quantity = typeof quantity === 'number' ? quantity : existing.quantity;
      existing.unit = unit || existing.unit;
      existing.minStock = typeof minStock === 'number' ? minStock : existing.minStock;
      existing.costPrice = typeof costPrice === 'number' ? costPrice : existing.costPrice;
      existing.sellingPrice = typeof sellingPrice === 'number' ? sellingPrice : existing.sellingPrice;
      existing.category = category || existing.category;
      existing.supplier = supplier ?? existing.supplier;
      existing.description = description ?? existing.description;
      existing.updatedAt = new Date().toISOString();

      saveDB();
      return res.json({ product: existing, isNew: false, message: 'Cập nhật SKU thành công' });
    }

    // Create new
    const newProduct: Product = {
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sku: cleanSku,
      name: name.trim(),
      color: color.trim() || 'Đen',
      size: size.trim() || 'M',
      quantity: Number(quantity) || 0,
      facility: facility.trim() || 'Cơ sở 1 (Hà Nội)',
      location: location.trim() || 'Kệ A1',
      barcode: cleanBarcode,
      unit: unit || 'Cái',
      minStock: Number(minStock) || 10,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      category: category || 'Thời trang',
      supplier: supplier || '',
      description: description || '',
      updatedAt: new Date().toISOString(),
      lastScannedAt: new Date().toISOString()
    };

    db.products.unshift(newProduct);
    saveDB();

    res.status(201).json({ product: newProduct, isNew: true, message: 'Thêm SKU mới vào kho FELIXXI thành công' });
  });

  // 5. Update product by ID
  app.put('/api/products/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = db.products.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    const existing = db.products[index];
    const updated: Product = {
      ...existing,
      ...req.body,
      id: existing.id,
      updatedAt: new Date().toISOString()
    };

    db.products[index] = updated;
    saveDB();
    res.json({ product: updated, message: 'Cập nhật thông tin thành công' });
  });

  // 6. Delete product by ID
  app.delete('/api/products/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const initialLen = db.products.length;
    db.products = db.products.filter(p => p.id !== id);

    if (db.products.length === initialLen) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm để xoá' });
    }

    saveDB();
    res.json({ success: true, message: 'Đã xoá sản phẩm khỏi kho' });
  });

  // 7. Execute warehouse inventory transaction (IN, OUT, AUDIT)
  app.post('/api/transactions', (req: Request, res: Response) => {
    const {
      barcode,
      type, // 'IN' | 'OUT' | 'AUDIT'
      amount,
      note,
      staffName = 'Nhân viên kho',
      warehouseBranch = 'Cơ sở 1 (Hà Nội)',
      newProductData
    } = req.body;

    if (!barcode || !type) {
      return res.status(400).json({ error: 'Mã vạch và loại giao dịch là bắt buộc' });
    }

    let product = db.products.find(p => p.barcode === barcode.trim());

    if (!product) {
      if (newProductData && newProductData.name) {
        // Auto create product on the fly with SKU specifications
        product = {
          id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          sku: newProductData.sku || `FLX-${barcode.trim().slice(-6)}`,
          name: newProductData.name,
          color: newProductData.color || 'Đen',
          size: newProductData.size || 'M',
          quantity: 0,
          facility: newProductData.facility || warehouseBranch || 'Cơ sở 1 (Hà Nội)',
          location: newProductData.location || 'Kệ chờ xếp',
          barcode: barcode.trim(),
          unit: newProductData.unit || 'Cái',
          minStock: newProductData.minStock || 10,
          costPrice: newProductData.costPrice || 0,
          sellingPrice: newProductData.sellingPrice || 0,
          category: newProductData.category || 'Thời trang',
          updatedAt: new Date().toISOString(),
          lastScannedAt: new Date().toISOString()
        };
        db.products.unshift(product);
      } else {
        return res.status(404).json({
          error: 'Mã vạch chưa có trong kho. Vui lòng tạo sản phẩm trước.',
          barcode
        });
      }
    }

    const before = product.quantity;
    let change = 0;
    let after = before;
    let expected = before;

    const delta = Math.abs(Number(amount) || 1);

    if (type === 'IN') {
      change = delta;
      after = before + change;
    } else if (type === 'OUT') {
      if (before < delta) {
        return res.status(400).json({
          error: `Số lượng tồn kho không đủ (Hiện có: ${before} ${product.unit || 'Cái'}, yêu cầu xuất: ${delta})`,
          currentQuantity: before
        });
      }
      change = -delta;
      after = before - delta;
    } else if (type === 'AUDIT') {
      const physicalCount = Number(amount) >= 0 ? Number(amount) : 0;
      expected = before;
      change = physicalCount - before;
      after = physicalCount;
    } else {
      return res.status(400).json({ error: 'Loại giao dịch không hợp lệ (IN, OUT, AUDIT)' });
    }

    product.quantity = Math.max(0, after);
    product.updatedAt = new Date().toISOString();
    product.lastScannedAt = new Date().toISOString();

    const transaction: WarehouseTransaction = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      type,
      productId: product.id,
      barcode: product.barcode,
      productName: `${product.name} [${product.color} - Size ${product.size}]`,
      quantityChange: change,
      quantityBefore: before,
      quantityAfter: product.quantity,
      expectedQuantity: type === 'AUDIT' ? expected : undefined,
      note: note || '',
      staffName: staffName || 'Nhân viên kho',
      warehouseBranch: product.facility || warehouseBranch || 'Cơ sở 1 (Hà Nội)',
      timestamp: new Date().toISOString(),
      synced: true
    };

    db.transactions.unshift(transaction);
    if (db.transactions.length > 1000) {
      db.transactions = db.transactions.slice(0, 1000);
    }

    saveDB();

    res.json({
      success: true,
      product,
      transaction,
      message: type === 'IN'
        ? `Đã nhập +${delta} ${product.unit || 'Cái'} "${product.name}" (${product.color} - ${product.size}). Tồn mới: ${product.quantity}`
        : type === 'OUT'
        ? `Đã xuất -${delta} ${product.unit || 'Cái'} "${product.name}" (${product.color} - ${product.size}). Tồn còn: ${product.quantity}`
        : `Đã kiểm kê "${product.name}" (${product.color} - ${product.size}). Thực tế: ${after} (Chênh lệch: ${change >= 0 ? '+' + change : change})`
    });
  });

  // 8. Batch sync for offline queue
  app.post('/api/sync/batch', (req: Request, res: Response) => {
    const { transactions = [], offlineQueue = [] } = req.body;
    const items = Array.isArray(offlineQueue) && offlineQueue.length > 0 ? offlineQueue : transactions;

    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ syncedCount: 0, products: db.products, lastSyncAt: db.lastSyncAt });
    }

    let syncedCount = 0;
    const errors: Array<{ item: any; error: string }> = [];

    for (const item of items) {
      try {
        const { barcode, type, amount, note, staffName, warehouseBranch, timestamp } = item;
        const product = db.products.find(p => p.barcode === barcode);
        if (!product) {
          errors.push({ item, error: 'Không tìm thấy sản phẩm' });
          continue;
        }

        const before = product.quantity;
        const delta = Math.abs(Number(amount) || 1);
        let change = 0;
        let after = before;

        if (type === 'IN') {
          change = delta;
          after = before + change;
        } else if (type === 'OUT') {
          change = -delta;
          after = Math.max(0, before - delta);
        } else if (type === 'AUDIT') {
          const physicalCount = Number(amount) >= 0 ? Number(amount) : 0;
          change = physicalCount - before;
          after = physicalCount;
        }

        product.quantity = after;
        product.updatedAt = new Date().toISOString();
        product.lastScannedAt = timestamp || new Date().toISOString();

        const tx: WarehouseTransaction = {
          id: item.id || `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          type,
          productId: product.id,
          barcode: product.barcode,
          productName: `${product.name} [${product.color} - Size ${product.size}]`,
          quantityChange: change,
          quantityBefore: before,
          quantityAfter: after,
          expectedQuantity: type === 'AUDIT' ? before : undefined,
          note: note ? `[Offline Sync] ${note}` : '[Đồng bộ Offline]',
          staffName: staffName || 'Nhân viên quét Offline',
          warehouseBranch: warehouseBranch || product.facility || 'Cơ sở 1 (Hà Nội)',
          timestamp: timestamp || new Date().toISOString(),
          synced: true
        };

        db.transactions.unshift(tx);
        syncedCount++;
      } catch (err: any) {
        errors.push({ item, error: err.message || 'Lỗi xử lý giao dịch' });
      }
    }

    saveDB();
    res.json({
      success: true,
      syncedCount,
      errorsCount: errors.length,
      errors,
      products: db.products,
      lastSyncAt: db.lastSyncAt,
      message: `Đã đồng bộ thành công ${syncedCount} giao dịch vào kho FELIXXI.`
    });
  });

  // 9. Get transactions history
  app.get('/api/transactions', (req: Request, res: Response) => {
    const { limit = '100', type, barcode } = req.query;
    let list = [...db.transactions];

    if (type && typeof type === 'string' && type !== 'ALL') {
      list = list.filter(t => t.type === type);
    }

    if (barcode && typeof barcode === 'string') {
      list = list.filter(t => t.barcode === barcode.trim());
    }

    const n = Math.min(Number(limit) || 100, 500);
    res.json({
      transactions: list.slice(0, n),
      total: list.length
    });
  });

  // 10. Reset demo data
  app.post('/api/reset-demo', (_req: Request, res: Response) => {
    db = {
      products: JSON.parse(JSON.stringify(INITIAL_PRODUCTS)),
      transactions: [],
      lastSyncAt: new Date().toISOString()
    };
    saveDB();
    res.json({ success: true, message: 'Đã đặt lại dữ liệu kho FELIXXI mẫu thành công', products: db.products });
  });

  // 11. Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString(), totalProducts: db.products.length });
  });

  // Vite Integration
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Kho FELIXXI Barcode Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
