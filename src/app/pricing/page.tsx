'use client';

import { useState, useEffect } from 'react';

interface Plan {
  id: string;
  name: string;
  price: number;
  credits: number;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'credits_single', name: 'Single', credits: 1, price: 0.99 },
  { id: 'credits_10', name: '10 Credits', credits: 10, price: 4.99 },
  { id: 'credits_100', name: '100 Credits', credits: 100, price: 79 },
  { id: 'credits_500', name: '500 Credits', credits: 500, price: 349 },
  { id: 'credits_1000', name: '1000 Credits', credits: 1000, price: 599 },
];

const SUBSCRIPTION_PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', price: 10.99, credits: 50 },
  { id: 'basic100', name: 'Basic 100', price: 21.99, credits: 100 },
  { id: 'pro300', name: 'Pro 300', price: 64.99, credits: 300 },
  { id: 'business', name: 'Business', price: 109.99, credits: 500 },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [user, setUser] = useState<{ name: string; email: string; credits: number } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.loggedIn) {
          setUser(data.user);
        }
      });
  }, []);

  const handlePurchase = async (type: 'order' | 'subscription', id: string) => {
    if (!user) {
      setMessage({ type: 'error', text: '请先登录' });
      return;
    }

    setLoading(id);
    setMessage(null);

    try {
      const endpoint = type === 'order'
        ? '/api/paypal/create-order'
        : '/api/paypal/create-subscription';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type === 'order' ? { packageId: id } : { planId: id }),
      });

      const data = await res.json();

      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        setMessage({ type: 'error', text: data.error || '创建订单失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络错误，请重试' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-2">选择您的计划</h1>
        <p className="text-slate-400 text-center mb-8">按需选择，灵活付费</p>

        {message && (
          <div className={`mb-6 p-4 rounded-lg text-center ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
            {message.text}
          </div>
        )}

        {/* Credit Packages */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">积分包（一次性）</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CREDIT_PACKAGES.map(pkg => (
              <div key={pkg.id} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-blue-500 transition-colors">
                <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                <p className="text-3xl font-bold text-blue-400 mb-2">${pkg.price}</p>
                <p className="text-slate-400 mb-6">{pkg.credits} 次使用额度</p>
                <button
                  onClick={() => handlePurchase('order', pkg.id)}
                  disabled={loading === pkg.id}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {loading === pkg.id ? '跳转中...' : '立即购买'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Plans */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">月度订阅</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SUBSCRIPTION_PLANS.map(plan => (
              <div key={plan.id} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-purple-500 transition-colors relative">
                {plan.id === 'professional' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-sm px-3 py-1 rounded-full">推荐</span>
                )}
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-3xl font-bold text-purple-400 mb-2">${plan.price}<span className="text-lg text-slate-400">/月</span></p>
                <p className="text-slate-400 mb-6">{plan.credits} 次/月</p>
                <button
                  onClick={() => handlePurchase('subscription', plan.id)}
                  disabled={loading === plan.id}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {loading === plan.id ? '跳转中...' : '订阅'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">支付由 PayPal 提供支持（沙箱环境）</p>
        </div>
      </div>
    </div>
  );
}
