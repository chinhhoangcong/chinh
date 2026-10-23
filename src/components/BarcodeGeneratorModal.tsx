import React, { useState } from 'react';
import { X, Printer, Download, Check, Building2, MapPin, Tag } from 'lucide-react';
import { Product } from '../types/warehouse';
import { BarcodeView } from './BarcodeView';

interface BarcodeGeneratorModalProps {
  products: Product[];
  selectedProduct?: Product | null;
  onClose: () => void;
}

export const BarcodeGeneratorModal: React.FC<BarcodeGeneratorModalProps> = ({
  products,
  selectedProduct,
  onClose
}) => {
  const [targetId, setTargetId] = useState<string>(selectedProduct ? selectedProduct.id : 'ALL');
  const [labelSize, setLabelSize] = useState<'standard' | 'compact'>('standard');

  const itemsToPrint = targetId === 'ALL'
    ? products
    : products.filter(p => p.id === targetId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white">In Tem Nhãn SKU & Kệ Hàng FELIXXI</h3>
              <p className="text-xs text-slate-400">Chuẩn Code 128 bao gồm SKU, Màu sắc, Size, Cơ sở, Kệ</p>
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

        {/* Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Chọn sản phẩm in:</label>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">Tất cả sản phẩm ({products.length} tem)</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {p.name} ({p.color} - Size {p.size})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Kích cỡ tem:</label>
              <select
                value={labelSize}
                onChange={e => setLabelSize(e.target.value as any)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="standard">Tiêu chuẩn (60 x 40 mm)</option>
                <option value="compact">Nhỏ gọn (50 x 30 mm)</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> In Tem Ngay (Print)
          </button>
        </div>

        {/* Printable Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 print:bg-white print:p-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3">
            {itemsToPrint.map(item => (
              <div
                key={item.id}
                className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs flex flex-col justify-between text-left break-inside-avoid print:border-black print:rounded-none"
              >
                {/* Brand & SKU header */}
                <div className="w-full pb-1 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">FELIXXI</span>
                  <span className="font-mono text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                    {item.sku}
                  </span>
                </div>

                {/* Product Name */}
                <div className="my-1.5">
                  <p className="text-xs font-bold text-slate-900 line-clamp-1 leading-tight">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-700 font-semibold mt-0.5">
                    <span className="bg-slate-100 px-1 rounded">Màu: {item.color}</span>
                    <span>•</span>
                    <span className="bg-slate-100 px-1 rounded font-bold">Size: {item.size}</span>
                  </div>
                </div>

                {/* Barcode View */}
                <div className="my-1.5 w-full flex justify-center">
                  <BarcodeView
                    value={item.barcode}
                    height={labelSize === 'standard' ? 44 : 34}
                    showText={false}
                    className="border-0 shadow-none p-0"
                  />
                </div>

                {/* Barcode number & Shelf location */}
                <div className="w-full pt-1.5 border-t border-slate-200 flex items-center justify-between text-[10px]">
                  <div>
                    <span className="font-mono font-bold text-slate-800 tracking-wider block">
                      {item.barcode}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">
                      {item.facility || 'Cơ sở 1'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-indigo-700 block">
                      {item.location}
                    </span>
                    <span className="font-semibold text-emerald-700 text-[10px]">
                      {item.sellingPrice?.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
