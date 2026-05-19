import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, getCaptcha, login, listMyTenants, setAuth, setTenantContext } from '@/lib/customerApi';

export default function AgentLogin() {
  const navigate = useNavigate();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [verifyKey, setVerifyKey] = useState('');
  const [captchaImg, setCaptchaImg] = useState('');
  const [tenantId] = useState(localStorage.getItem('kefu:web:tenant_id') || 'tenant-demo');
  const [appId] = useState(localStorage.getItem('kefu:web:app_id') || 'default');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const userType = Number(auth?.userInfo?.userType ?? 0);
    if (auth?.token && (userType === 1 || userType === 2)) {
      navigate('/agent-dashboard', { replace: true });
      return;
    }
    refreshCaptcha();
  }, [navigate]);

  async function refreshCaptcha() {
    setCaptchaLoading(true);
    try {
      const data = await getCaptcha();
      setVerifyKey(data.key);
      setCaptchaImg(data.img);
      setCaptcha('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取验证码失败');
    } finally {
      setCaptchaLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!account.trim()) {
      setError('请输入账号');
      return;
    }
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }
    if (!captcha.trim()) {
      setError('请输入验证码');
      return;
    }
    if (!verifyKey) {
      setError('验证码未加载，请刷新后重试');
      return;
    }

    setLoading(true);
    try {
      setTenantContext(tenantId, appId);
      const res = await login(account.trim(), password, captcha.trim(), verifyKey);
      const userType = Number(res.userInfo.userType ?? 1);
      if (userType === 0) {
        setError('客户用户不能登录租户后台或坐席工作台');
        await refreshCaptcha();
        return;
      }

      setAuth({
        token: res.token,
        userInfo: { ...res.userInfo, userType: userType as 1 | 2 },
        tenantId,
        appId,
      });

      if (userType === 1) {
        try {
          const tenants = await listMyTenants();
          const first = tenants.items?.[0]?.tenant_id || tenants.items?.[0]?.id;
          if (first) setTenantContext(first, appId);
        } catch {
          // 未绑定租户时继续进入，工作台会显示空数据。
        }
      }

      navigate('/agent-dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
      await refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left decorative area */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #5eead4 100%)' }}>
        <div className="absolute inset-0">
          {/* Floating circles */}
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-40 right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          
          {/* Grid pattern */}
          <div 
            className="absolute inset-0"
            style={{
              display: 'none',
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <i className="ri-chat-smile-3-line text-white text-xl" />
              </div>
              <span className="text-white text-xl font-semibold tracking-tight">ChatFlow</span>
            </div>

            <h2 className="text-white text-3xl font-bold leading-tight mb-4">
              智能客服工作台
            </h2>
            <p className="text-white/80 text-base leading-relaxed max-w-sm">
              高效连接每一位客户，用智能驱动服务体验升级。实时会话、数据分析、客户洞察，一站式掌控。
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <i className="ri-customer-service-2-line" style={{ color: '#ffffff', fontSize: 26, lineHeight: 1 }} />
              </div>
              <div>
                <div style={{ color: '#ffffff', fontSize: 15, lineHeight: '21px', fontWeight: 500 }}>多渠道接入</div>
                <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: '18px', fontWeight: 400 }}>网页、APP、小程序统一接待</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <i className="ri-robot-2-line" style={{ color: '#ffffff', fontSize: 26, lineHeight: 1 }} />
              </div>
              <div>
                <div style={{ color: '#ffffff', fontSize: 15, lineHeight: '21px', fontWeight: 500 }}>AI 智能辅助</div>
                <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: '18px', fontWeight: 400 }}>自动回复、意图识别、知识库匹配</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <i className="ri-bar-chart-box-line" style={{ color: '#ffffff', fontSize: 26, lineHeight: 1 }} />
              </div>
              <div>
                <div style={{ color: '#ffffff', fontSize: 15, lineHeight: '21px', fontWeight: 500 }}>数据驱动决策</div>
                <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: '18px', fontWeight: 400 }}>实时监控、满意度分析、绩效统计</div>
              </div>
            </div>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: '18px', fontWeight: 400 }}>
            ChatFlow 智能客服系统 v2.0
          </div>
        </div>
      </div>

      {/* Right login form area */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile header - only show on small screens */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center">
              <i className="ri-chat-smile-3-line text-white text-lg" />
            </div>
            <span className="text-slate-800 text-lg font-semibold">ChatFlow</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-8 md:p-10">
            <div className="mb-8">
              <h1 className="text-xl font-bold text-slate-800 mb-1">坐席登录</h1>
              <p className="text-sm text-slate-400">欢迎回来，请登录您的坐席账号</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Account */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  账号
                </label>
                <div style={{ position: 'relative', height: 42 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: 0,
                      width: 20,
                      height: 42,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  >
                    <i className="ri-user-3-line" style={{ fontSize: 18, lineHeight: 1 }} />
                  </div>
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="请输入坐席账号"
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:border-brand-400 focus:bg-white transition-all placeholder:text-slate-400"
                    style={{ height: 42, paddingLeft: 40, paddingRight: 16, lineHeight: '42px' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  密码
                </label>
                <div style={{ position: 'relative', height: 42 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: 0,
                      width: 20,
                      height: 42,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  >
                    <i className="ri-lock-password-line" style={{ fontSize: 18, lineHeight: 1 }} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入登录密码"
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:border-brand-400 focus:bg-white transition-all placeholder:text-slate-400"
                    style={{ height: 42, paddingLeft: 40, paddingRight: 40, lineHeight: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: 0,
                      width: 20,
                      height: 42,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className={showPassword ? 'ri-eye-line' : 'ri-eye-off-line'} style={{ fontSize: 18, lineHeight: 1 }} />
                  </button>
                </div>
              </div>

              {/* Captcha */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  验证码
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1" style={{ height: 42 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: 0,
                        width: 20,
                        height: 42,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        pointerEvents: 'none',
                        zIndex: 1,
                      }}
                    >
                      <i className="ri-shield-check-line" style={{ fontSize: 18, lineHeight: 1 }} />
                    </div>
                    <input
                      type="text"
                      value={captcha}
                      onChange={(e) => setCaptcha(e.target.value)}
                      placeholder="请输入验证码"
                      maxLength={4}
                      className="w-full bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:border-brand-400 focus:bg-white transition-all placeholder:text-slate-400"
                      style={{ height: 42, paddingLeft: 40, paddingRight: 16, lineHeight: '42px' }}
                    />
                  </div>
                  {/* Captcha display */}
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center select-none cursor-pointer hover:bg-slate-200 transition-colors overflow-hidden"
                    style={{ width: 126, minWidth: 126, maxWidth: 126, height: 42, minHeight: 42, maxHeight: 42, flexShrink: 0 }}
                    title="点击刷新验证码"
                  >
                    {captchaLoading ? (
                      <span className="text-xs text-slate-400">刷新中</span>
                    ) : captchaImg ? (
                      <img src={captchaImg} alt="验证码" style={{ width: 126, height: 42, objectFit: 'contain', display: 'block' }} />
                    ) : (
                      <span className="text-xs text-slate-400">验证码</span>
                    )}
                  </button>
                </div>
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="text-xs text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    看不清？换一张
                  </button>
                </div>
              </div>

              {/* Remember me + forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                  />
                  <span className="text-sm text-slate-500">记住登录状态</span>
                </label>
                <button type="button" className="text-sm text-brand-600 hover:text-brand-700 transition-colors">
                  忘记密码？
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 rounded-xl border border-red-100">
                  <div className="w-4 h-4 flex items-center justify-center text-red-500 flex-shrink-0">
                    <i className="ri-error-warning-line text-sm" />
                  </div>
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white text-sm font-medium rounded-xl transition-colors shadow-soft flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>登录中...</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-login-box-line text-sm" />
                    </div>
                    <span>登录工作台</span>
                  </>
                )}
              </button>
            </form>

          </div>

          {/* Back to home */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-600 transition-colors"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-arrow-left-line text-xs" />
              </div>
              <span>返回产品首页</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
