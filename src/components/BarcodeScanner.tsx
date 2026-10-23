import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  Flashlight,
  RotateCcw,
  Upload,
  Keyboard,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  Smartphone,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { sound } from '../services/audio';
import { ScanMode } from '../types/warehouse';
import { getPublicShareUrl } from '../utils/url';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  active: boolean;
  scanMode?: ScanMode;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  active,
  scanMode = 'LOOKUP'
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noCameraFound, setNoCameraFound] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [retryCounter, setRetryCounter] = useState(0);
  const [showPhoneQr, setShowPhoneQr] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimestamp = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle successful scan
  const handleDecodedText = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      // Cooldown 1.2s to prevent multiple triggers of same barcode in continuous mode
      if (now - lastScanTimestamp.current < 1200) {
        return;
      }
      lastScanTimestamp.current = now;

      const cleanCode = decodedText.trim();
      if (!cleanCode) return;

      if (soundEnabled) {
        sound.playSuccess();
      }

      setLastScannedCode(cleanCode);
      setScanCount(c => c + 1);
      onScan(cleanCode);
    },
    [soundEnabled, onScan]
  );

  // Enumerate cameras on mount or retry
  useEffect(() => {
    let mounted = true;

    Html5Qrcode.getCameras()
      .then(devices => {
        if (!mounted) return;
        if (devices && devices.length > 0) {
          const list = devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 5)}` }));
          setCameras(list);
          setNoCameraFound(false);

          // Prefer back/rear camera on mobile
          const backCam = list.find(c =>
            c.label.toLowerCase().includes('back') ||
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : list[0].id);
        } else {
          setCameras([]);
          setNoCameraFound(true);
        }
      })
      .catch(err => {
        console.warn('Camera enumeration not available or denied:', err);
        if (mounted) {
          setNoCameraFound(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [retryCounter]);

  // Start or stop scanning based on `active` and `selectedCameraId`
  useEffect(() => {
    const scannerId = 'reader-viewport';
    let isCurrent = true;

    if (!active) {
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            if (isCurrent) setIsScanning(false);
          })
          .catch(() => {});
      }
      return;
    }

    const startScanner = async () => {
      setErrorMessage(null);

      // Clean up previous instance if running
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch {
          // ignore
        }
      }

      const viewportEl = document.getElementById(scannerId);
      if (!viewportEl) return;

      try {
        scannerRef.current = new Html5Qrcode(scannerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
          ],
          verbose: false
        });

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const boxWidth = Math.floor(viewfinderWidth * 0.85);
            const boxHeight = Math.floor(Math.min(boxWidth * 0.5, viewfinderHeight * 0.7));
            return {
              width: Math.max(200, Math.min(boxWidth, 380)),
              height: Math.max(120, Math.min(boxHeight, 220))
            };
          },
          aspectRatio: 1.3333
        };

        const onScanSuccess = (decodedText: string) => {
          if (isCurrent) {
            handleDecodedText(decodedText);
          }
        };

        const onScanFailure = () => {
          // scanning...
        };

        let started = false;

        // Try 1: Selected camera if set
        if (selectedCameraId) {
          try {
            await scannerRef.current.start(
              { deviceId: { exact: selectedCameraId } },
              config,
              onScanSuccess,
              onScanFailure
            );
            started = true;
          } catch (err: any) {
            console.warn('Tier 1 camera start failed, trying fallback:', err?.message || err);
          }
        }

        // Try 2: Rear environment camera
        if (!started && !selectedCameraId) {
          try {
            await scannerRef.current.start(
              { facingMode: 'environment' },
              config,
              onScanSuccess,
              onScanFailure
            );
            started = true;
          } catch (err: any) {
            console.warn('Tier 2 (environment facing) start failed:', err?.message || err);
          }
        }

        // Try 3: Front user camera (webcam on laptop/desktop)
        if (!started) {
          try {
            await scannerRef.current.start(
              { facingMode: 'user' },
              config,
              onScanSuccess,
              onScanFailure
            );
            started = true;
          } catch (err: any) {
            console.warn('Tier 3 (user facing) start failed:', err?.message || err);
          }
        }

        // Try 4: First camera from enumerated list if any
        if (!started && cameras.length > 0) {
          try {
            await scannerRef.current.start(
              cameras[0].id,
              config,
              onScanSuccess,
              onScanFailure
            );
            started = true;
          } catch (err: any) {
            console.warn('Tier 4 (camera[0].id) start failed:', err?.message || err);
          }
        }

        if (isCurrent) {
          if (started) {
            setIsScanning(true);
            setNoCameraFound(false);
            setErrorMessage(null);

            // Check torch capability
            try {
              const capabilities = scannerRef.current.getRunningTrackCapabilities?.();
              if (capabilities && 'torch' in capabilities) {
                setTorchSupported(true);
              }
            } catch {
              setTorchSupported(false);
            }
          } else {
            // No camera device could be accessed (NotFoundError or OverconstrainedError)
            setIsScanning(false);
            setNoCameraFound(true);
            setErrorMessage('NO_CAMERA_DEVICE');
          }
        }
      } catch (err: any) {
        console.warn('Scanner initialization handled gracefully:', err?.message || err);
        if (isCurrent) {
          setIsScanning(false);
          setNoCameraFound(true);
          setErrorMessage(
            err?.message?.includes('Permission')
              ? 'PERMISSION_DENIED'
              : 'NO_CAMERA_DEVICE'
          );
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {}
        setIsScanning(false);
      }
    };
  }, [active, selectedCameraId, retryCounter, handleDecodedText, cameras]);

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!scannerRef.current || !isScanning) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setTorchOn(nextTorch);
    } catch {
      setTorchSupported(false);
    }
  };

  // Switch camera
  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  // File upload scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let fileScanner = scannerRef.current;
      if (!fileScanner) {
        fileScanner = new Html5Qrcode('reader-viewport', { verbose: false });
      }
      const result = await fileScanner.scanFile(file, true);
      if (result) {
        handleDecodedText(result);
      }
    } catch {
      alert('Không nhận diện được mã vạch từ ảnh đã chọn. Vui lòng chọn ảnh chụp rõ nét hơn.');
      if (soundEnabled) sound.playError();
    }
  };

  // Manual code submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleDecodedText(manualInput.trim());
    setManualInput('');
    setShowManualInput(false);
  };

  const copyAppUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(getPublicShareUrl());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const modeLabel = {
    LOOKUP: 'Tra cứu thông tin',
    IN: 'Nhập kho (+)',
    OUT: 'Xuất kho (-)',
    AUDIT: 'Kiểm kê kho (=)'
  }[scanMode];

  const modeColor = {
    LOOKUP: 'bg-blue-600',
    IN: 'bg-emerald-600',
    OUT: 'bg-amber-600',
    AUDIT: 'bg-purple-600'
  }[scanMode];

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 text-white">
      {/* Scanner Header & Mode Badge */}
      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white tracking-wide ${modeColor}`}>
            Chế độ: {modeLabel}
          </span>
          {continuousMode && (
            <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-500/30 text-indigo-300 font-medium border border-indigo-400/40 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Quét liên tục
            </span>
          )}
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1 text-slate-300">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            type="button"
            onClick={() => setContinuousMode(!continuousMode)}
            title="Bật/Tắt chế độ quét liên tục nhiều kiện hàng"
            className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
              continuousMode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Liên tục
          </button>
        </div>
      </div>

      {/* Viewport for Html5Qrcode Camera OR Barcode Simulator */}
      <div className="relative w-full aspect-4/3 min-h-[290px] bg-black overflow-hidden flex items-center justify-center">
        {/* The DOM element required by Html5Qrcode */}
        <div id="reader-viewport" className={`w-full h-full object-cover ${noCameraFound ? 'hidden' : 'block'}`} />

        {/* Laser scanner guide overlay when camera is running */}
        {isScanning && !noCameraFound && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-[84%] max-w-[340px] h-[160px] border-2 border-emerald-400/90 rounded-xl relative shadow-[0_0_25px_rgba(16,185,129,0.35)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />

              {/* Animated laser scan line */}
              <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_10px_#ef4444] animate-laser" />

              <div className="absolute bottom-2 inset-x-0 text-center">
                <span className="text-[11px] font-medium tracking-wider uppercase text-emerald-300 bg-slate-950/70 px-2 py-0.5 rounded-full backdrop-blur-xs">
                  Căn mã vạch vào khung này
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Fallback Simulator View when no physical webcam is found (Desktop / VM / Simulator) */}
        {noCameraFound && (
          <div className="absolute inset-0 flex flex-col items-center justify-between p-5 text-center bg-gradient-to-b from-slate-900 to-slate-950 z-10 overflow-y-auto">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2">
                <CameraOff className="w-6 h-6" />
              </div>

              <h4 className="text-sm font-bold text-white">
                Không tìm thấy Camera vật lý trên thiết bị này
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Thiết bị hiện tại (máy tính để bàn/máy ảo) không có webcam. Ứng dụng đã kích hoạt sẵn <strong>Chế độ Giả Lập & Quét Thủ Công</strong> bên dưới để thử nghiệm đầy đủ tính năng.
              </p>
            </div>

            {/* Quick Actions in No Camera Mode */}
            <div className="w-full max-w-sm my-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRetryCounter(c => c + 1)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" /> Thử lại Camera
              </button>

              <button
                type="button"
                onClick={() => setShowPhoneQr(!showPhoneQr)}
                className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Smartphone className="w-3.5 h-3.5" /> Mở trên Điện Thoại
              </button>
            </div>

            {/* QR Modal / Link to open on mobile phone */}
            {showPhoneQr && (
              <div className="w-full max-w-sm p-3 bg-slate-950 rounded-xl border border-indigo-500/40 text-xs mb-2 animate-fadeIn text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-indigo-300">Quét mã bằng Camera điện thoại (không cần đăng nhập):</span>
                  <button
                    type="button"
                    onClick={() => setShowPhoneQr(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(getPublicShareUrl())}`}
                    alt="Mã QR mở link công khai trên điện thoại"
                    className="w-20 h-20 rounded bg-white p-1 border border-slate-300 shrink-0"
                  />
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-400">
                      Link công khai, điện thoại vào thẳng web app không cần đăng nhập Google.
                    </p>
                    <button
                      type="button"
                      onClick={copyAppUrl}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-medium flex items-center gap-1 border border-slate-700 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedLink ? 'Đã sao chép link!' : 'Sao chép đường link'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-500">
              Mẹo: Bạn có thể bấm vào các mã hàng mẫu bên dưới để kiểm tra quy trình Nhập / Xuất kho.
            </div>
          </div>
        )}

        {/* Loading state before camera starts */}
        {!isScanning && !noCameraFound && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/90">
            <Camera className="w-10 h-10 text-indigo-400 animate-pulse mb-3" />
            <p className="text-sm font-medium text-slate-300">Đang khởi động camera...</p>
            <p className="text-xs text-slate-500 mt-1">Đang kết nối camera điện thoại hoặc webcam.</p>
          </div>
        )}

        {/* Floating in-camera action buttons */}
        {isScanning && !noCameraFound && (
          <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
                  torchOn ? 'bg-amber-400 text-slate-950' : 'bg-slate-950/70 text-white hover:bg-slate-900'
                }`}
                title="Bật/Tắt đèn pin hỗ trợ quét tối"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}

            {cameras.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                className="p-2.5 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white backdrop-blur-md transition-all ml-auto"
                title="Đổi camera trước/sau"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Last scanned feedback banner */}
      {lastScannedCode && (
        <div className="px-4 py-2 bg-emerald-950/80 border-t border-emerald-900/60 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Mã vừa quét: <strong className="font-mono text-white text-sm">{lastScannedCode}</strong></span>
          </div>
          <span className="text-[11px] text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded-full font-semibold">
            Lần #{scanCount}
          </span>
        </div>
      )}

      {/* Bottom Action Bar: Upload Image, Manual Entry & Sample Demo Barcodes */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* File picker */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" /> Quét từ ảnh
          </button>

          {/* Manual input toggle */}
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
          >
            <Keyboard className="w-3.5 h-3.5 text-indigo-400" /> Nhập tay mã
          </button>
        </div>

        {/* Manual Input form */}
        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="flex gap-2 pt-1 animate-fadeIn">
            <input
              type="text"
              autoFocus
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="Nhập mã vạch (ví dụ: 8935001800123)"
              className="flex-1 bg-slate-900 border border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors"
            >
              Xác nhận
            </button>
          </form>
        )}

        {/* Simulator / Demo Barcodes Quick Bar for instant testing */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Mô phỏng quét nhanh (Click để quét ngay):
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { name: 'Áo Thun Đen M', code: '8935001800123' },
              { name: 'Áo Thun Trắng L', code: '8934563148271' },
              { name: 'Polo Navy XL', code: '8936036010022' },
              { name: 'Polo Be M', code: '8938501234567' },
              { name: 'Jean Slimfit 30', code: '8936017361234' },
              { name: 'Jean Đen 31 (Hết)', code: '8934822001554' },
              { name: 'Hoodie Xám L', code: '8935212300018' },
              { name: 'Bomber Kaki XL', code: '8934673890123' },
              { name: 'Mã mới chưa lưu', code: '8939999888777' }
            ].map(item => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleDecodedText(item.code)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-900/80 hover:border-indigo-500 text-slate-200 hover:text-white border border-slate-700/80 text-[11px] font-medium transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                title={`Bấm để mô phỏng quét mã: ${item.code}`}
              >
                <span>{item.name}</span>
                <span className="font-mono text-slate-400 text-[10px]">({item.code.slice(-4)})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
