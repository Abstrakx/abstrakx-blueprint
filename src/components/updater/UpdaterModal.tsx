import { useState, useEffect } from 'react';
import { Download, RefreshCw, AlertTriangle, CheckCircle2, Sparkles, X } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface UpdaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoCheck?: boolean;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'up-to-date' | 'error';

export function UpdaterModal({ isOpen, onClose, autoCheck = false }: UpdaterModalProps) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    date?: string;
    body?: string;
  } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState({ downloaded: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const [updateObj, setUpdateObj] = useState<any>(null);

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const checkForUpdates = async () => {
    if (!isTauri) {
      setStatus('checking');
      setTimeout(() => {
        // Mock update for testing in browser if needed, but normally up-to-date
        setStatus('up-to-date');
      }, 1500);
      return;
    }

    try {
      setStatus('checking');
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (update) {
        setUpdateObj(update);
        setUpdateInfo({
          version: update.version,
          date: update.date,
          body: update.body,
        });
        setStatus('available');
      } else {
        setStatus('up-to-date');
      }
    } catch (err: any) {
      console.error('Update check error:', err);
      setErrorMessage(err.message || 'Failed to check for updates');
      setStatus('error');
      if (!autoCheck) {
        showToast('Failed to check for updates', 'warning');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkForUpdates();
    }
  }, [isOpen]);

  const handleUpdate = async () => {
    if (!updateObj) return;

    try {
      setStatus('downloading');
      setDownloadProgress({ downloaded: 0, total: 0 });

      let downloadedBytes = 0;
      let totalBytes = 0;

      await updateObj.downloadAndInstall((event: any) => {
        switch (event.event) {
          case 'Started':
            totalBytes = event.data.contentLength || 0;
            setDownloadProgress({ downloaded: 0, total: totalBytes });
            break;
          case 'Progress':
            downloadedBytes += event.data.chunkLength;
            setDownloadProgress({ downloaded: downloadedBytes, total: totalBytes });
            break;
          case 'Finished':
            setStatus('installing');
            break;
        }
      });

      // After download/install finished, relaunch
      setStatus('installing');
      showToast('Update installed! Restarting app...', 'success');
      
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err: any) {
      console.error('Download & install error:', err);
      setErrorMessage(err.message || 'Failed to download or install update');
      setStatus('error');
      showToast('Update installation failed', 'warning');
    }
  };

  if (!isOpen) return null;

  // Calculate percentage
  const percent = downloadProgress.total > 0 
    ? Math.round((downloadProgress.downloaded / downloadProgress.total) * 100) 
    : 0;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in"
      style={{ zIndex: 1100 }}
    >
      <div 
        className="bg-bg-card border border-border rounded-xl w-full max-w-[460px] p-7 shadow-2xl relative overflow-hidden animate-fade-in-up"
      >
        {/* Glow Effects */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        {status !== 'downloading' && status !== 'installing' && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-bg-elevated border border-border text-text-muted hover:bg-bg-hover hover:text-white transition-colors flex items-center justify-center"
          >
            <X size={14} />
          </button>
        )}

        <div className="flex flex-col items-center text-center mt-2">
          {/* Status Icons */}
          {status === 'checking' && (
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-5 animate-pulse">
              <RefreshCw className="text-accent animate-spin" size={24} />
            </div>
          )}

          {status === 'available' && (
            <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
              <Sparkles className="text-accent animate-bounce" size={24} />
            </div>
          )}

          {(status === 'downloading' || status === 'installing') && (
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
              <RefreshCw className="text-blue-400 animate-spin" size={24} />
            </div>
          )}

          {status === 'up-to-date' && (
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5">
              <CheckCircle2 className="text-green-400" size={24} />
            </div>
          )}

          {status === 'error' && (
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
              <AlertTriangle className="text-red-400" size={24} />
            </div>
          )}

          {/* Heading */}
          <h3 className="text-lg font-bold tracking-tight text-text mb-1">
            {status === 'checking' && 'Checking for Updates'}
            {status === 'available' && 'New Update Available!'}
            {status === 'downloading' && 'Downloading Update'}
            {status === 'installing' && 'Installing Update'}
            {status === 'up-to-date' && 'Application Up to Date'}
            {status === 'error' && 'Update Failed'}
          </h3>

          {/* Description */}
          <div className="text-xs text-text-secondary max-w-[320px] mb-6 leading-relaxed">
            {status === 'checking' && 'Menghubungkan ke server rilis untuk memeriksa versi terbaru...'}
            {status === 'up-to-date' && 'Kamu sudah menggunakan versi terbaru dari Abstrakx Blueprint.'}
            {status === 'error' && (errorMessage || 'Terjadi kesalahan saat mengunduh pembaruan.')}
            
            {status === 'available' && updateInfo && (
              <div>
                <p className="mb-2">Versi baru <strong className="text-accent">{updateInfo.version}</strong> telah tersedia.</p>
                {updateInfo.body && (
                  <div className="bg-bg-elevated border border-border rounded-lg p-3 text-[11px] text-left max-h-[120px] overflow-y-auto font-mono text-text-secondary leading-normal">
                    {updateInfo.body}
                  </div>
                )}
              </div>
            )}

            {status === 'downloading' && (
              <div className="w-full">
                <p className="mb-2">Mengunduh paket pembaruan... ({percent}%)</p>
                <div className="w-full h-1.5 bg-bg-elevated border border-border rounded-full overflow-hidden mb-1">
                  <div 
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {downloadProgress.total > 0 && (
                  <p className="text-[10px] text-text-muted">
                    {formatSize(downloadProgress.downloaded)} / {formatSize(downloadProgress.total)}
                  </p>
                )}
              </div>
            )}

            {status === 'installing' && 'Mengekstrak berkas dan memasang pembaruan. Aplikasi akan segera dimuat ulang...'}
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full border-t border-border/60 pt-5 mt-2 justify-center">
            {status === 'up-to-date' && (
              <button
                onClick={onClose}
                className="w-full max-w-[140px] py-2 bg-bg-elevated border border-border rounded-md text-xs font-semibold hover:bg-bg-hover transition-colors"
              >
                Close
              </button>
            )}

            {status === 'error' && (
              <>
                <button
                  onClick={checkForUpdates}
                  className="px-4 py-2 bg-accent text-bg rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-bg-elevated border border-border rounded-md text-xs font-semibold hover:bg-bg-hover transition-colors"
                >
                  Close
                </button>
              </>
            )}

            {status === 'available' && (
              <>
                <button
                  onClick={handleUpdate}
                  className="px-5 py-2.5 bg-accent text-bg rounded-md text-xs font-bold hover:opacity-90 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all flex items-center gap-1.5"
                >
                  <Download size={14} /> Update Now
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-bg-elevated border border-border rounded-md text-xs font-semibold hover:bg-bg-hover transition-colors"
                >
                  Later
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
