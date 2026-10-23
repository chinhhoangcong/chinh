import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Building2,
  User,
  CheckCircle,
  AlertCircle,
  RotateCw
} from 'lucide-react';
import { WarehouseService } from '../services/api';
import { OfflineAction } from '../types/warehouse';

interface SyncStatusBarProps {
  staffName: string;
  onStaffNameChange: (name: string) => void;
  warehouseBranch: string;
  onBranchChange: (branch: string) => void;
  onManualSyncTrigger: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  staffName,
  onStaffNameChange,
  warehouseBranch,
  onBranchChange,
  onManualSyncTrigger
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [isEditingStaff, setIsEditingStaff] = useState<boolean>(false);
  const [tempStaffName, setTempStaffName] = useState<string>(staffName);

  const BRANCHES = [
    'Kho Tổng (TP.HCM)',
    'Kho Chi Nhánh Hà Nội',
    'Kho Trung Chuyển Đà Nẵng',
    'Kho Hàng Lạnh Bình Dương'
  ];

  // Refresh status and queue periodically
  useEffect(() => {
    setIsOnline(WarehouseService.isOnline());
    setOfflineQueue(WarehouseService.getOfflineQueue());

    const unsubscribe = WarehouseService.onNetworkChange((online) => {
      setIsOnline(online);
      setOfflineQueue(WarehouseService.getOfflineQueue());
    });

    const interval = setInterval(() => {
      setOfflineQueue(WarehouseService.getOfflineQueue());
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await WarehouseService.syncOfflineQueue();
      setOfflineQueue(WarehouseService.getOfflineQueue());
      setSyncMsg(res.message);
      onManualSyncTrigger();
      setTimeout(() => setSyncMsg(null), 4000);
    } catch (err: any) {
      setSyncMsg(err.message || 'Lỗi đồng bộ');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempStaffName.trim()) {
      onStaffNameChange(tempStaffName.trim());
      setIsEditingStaff(false);
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-300 text-xs px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
      {/* Network & Offline Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-medium">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hệ thống:</span> Trực tuyến
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              <WifiOff className="w-3.5 h-3.5" />
              Ngoại tuyến (Offline)
            </span>
          )}
        </div>

        {/* Offline Queue Badge */}
        {offlineQueue.length > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-full text-[11px] font-semibold animate-pulse">
            <AlertCircle className="w-3 h-3" />
            <span>Chờ đồng bộ: {offlineQueue.length}</span>
          </div>
        )}

        {/* Sync Now button */}
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={syncing}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium border border-slate-700 transition-colors disabled:opacity-50"
          title="Đồng bộ dữ liệu quét với máy chủ kho"
        >
          <RotateCw className={`w-3 h-3 text-indigo-400 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
        </button>

        {syncMsg && (
          <span className="text-[11px] text-emerald-400 flex items-center gap-1 animate-fadeIn">
            <CheckCircle className="w-3 h-3" /> {syncMsg}
          </span>
        )}
      </div>

      {/* Warehouse Branch & Staff Picker */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs">
        {/* Branch Selector */}
        <div className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <select
            value={warehouseBranch}
            onChange={e => onBranchChange(e.target.value)}
            className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
          >
            {BRANCHES.map(b => (
              <option key={b} value={b} className="bg-slate-900 text-white">
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Staff Name Switcher */}
        {isEditingStaff ? (
          <form onSubmit={handleSaveStaff} className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={tempStaffName}
              onChange={e => setTempStaffName(e.target.value)}
              className="bg-slate-800 border border-indigo-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none w-28"
            />
            <button
              type="submit"
              className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold"
            >
              Lưu
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTempStaffName(staffName);
              setIsEditingStaff(true);
            }}
            className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700/80 text-slate-200 transition-colors"
            title="Bấm để đổi tên nhân viên thực hiện quét"
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate max-w-[110px]">{staffName}</span>
          </button>
        )}
      </div>
    </div>
  );
};
