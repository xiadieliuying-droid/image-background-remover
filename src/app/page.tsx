'use client';

import { useState, useRef, useEffect } from 'react';

interface UserInfo {
  email: string;
  name: string;
  id?: number;
}

interface Subscription {
  plan: string;
  credits: number;
  status: string;
}

// Google-style sign-in button component
function GoogleLoginButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 bg-white border border-slate-300 rounded-lg px-4 py-2 hover:shadow-md transition-shadow"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      <span className="text-sm font-medium text-slate-700">Sign in with Google</span>
    </button>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  // Check auth on mount and handle error params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'auth_failed') setLoginError('登录失败，请重试');
    else if (err === 'db_not_configured') setLoginError('服务配置问题，请联系支持');

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.loggedIn) {
          setUser(data.user);
          setSubscription(data.subscription);
        }
        setCheckingAuth(false);
      })
      .catch(() => setCheckingAuth(false));

    // Handle PayPal redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paypal_success') === '1') {
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(data => {
          if (data.loggedIn) {
            setUser(data.user);
            setSubscription(data.subscription);
          }
        });
    }
  }, []);

  const handleFile = (f: File) => {
    setError(null);
    setResult(null);
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('仅支持 JPG、PNG、WebP 格式');
      return;
    }
    if (f.size > MAX_SIZE) {
      setError('文件大小不能超过 10MB');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleRemove = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/remove', { method: 'POST', body: formData });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === 'login_required' || data.error === 'no_credits') {
          window.location.href = '/api/auth/login';
          return;
        }
        throw new Error(data.message || data.error || '处理失败');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResult(url);

      if (user) {
        fetch('/api/auth/me')
          .then(r => r.json())
          .then(data => {
            if (data.loggedIn) setSubscription(data.subscription);
          });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result;
    const name = file?.name.replace(/\.[^.]+$/, '') ?? 'image';
    a.download = `${name}-rmbg.png`;
    a.click();
  };

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setSubscription(null);
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const credits = subscription?.credits ?? 0;
  const planName = subscription?.plan === 'free' ? '免费用户' :
                   subscription?.plan === 'starter' ? 'Starter' :
                   subscription?.plan === 'basic100' ? 'Basic 100' :
                   subscription?.plan === 'pro200' ? 'Pro 200' :
                   subscription?.plan === 'pro300' ? 'Pro 300' :
                   subscription?.plan === 'business' ? 'Business' :
                   subscription?.plan === 'enterprise' ? 'Enterprise' : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Top header bar */}
      <div className="w-full bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div>
            <h1 className="text-xl font-bold text-slate-800">🖼️ Image Background Remover</h1>
            <p className="text-xs text-slate-500">上传图片，一键移除背景</p>
          </div>

          {/* Auth area - top right */}
          <div className="flex items-center gap-4">
            {checkingAuth ? (
              <span className="text-slate-400 text-sm">加载中...</span>
            ) : user ? (
              <div className="flex items-center gap-4">
                {planName && (
                  <div className="text-right">
                    <span className="text-sm font-medium text-slate-700">{user.name}</span>
                    <div className="text-xs text-slate-500">
                      {planName} · 剩余 {credits} 次
                    </div>
                  </div>
                )}
                <button
                  onClick={() => window.location.href = '/pricing'}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  💳 升级
                </button>
                <button
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-slate-800 text-sm transition-colors"
                >
                  退出
                </button>
              </div>
            ) : (
              <GoogleLoginButton onClick={handleLogin} />
            )}
          </div>
        </div>
      </div>

      {/* Login error */}
      {loginError && (
        <div className="max-w-2xl mx-auto mt-6 bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-2 text-red-300 text-sm text-center">
          ❌ {loginError}
        </div>
      )}

      {/* Main content - centered */}
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {/* Upload Area */}
          {!preview ? (
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-slate-600 hover:border-slate-400'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-5xl mb-4">📤</div>
              <p className="text-white text-lg mb-1">拖拽图片到这里，或点击选择</p>
              <p className="text-slate-500 text-sm">支持 JPG、PNG、WebP，最大 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm mb-2 text-center">原图</p>
                  <div className="relative rounded-lg overflow-hidden bg-[url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiI+PHBhdGggZD0iTTEgMWgzdjJIMUMxeiIgZmlsbD0iIzMzNCIgLz48L3N2Zz4=)] bg-repeat">
                    <img src={preview} alt="Original" className="w-full rounded-lg" />
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm mb-2 text-center">去背图</p>
                  <div className="relative rounded-lg overflow-hidden bg-[url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiI+PHBhdGggZD0iTTEgMWgzdjJIMUMxeiIgZmlsbD0iIzMzNCIgLz48L3N2Zz4=)] bg-repeat">
                    {result ? (
                      <img src={result} alt="Result" className="w-full rounded-lg" />
                    ) : (
                      <div className="aspect-square flex items-center justify-center text-slate-600">
                        {loading ? '⏳ 处理中...' : '等待处理'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRemove}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  {loading ? '⏳ 处理中...' : '🎯 移除背景'}
                </button>
                {result && (
                  <button
                    onClick={handleDownload}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                  >
                    ⬇️ 下载去背图
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  🔄
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300 text-center">
              ❌ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}