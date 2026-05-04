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
      // Refresh user data after payment
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
                   subscription?.plan === 'pro300' ? 'Pro 300' :
                   subscription?.plan === 'business' ? 'Business' : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">🖼️ Image Background Remover</h1>
          <p className="text-slate-400">上传图片，一键移除背景</p>
        </div>

        {/* Auth bar */}
        {loginError && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-2 text-red-300 text-sm text-center">
            ❌ {loginError}
          </div>
        )}
        <div className="mb-6 flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3">
          {checkingAuth ? (
            <span className="text-slate-400 text-sm">加载中...</span>
          ) : user ? (
            <div className="flex items-center gap-4">
              <div>
                <span className="text-white text-sm font-medium">{user.name}</span>
                <span className="text-slate-400 text-sm ml-2">({user.email})</span>
              </div>
              {planName && (
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-lg">
                  {planName} · 剩余 {credits} 次
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-sm">登录后可使用</span>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.href = '/pricing'}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              >
                💳 升级
              </button>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                退出登录
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              🔐 登录 Google
            </button>
          )}
        </div>

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
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-slate-400 text-sm mb-2 text-center">原图</p>
                <div className="relative rounded-lg overflow-hidden bg-[url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiI+PHBhdGggZD0iTTEgMWgzdjJIMUMxeiIgZmlsbD0iIzMzNCIgLz48L3N2Zz4=)] bg-repeat">
                  <img src={preview} alt="Original" className="w-full rounded-lg" />
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
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
                🔄 重新上传
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
  );
}