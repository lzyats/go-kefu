import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import Footer from '../../components/feature/Footer';

function HeroSection() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 20,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 20,
      });
    };
    const el = heroRef.current;
    if (el) el.addEventListener('mousemove', handleMouseMove);
    return () => { if (el) el.removeEventListener('mousemove', handleMouseMove); };
  }, []);

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden bg-surface-subtle">
      {/* Abstract background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-brand-100/50 blur-3xl transition-transform duration-700 ease-out"
          style={{ transform: `translate(${mousePos.x * 2}px, ${mousePos.y * 2}px)` }}
        />
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-50/80 blur-3xl transition-transform duration-700 ease-out"
          style={{ transform: `translate(${-mousePos.x}px, ${-mousePos.y}px)` }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-teal-50/30 blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(13,148,136,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 w-full px-6 md:px-10 pt-24 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-brand-200 rounded-full text-sm font-medium text-brand-700 mb-6 shadow-soft">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                v2.0 全新升级上线
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-6">
                智能客服
                <br />
                <span className="text-brand-600">实时连接</span>每一次对话
              </h1>

              <p className="text-base md:text-lg text-slate-500 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                新一代在线客服系统，融合AI智能助手与人工坐席，为企业打造无缝的客户服务体验。支持多语言、多渠道接入，让服务更高效。
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                <Link
                  to="/chat-demo"
                  className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-all shadow-glow hover:shadow-lg whitespace-nowrap"
                >
                  免费体验
                </Link>
                <Link
                  to="/agent-dashboard"
                  className="px-8 py-3 bg-white border border-slate-200 hover:border-brand-300 text-slate-700 font-medium rounded-xl transition-all shadow-soft hover:shadow-card whitespace-nowrap"
                >
                  进入工作台
                </Link>
              </div>

              <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start">
                {[
                  { num: '99.9%', label: '系统可用性' },
                  { num: '<1s', label: '平均响应' },
                  { num: '50+', label: '语言支持' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-slate-800">{stat.num}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right visual - Chat preview card */}
            <div className="flex-1 w-full max-w-md lg:max-w-lg">
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-elevated border border-slate-100 overflow-hidden">
                  {/* Chat header */}
                  <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                      <i className="ri-customer-service-2-line text-brand-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">智能客服助手</div>
                      <div className="flex items-center gap-1.5 text-xs text-brand-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                        在线中
                      </div>
                    </div>
                  </div>

                  {/* Chat messages */}
                  <div className="px-5 py-4 space-y-3 bg-slate-50/50">
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="ri-robot-2-line text-brand-600 text-xs" />
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-soft max-w-[80%]">
                        <p className="text-sm text-slate-600">您好！我是您的智能客服助手，请问有什么可以帮您？</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 justify-end">
                      <div className="bg-brand-500 rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-soft max-w-[80%]">
                        <p className="text-sm text-white">我想了解你们的产品定价方案</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="ri-robot-2-line text-brand-600 text-xs" />
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-soft max-w-[80%]">
                        <p className="text-sm text-slate-600">好的！我们提供基础版、专业版和企业版三种方案，您可以根据团队规模选择。</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {['基础版 ¥99/月', '专业版 ¥299/月', '企业版 定制'].map((plan) => (
                            <span key={plan} className="px-2.5 py-1 bg-brand-50 text-brand-700 text-xs rounded-full font-medium">{plan}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat input */}
                  <div className="px-4 py-3 border-t border-slate-50 bg-white">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <input
                        type="text"
                        placeholder="输入消息..."
                        className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                        readOnly
                      />
                      <button className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white hover:bg-brand-600 transition-colors">
                        <i className="ri-send-plane-fill text-sm" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Floating decorative elements */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-white rounded-xl shadow-card border border-slate-100 flex items-center justify-center animate-bounce">
                  <i className="ri-notification-3-line text-brand-500 text-xl" />
                </div>
                <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-brand-500 rounded-xl shadow-glow flex items-center justify-center">
                  <i className="ri-translate-2 text-white text-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  const features = [
    {
      icon: 'ri-chat-3-line',
      title: '实时聊天',
      desc: '毫秒级消息同步，支持文字、图片、文件等多种消息类型，让沟通零延迟。',
      color: 'bg-brand-50 text-brand-600',
    },
    {
      icon: 'ri-robot-2-line',
      title: 'AI智能客服',
      desc: '基于大语言模型的智能客服机器人，7x24小时自动响应，准确率超过95%。',
      color: 'bg-amber-50 text-amber-600',
    },
    {
      icon: 'ri-questionnaire-line',
      title: '常见问题',
      desc: '智能FAQ检索系统，用户输入关键词即可快速匹配答案，减少重复咨询。',
      color: 'bg-sky-50 text-sky-600',
    },
    {
      icon: 'ri-translate-2',
      title: '多语言支持',
      desc: '支持50+种语言实时翻译，打破语言障碍，服务全球用户。',
      color: 'bg-violet-50 text-violet-600',
    },
    {
      icon: 'ri-emotion-happy-line',
      title: '满意度评分',
      desc: '会话结束后自动邀请用户评价，实时收集反馈，持续优化服务质量。',
      color: 'bg-rose-50 text-rose-600',
    },
    {
      icon: 'ri-palette-line',
      title: '自定义主题',
      desc: '支持自定义品牌色、Logo、欢迎语，让客服窗口与您的品牌完美融合。',
      color: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 bg-white">
      <div className="px-6 md:px-10 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 bg-brand-50 border border-brand-100 rounded-full text-sm font-medium text-brand-700 mb-4">
            核心功能
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">全链路智能客服解决方案</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            从用户接入到服务闭环，每一个功能模块都经过精心设计，确保最佳的服务体验
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl border border-slate-100 bg-white hover:border-brand-200 hover:bg-brand-50/30 transition-all duration-300 cursor-default"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <i className={`${feature.icon} text-xl`} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  const steps = [
    { num: '01', title: '一键接入', desc: '复制一段代码，3分钟完成网站集成' },
    { num: '02', title: '智能分流', desc: 'AI自动识别意图，精准匹配解决方案' },
    { num: '03', title: '人工接管', desc: '复杂问题无缝转人工，服务不中断' },
    { num: '04', title: '数据分析', desc: '实时会话数据洞察，驱动服务优化' },
  ];

  return (
    <section id="demo" className="py-20 md:py-28 bg-surface-subtle">
      <div className="px-6 md:px-10 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 mb-4">
            使用流程
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">四步开启智能客服</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            极简的接入流程，无需复杂配置，即刻享受专业级客服体验
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, idx) => (
            <div key={step.num} className="relative">
              <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-card transition-shadow">
                <div className="text-3xl font-bold text-brand-200 mb-4">{step.num}</div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 text-slate-300">
                  <i className="ri-arrow-right-line text-xl" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/chat-demo"
            className="inline-flex items-center gap-2 px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-all shadow-glow hover:shadow-lg"
          >
            立即体验演示
            <i className="ri-arrow-right-line" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="px-6 md:px-10 max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-10 md:p-16 text-center">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-brand-500 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-teal-400 blur-3xl" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              准备好提升您的客户体验了吗？
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-8">
              加入超过 10,000 家企业的选择，用 ChatFlow 打造世界级的客户服务体验
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/chat-demo"
                className="px-8 py-3 bg-brand-500 hover:bg-brand-400 text-white font-medium rounded-xl transition-colors shadow-glow whitespace-nowrap"
              >
                免费开始
              </Link>
              <a
                href="#api"
                className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors border border-white/20 whitespace-nowrap"
              >
                查看文档
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />
      <main>
        <HeroSection />
        <FeatureSection />
        <DemoSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}