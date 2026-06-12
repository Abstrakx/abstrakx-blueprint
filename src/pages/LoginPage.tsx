import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithProvider } from '../lib/auth';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import bannerImg from '../assets/Banner.png';

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleOAuth = async (provider: 'github' | 'google') => {
    try {
      setIsLoading(true);
      showToast(`Connecting to secure ${provider} Auth API Gateway...`, 'info');
      await signInWithProvider(provider);
    } catch (error: any) {
      showToast(error.message || 'Authentication failed', 'warning');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row text-text font-sans overflow-hidden overscroll-none">
      {/* SISI KIRI: FORM LOGIN */}
      <div className="w-full md:w-[40%] md:min-w-[400px] flex flex-col justify-center items-center p-8 md:p-12 relative z-10 bg-bg border-r border-border h-screen overflow-y-auto shrink-0">
        {/* Background Decorative Grid */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Glow Effect */}
        <div className="absolute w-[250px] h-[250px] bg-accent-glow blur-[100px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none" />

        <div className="relative z-10 w-full max-w-[360px] animate-fade-in-up">
          {/* Brand Header */}
          <header className="flex flex-col items-center gap-3 mb-8 text-center">
            <div className="w-11 h-11 flex items-center justify-center overflow-hidden">
              <img src="/Logo.png" alt="Abstrakx Logo" className="w-full h-full object-contain p-1.5 rounded-xl" />
            </div>
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight mb-0.5">Abstrakx Blueprint</h1>
              <p className="text-[12px] text-text-muted uppercase tracking-[1.5px]">by Abstrakx Enterprise</p>
            </div>
          </header>

          {/* Login Card */}
          <main className="bg-bg-card border border-border rounded-xl p-7">
            <div className="space-y-4">
              <button
                onClick={() => handleOAuth('github')}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#24292e] border border-[#3f4448] text-white rounded-md text-[13px] font-semibold hover:bg-[#2f363d] hover:border-[#444d56] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                </svg>
                Sign in as Developer (GitHub)
              </button>

              <button
                onClick={() => handleOAuth('google')}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-white border border-gray-200 text-gray-800 rounded-md text-[13px] font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in as Client (Google)
              </button>
            </div>

            {/* <div className="flex items-center text-center my-6 text-[11px] text-text-muted uppercase tracking-[0.5px] before:flex-1 before:border-b before:border-border before:mr-3 after:flex-1 after:border-b after:border-border after:ml-3">
              Or Skip for Demo
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 px-4 bg-bg-elevated border border-border text-text rounded-md text-[13px] font-semibold hover:bg-bg-hover hover:border-border-hover transition-all"
            >
              Enter Demo Mode
            </button> */}
          </main>

          <footer className="mt-6 text-center text-[11px] text-text-muted">
            🔒 End-to-end encrypted node session • Abstrakx Blueprint v0.1.0
          </footer>
        </div>
      </div>

      {/* SISI KANAN: SHOWCASE TIM / BANNER */}
      <div className="hidden md:flex md:w-[60%] relative h-screen items-end p-16 bg-[#111] overflow-hidden">
        {/* Banner image as background */}
        <div
          className="absolute inset-0 z-10 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: `url(${bannerImg})` }}
        />
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-tr from-bg/95 via-bg/70 to-transparent z-20 pointer-events-none" />

        {/* Showcase Content */}
        <div className="relative z-30 max-w-[500px] animate-fade-in-up">
          <span className="inline-block font-mono text-[11px] text-accent bg-accent/10 border border-accent/30 px-2.5 py-1 rounded-md mb-4 uppercase tracking-[1px]">
            // internal_workspace
          </span>
          <h2 className="text-3xl font-bold leading-tight mb-3 tracking-tight text-white">
            Accelerate Engineering Execution.
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Kelola <em>repository</em>, pantau <em>automated deployment pipeline</em>, dan kolaborasi antar <em>squad</em> Abstrakx Enterprise dalam satu konsol terpadu.
          </p>
        </div>
      </div>
    </div>
  );
}
