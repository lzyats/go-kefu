import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ChatWidget from '../../components/feature/ChatWidget';
import { getAppId, getPublicConfig, getTenantId, PublicFAQ } from '../../lib/customerApi';

export default function ChatDemo() {
  const params = new URLSearchParams(window.location.search);
  const embed = params.get('embed') === '1';
  const linkParams = new URLSearchParams(params);
  linkParams.delete('embed');
  const fullscreenPath = `/chat-fullscreen${linkParams.toString() ? `?${linkParams.toString()}` : ''}`;
  const [brandName, setBrandName] = useState('ChatFlow');
  const [faqs, setFaqs] = useState<PublicFAQ[]>([]);
  const tenantId = getTenantId();
  const appId = getAppId();

  useEffect(() => {
    void loadPublicConfig();
  }, [tenantId, appId]);

  async function loadPublicConfig() {
    try {
      const config = await getPublicConfig({ force: true });
      setBrandName(config.display_name || 'ChatFlow');
      setFaqs(config.faqs || []);
    } catch {
      setBrandName('ChatFlow');
      setFaqs([]);
    }
  }

  if (embed) {
    return (
      <div className="fixed inset-0 bg-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <ChatWidget />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_30%)]" />
      <main className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/70 px-3 py-1 text-xs font-medium text-teal-700">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            {brandName} 在线客服入口
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-normal text-slate-900">{brandName} 客服</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            当前访问租户：{tenantId}，应用：{appId}。右下角为悬浮窗口入口，也可以进入全屏网页版对话。
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon="ri-chat-3-line" title="悬浮对话" desc="适合嵌入官网、H5 或业务系统" />
            <Feature icon="ri-customer-service-2-line" title="人工接待" desc="消息会进入当前租户坐席平台" />
            <Feature icon="ri-questionnaire-line" title="常见问题" desc={faqs.length ? `已配置 ${faqs.length} 条` : '当前租户暂未配置'} />
            <Link
              to={fullscreenPath}
              className="group rounded-xl border border-teal-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-white">
                <i className="ri-window-line" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-sm font-semibold text-slate-800">
                <span>网页版体验</span>
                <i className="ri-arrow-right-line text-teal-500 transition group-hover:translate-x-0.5" />
              </div>
              <div className="mt-1 text-xs text-slate-500">点击进入全屏网页版</div>
            </Link>
          </div>

          {faqs.length > 0 && (
            <section className="mt-8 rounded-xl border border-slate-200 bg-white/85 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <i className="ri-questionnaire-line text-teal-600" />
                常见问题
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {faqs.slice(0, 6).map((faq) => (
                  <div key={faq.faq_id || faq.id || faq.question} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="text-sm font-medium text-slate-700">{faq.question}</div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{faq.answer}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <ChatWidget />
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
        <i className={icon} />
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-800">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{desc}</div>
    </div>
  );
}
