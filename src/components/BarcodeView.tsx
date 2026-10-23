import React, { useMemo } from 'react';
import { generateCode128Bars } from '../utils/barcode';

interface BarcodeViewProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}

export const BarcodeView: React.FC<BarcodeViewProps> = ({
  value,
  height = 54,
  showText = true,
  className = ''
}) => {
  const bars = useMemo(() => {
    try {
      return generateCode128Bars(value || '000000');
    } catch {
      return '';
    }
  }, [value]);

  if (!bars) {
    return <div className="text-xs text-slate-400 font-mono py-2">{value}</div>;
  }

  const barWidth = 2;
  const totalWidth = bars.length * barWidth;

  return (
    <div className={`inline-flex flex-col items-center bg-white p-2 rounded border border-slate-200 shadow-xs ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full h-auto max-h-16"
        style={{ minWidth: '160px' }}
      >
        {bars.split('').map((char, index) => {
          if (char === '1') {
            return (
              <rect
                key={index}
                x={index * barWidth}
                y={0}
                width={barWidth}
                height={height}
                fill="#0f172a"
              />
            );
          }
          return null;
        })}
      </svg>
      {showText && (
        <span className="font-mono text-xs font-semibold text-slate-800 tracking-widest mt-1">
          {value}
        </span>
      )}
    </div>
  );
};
