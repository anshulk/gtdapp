import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  CheckCircle2, 
  Laptop, 
  Smartphone, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstalled, isIOS, installApp } = usePWAInstall();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleInstallClick = async () => {
    const success = await installApp();
    if (success) {
      onClose();
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="pwa-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Modal Container */}
          <motion.div
            key="pwa-modal-box"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#141414] border border-[#2D2721] rounded-2xl shadow-2xl overflow-hidden text-gray-200 z-10 my-auto"
        >
          {/* Header Banner */}
          <div className="relative px-6 pt-6 pb-5 bg-gradient-to-b from-[#1C1814] to-[#141414] border-b border-[#262626]">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#C5A47E]/10 border border-[#C5A47E]/40 flex items-center justify-center text-[#C5A47E] shadow-lg shadow-[#C5A47E]/10">
                <img src="/icon.svg" alt="GTD App Icon" className="w-8 h-8 rounded-lg" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-serif flex items-center gap-2">
                  Install GTD App
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#C5A47E]/15 text-[#C5A47E] border border-[#C5A47E]/30">
                    Chrome App
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Launch instantly from your desktop, taskbar, or home screen
                </p>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5">
            {isInstalled ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-emerald-300">Application is Already Installed</h4>
                <p className="text-xs text-emerald-200/80">
                  GTD App is installed and running in standalone app mode with offline shell caching.
                </p>
              </div>
            ) : (
              <>
                {/* Benefits Pill Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-[#1A1A1A] border border-[#262626] rounded-xl text-left space-y-1">
                    <Zap className="w-4 h-4 text-[#C5A47E]" />
                    <p className="text-xs font-bold text-white">Instant Launch</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">No browser tabs or address bar clutter.</p>
                  </div>

                  <div className="p-3 bg-[#1A1A1A] border border-[#262626] rounded-xl text-left space-y-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs font-bold text-white">Offline Shell</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">Fast loading with local cached service worker.</p>
                  </div>

                  <div className="p-3 bg-[#1A1A1A] border border-[#262626] rounded-xl text-left space-y-1">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <p className="text-xs font-bold text-white">Native Shortcuts</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">Quick capture &amp; weekly review launcher.</p>
                  </div>
                </div>

                {/* Chrome Installation Steps / Trigger */}
                <div className="p-4 bg-[#181512] border border-[#382E24] rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#DFCAAC]">
                    <Laptop className="w-4 h-4 text-[#C5A47E]" />
                    <span>How to Install in Google Chrome:</span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-300">
                    <div className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#2A231C] text-[#C5A47E] text-[11px] font-bold shrink-0">
                        1
                      </span>
                      <span>
                        Click the <strong className="text-white font-semibold">Install App</strong> button below or look for the <strong>Install icon (🖥️ or ⊕)</strong> on the right side of Chrome's address bar.
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#2A231C] text-[#C5A47E] text-[11px] font-bold shrink-0">
                        2
                      </span>
                      <span>
                        Confirm <strong className="text-white font-semibold">"Install"</strong> in Chrome's prompt popup.
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#2A231C] text-[#C5A47E] text-[11px] font-bold shrink-0">
                        3
                      </span>
                      <span>
                        Pin <strong className="text-white font-semibold">GTD App</strong> to your dock, taskbar, or start menu for 1-click access.
                      </span>
                    </div>
                  </div>

                  {isIOS && (
                    <div className="pt-2 border-t border-[#382E24] flex items-start gap-2 text-[11px] text-amber-200">
                      <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        On iOS Safari/Chrome: Tap <strong>Share</strong> (box with arrow) and choose <strong>"Add to Home Screen"</strong>.
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-[#111111] border-t border-[#262626] flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-lg hover:bg-[#1A1A1A] transition-colors cursor-pointer"
            >
              Close
            </button>

            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-black bg-[#C5A47E] hover:bg-[#b8946e] active:bg-[#a8845e] rounded-lg shadow-md shadow-[#C5A47E]/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install Application</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
