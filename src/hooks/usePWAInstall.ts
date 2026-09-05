import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isChrome: boolean;
  installApp: () => Promise<boolean>;
  showInstallGuide: boolean;
  setShowInstallGuide: (show: boolean) => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  useEffect(() => {
    // Check if already launched in standalone mode
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent default Chrome mini-infobar
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallGuide(false);
      console.info('PWA was installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isChrome = typeof window !== 'undefined' && /Chrome|Chromium|CriOS/.test(navigator.userAgent);

  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      // If no native prompt event is available (e.g. Chrome on iOS or already prompted), show the custom guide
      setShowInstallGuide(true);
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.warn('Error launching install prompt:', err);
      setShowInstallGuide(true);
      return false;
    }
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt || (!isInstalled && isChrome),
    isInstalled,
    isIOS,
    isChrome,
    installApp,
    showInstallGuide,
    setShowInstallGuide,
  };
}
