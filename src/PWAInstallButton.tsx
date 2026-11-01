import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Smartphone, Download, X, Share2, PlusSquare } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, do not show button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold shadow-md active:scale-95 transition-all"
        title="התקן בטלפון לשימוש ללא אינטרנט"
      >
        <Download className="w-4 h-4" />
        <span>התקן אפליקציה</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-blue-600/30 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 px-3 py-1.5 text-xs sm:text-sm font-medium hover:bg-blue-100 transition active:scale-95"
        >
          <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>התקנה ב-iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 shadow-2xl text-right">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    התקנה באייפון / אייפד
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
                <div className="flex items-start gap-3 bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-xl">
                  <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-1.5 rounded-lg">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-white">שלב 1:</span>
                    <p className="text-xs mt-0.5">הקש על כפתור <b>השיתוף (Share)</b> בסרגל התחתון של Safari.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-xl">
                  <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-1.5 rounded-lg">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-white">שלב 2:</span>
                    <p className="text-xs mt-0.5">גלול מטה ובחר באפשרות <b>״הוסף למסך הבית״ (Add to Home Screen)</b>.</p>
                  </div>
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                  האפליקציה תותקן במסך הבית של הטלפון שלך ותעבוד תמיד, במהירות ובלי רישום!
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-98 transition shadow"
              >
                הבנתי, תודה
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
