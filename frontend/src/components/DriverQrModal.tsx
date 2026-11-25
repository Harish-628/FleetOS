import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, CheckCircle, WifiOff } from 'lucide-react';

import { api } from '../lib/api';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DriverQrModal: React.FC<QrModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const driverKey = api.getDriverKey();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const driverPwaUrl = `${origin}${pathname}?key=${encodeURIComponent(driverKey)}#driver`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative max-w-sm w-full bg-[#0F172A] border-2 border-[#10B981]/60 rounded-2xl p-6 shadow-2xl text-center space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#1E293B] text-slate-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] mx-auto">
          <Smartphone className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white font-sans">Bus Dashboard QR Launch</h3>
          <p className="text-xs text-slate-400 mt-1">
            Scan with driver smartphone to launch 100% offline-ready cockpit PWA
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
          <QRCodeSVG
            value={driverPwaUrl}
            size={180}
            level="H"
            includeMargin={true}
          />
        </div>

        <div className="text-[11px] font-mono text-slate-400 break-all px-2 bg-[#090D16] p-2 rounded-lg border border-[#1E293B]">
          {driverPwaUrl}
        </div>

        <div className="grid grid-cols-2 gap-2 text-left text-[11px] font-sans pt-2 border-t border-[#1E293B]">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Zero install required</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <WifiOff className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Works 100% offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};
