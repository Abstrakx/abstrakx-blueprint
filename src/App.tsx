import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function DeepLinkListener() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const isProcessing = useRef(false);

  useEffect(() => {
    // Only set up deep-link on desktop/Tauri
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (!isTauri) return;

    let unsubscribe: (() => void) | null = null;

    const setupDeepLink = async () => {
      try {
        const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
        unsubscribe = await onOpenUrl(async (urls: string[]) => {
          console.log('Received deep link urls:', urls);
          if (isProcessing.current) {
            console.log('[App] DeepLinkListener: Already processing a deep link, skipping.');
            return;
          }
          isProcessing.current = true;

          try {
            for (const url of urls) {
              // Check if redirect contains the callback route
              if (url.includes('callback')) {
                const { handleDeepLinkCallback } = await import('./lib/auth');
                const session = await handleDeepLinkCallback(url);
                if (session) {
                  await refreshSession();
                  navigate('/dashboard');
                }
              }
            }
          } catch (err) {
            console.error('Error handling deep link in listener:', err);
          } finally {
            isProcessing.current = false;
          }
        });
      } catch (err) {
        console.error('Failed to register deep link handler:', err);
      }
    };


    setupDeepLink();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigate, refreshSession]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 text-text">
        <div className="w-10 h-10 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        <div className="text-xs text-text-secondary font-mono tracking-wider uppercase">Loading Secure Session...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <DeepLinkListener />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/workspace/:projectId" 
              element={
                <ProtectedRoute>
                  <WorkspacePage />
                </ProtectedRoute>
              } 
            />
            {/* Fallback to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

