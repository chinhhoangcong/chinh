import React, { useState } from 'react';
import { Smartphone, X, Check, Copy, Globe, ShieldCheck, Rocket, AlertCircle } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '' }) => {
  const [showModal, setShowModal] = useState(false);
  const [copiedType, setCopiedType] = useState<'dev' | 'pre' | null>(null);

  const devUrl = 'https://ais-dev-cdn6za537525cc5iucwcth-155266384191.asia-southeast1.run.app';
  const sharedUrl = 'https://ais-pre-cdn6za537525cc5iucwcth-155266384191.asia-southeast1.run.app';

  const [activeTab, setActiveTab] = useState<'dev' | 'deploy'>('dev');

  const handleCopy = (url: string, type: 'dev' | 'pre') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 3000);
    }
  };

  return (
    <>
      {/* Header Button */}
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer border border-indigo-400/40"
          title="Bấm để lấy link web mở trên điện thoại"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-200" />
          <span>Mở Trên Điện Thoại</span>
        </button>
      </div>

      {/* QR & Direct Link Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[94vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Mở Web Quét Mã Trên Điện Thoại
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sử dụng camera quét mã vạch và đồng bộ kho hàng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector Tabs */}
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('dev')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'dev'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                📱 Cách 1: Mở Bằng Điện Thoại Của Bạn (Đang Chạy)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('deploy')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'deploy'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                🚀 Cách 2: Tạo Link Công Khai (Không Cần Đăng Nhập)
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* TAB 1: DEV URL (WORKING RIGHT NOW) */}
              {activeTab === 'dev' && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                    <div className="font-bold flex items-center gap-1 text-blue-800">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span>Dành cho chính bạn thử nghiệm ngay trên điện thoại:</span>
                    </div>
                    <p className="text-blue-700">
                      Link này đang kết nối trực tiếp với máy chủ đang chạy. Khi mở trên điện thoại, trình duyệt sẽ yêu cầu <strong>Đăng nhập Google</strong> (dùng đúng tài khoản Google của bạn) 1 lần duy nhất để bảo mật.
                    </p>
                  </div>

                  {/* QR Code for Dev Link */}
                  <div className="flex flex-col items-center p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      Quét mã QR để mở trực tiếp:
                    </p>
                    <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-200">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(devUrl)}`}
                        alt="Mã QR dev URL"
                        className="w-40 h-40 object-contain"
                      />
                    </div>
                  </div>

                  {/* Copy Link */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">Hoặc sao chép đường link:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={devUrl}
                        className="flex-1 text-xs px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-900 font-mono select-all truncate"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(devUrl, 'dev')}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs"
                      >
                        {copiedType === 'dev' ? 'Đã sao chép!' : 'Chép link'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: HOW TO ACTIVATE PUBLIC LINK (NO LOGIN) */}
              {activeTab === 'deploy' && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Vì sao link công khai báo lỗi "Page not found"?</span>
                    </div>
                    <p className="text-amber-800">
                      Trên nền tảng Google AI Studio, link công khai (Shared URL) chỉ hoạt động sau khi bạn bấm nút <strong>"Deploy"</strong> (hoặc <strong>"Publish"</strong>) ở góc trên bên phải màn hình làm việc!
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-700">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Rocket className="w-4 h-4 text-emerald-600" />
                      2 Bước để bất kỳ ai cũng mở được (KHÔNG cần đăng nhập):
                    </h4>

                    <ol className="list-decimal pl-4 space-y-2 text-slate-700">
                      <li>
                        Nhìn lên <strong>góc trên cùng bên phải màn hình Google AI Studio</strong>, bấm vào nút <strong>"Deploy"</strong> (hoặc <strong>"Publish"</strong>).
                      </li>
                      <li>
                        Sau khi hệ thống báo Deploy thành công (khoảng 30 giây), link bên dưới sẽ hoạt động vĩnh viễn và <strong>bất kỳ điện thoại nào cũng truy cập được mà không cần đăng nhập gì cả!</strong>
                      </li>
                    </ol>
                  </div>

                  <div className="space-y-1 pt-1">
                    <p className="text-xs font-bold text-slate-700">Link công khai sau khi Deploy:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={sharedUrl}
                        className="flex-1 text-xs px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-900 font-mono select-all truncate font-bold text-emerald-700"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(sharedUrl, 'pre')}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs"
                      >
                        {copiedType === 'pre' ? 'Đã sao chép!' : 'Chép link'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
