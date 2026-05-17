import ChatWidget from '../../components/feature/ChatWidget';

export default function ChatDemo() {
  return (
    <div className="min-h-screen bg-surface-subtle relative">
      {/* Demo page background content */}
      <div className="p-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">聊天弹窗演示页面</h1>
        <p className="text-slate-500 max-w-lg">
          点击右下角的悬浮按钮即可打开客服聊天窗口。您可以体验实时对话、常见问题检索、多语言切换和主题风格切换等功能。系统支持四种主题风格：清新青绿、深色科技、暖色亲和、商务极简。
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl">
          <div className="p-5 bg-white rounded-xl border border-slate-100 shadow-soft">
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center mb-2">
              <i className="ri-chat-3-line text-white text-sm" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">实时对话</h3>
            <p className="text-xs text-slate-400 mt-1">输入消息与AI助手进行对话</p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-100 shadow-soft">
            <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center mb-2">
              <i className="ri-questionnaire-line text-white text-sm" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">常见问题</h3>
            <p className="text-xs text-slate-400 mt-1">切换到常见问题标签快速检索</p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-100 shadow-soft">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center mb-2">
              <i className="ri-palette-line text-white text-sm" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">主题风格</h3>
            <p className="text-xs text-slate-400 mt-1">四种主题风格一键切换</p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-100 shadow-soft">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mb-2">
              <i className="ri-settings-4-line text-white text-sm" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">个性化设置</h3>
            <p className="text-xs text-slate-400 mt-1">切换主题、语言和通知偏好</p>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}