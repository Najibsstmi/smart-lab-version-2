import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

function isAppInstalled() {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isAppInstalled);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowGuide(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === 'accepted') {
      setInstalled(true);
    }
  };

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        aria-label="Pasang aplikasi Smart Lab"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Pasang Smart Lab
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="install-guide-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Pasang Smart Lab
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isIosDevice()
                    ? 'Tekan butang Kongsi dalam Safari, kemudian pilih “Tambah ke Skrin Utama”.'
                    : 'Buka menu browser dan pilih “Pasang aplikasi” atau “Tambah ke skrin utama”.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                aria-label="Tutup panduan pemasangan"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
