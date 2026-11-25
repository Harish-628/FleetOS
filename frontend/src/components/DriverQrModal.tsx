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
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 flex items-center justify-center p-4">
      <div className="relative max-w-sm w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6 shadow-xl text-center space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 min-h-[40px] min-w-[40px] p-2 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center transition"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-400 mx-auto">
          <Smartphone className="w-5 h-5" />
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50 font-sans tracking-tight">Bus Dashboard QR Launch</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Scan with driver smartphone to launch 100% offline-ready cockpit PWA
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 dark:border-zinc-700 inline-block shadow-xs">
          <QRCodeSVG
            value={driverPwaUrl}
            size={180}
            level="H"
            includeMargin={true}
          />
        </div>

        <div className="text-[11px] font-mono text-slate-600 dark:text-zinc-400 break-all px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 rounded-md border border-slate-200 dark:border-zinc-800">
          {driverPwaUrl}
        </div>

        <div className="grid grid-cols-2 gap-2 text-left text-[11px] font-sans pt-3 border-t border-slate-200 dark:border-zinc-800">
          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-zinc-300">
            <CheckCircle className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Zero install required</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-zinc-300">
            <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Works 100% offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};
