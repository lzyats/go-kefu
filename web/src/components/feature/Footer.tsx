import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-100">
      <div className="px-6 md:px-10 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <i className="ri-chat-smile-3-line text-white text-lg" />
              </div>
              <span className="font-semibold text-slate-800 text-lg">ChatFlow</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              新一代智能客服系统，让每一次对话都成为提升用户体验的机会。
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-4">产品功能</h4>
            <ul className="space-y-2.5">
              {['实时聊天', '智能客服', '常见问题', '多语言支持'].map((item) => (
                <li key={item}>
                  <span className="text-sm text-slate-500 hover:text-brand-600 cursor-pointer transition-colors">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-4">开发者</h4>
            <ul className="space-y-2.5">
              {['API 文档', '快速接入', 'SDK 下载', '开发指南'].map((item) => (
                <li key={item}>
                  <span className="text-sm text-slate-500 hover:text-brand-600 cursor-pointer transition-colors">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-4">联系我们</h4>
            <ul className="space-y-2.5">
              {['帮助中心', '反馈建议', '商务合作', '隐私政策'].map((item) => (
                <li key={item}>
                  <span className="text-sm text-slate-500 hover:text-brand-600 cursor-pointer transition-colors">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">2026 ChatFlow. All rights reserved.</p>
          <div className="flex items-center gap-3">
            {['ri-github-line', 'ri-twitter-x-line', 'ri-discord-line'].map((icon) => (
              <button
                key={icon}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-colors"
              >
                <i className={`${icon} text-sm`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}