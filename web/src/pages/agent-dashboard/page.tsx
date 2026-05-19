import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import StatsCards from './components/StatsCards';
import SessionList from './components/SessionList';
import ChatArea from './components/ChatArea';
import CustomerPanel from './components/CustomerPanel';
import { normalizeChatTheme, type ChatTheme, themeLabels, themeList } from '@/lib/chatTheme';
import { notifyMessage, unlockSound } from '@/lib/notify';
import {
  addAgentToGroup,
  Agent,
  AgentGroup,
  acceptSession,
  ChatMessage,
  Channel,
  DashboardStats,
  deleteAgent,
  deleteAgentGroup,
  deleteChannel,
  clearAuth,
  getAuth,
  getAppId,
  getDashboard,
  getSessionCustomerAvatar,
  getMyAgent,
  getSessionCustomerName,
  getWsUrl,
  getTenantId,
  listAgentGroups,
  listAgents,
  listChannels,
  listSessionMessages,
  listSessions,
  listCommonFAQs,
  listTenantConfigs,
  listTenantFAQs,
  PublicFAQ,
  saveAgent,
  saveAgentGroup,
  saveChannel,
  saveTenantConfig,
  saveTenantFAQs,
  sendWsMessage,
  SessionItem,
  setAgentOnline,
  uploadChatImage,
} from '@/lib/customerApi';

type RecentSessionPreview = {
  session: SessionItem;
  lastMessage?: ChatMessage;
};

type CustomerPreview = {
  key: string;
  name: string;
  online: boolean;
  sessionCount: number;
  latestSession: SessionItem;
  channels: string[];
  statuses: string[];
};

const DASHBOARD_CACHE_TTL = 30 * 1000;
const RECENT_SESSION_LIMIT = 5;
const recentCache = {
  savedAt: 0,
  items: [] as RecentSessionPreview[],
};
const customerCache = {
  savedAt: 0,
  items: [] as CustomerPreview[],
};
const messagePreviewCache = new Map<string, { savedAt: number; message?: ChatMessage }>();

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('dashboard');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [noticeCount, setNoticeCount] = useState(0);
  const [noticeResetToken, setNoticeResetToken] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({ online_agents: 0, waiting_sessions: 0, serving_sessions: 0, today_messages: 0 });
  const [recentSessions, setRecentSessions] = useState<RecentSessionPreview[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerPreview[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerKeyword, setCustomerKeyword] = useState('');
  const auth = getAuth();

  useEffect(() => {
    void refreshDashboard();
  }, []);

  useEffect(() => {
    if (activeNav === 'dashboard') void refreshDashboard();
    if (activeNav === 'customers') void refreshCustomers();
  }, [activeNav]);

  async function refreshDashboard() {
    await Promise.all([refreshStats(), refreshRecentSessions()]);
  }

  async function refreshStats() {
    try {
      setStats(await getDashboard());
    } catch {
      setStats({ online_agents: 0, waiting_sessions: 0, serving_sessions: 0, today_messages: 0 });
    }
  }

  async function refreshRecentSessions() {
    if (Date.now() - recentCache.savedAt < DASHBOARD_CACHE_TTL) {
      setRecentSessions(recentCache.items);
      setRecentLoading(false);
      return;
    }
    setRecentLoading(true);
    try {
      const res = await listSessions('', 20, 0);
      const sessions = compactDuplicateSessions(res.items || []).slice(0, RECENT_SESSION_LIMIT);
      const previews = await Promise.all(sessions.map(async (session) => {
        const cached = messagePreviewCache.get(session.id);
        if (cached && Date.now() - cached.savedAt < DASHBOARD_CACHE_TTL) return { session, lastMessage: cached.message };
        const lastMessage = await loadSessionLastMessage(session);
        messagePreviewCache.set(session.id, { savedAt: Date.now(), message: lastMessage });
        return { session, lastMessage };
      }));
      recentCache.savedAt = Date.now();
      recentCache.items = previews;
      setRecentSessions(previews);
    } catch {
      setRecentSessions([]);
    } finally {
      setRecentLoading(false);
    }
  }

  async function refreshCustomers() {
    if (Date.now() - customerCache.savedAt < DASHBOARD_CACHE_TTL) {
      setCustomers(customerCache.items);
      setCustomersLoading(false);
      return;
    }
    setCustomersLoading(true);
    try {
      const res = await listSessions('', 100, 0);
      const items = buildCustomerPreviews(res.items || []);
      customerCache.savedAt = Date.now();
      customerCache.items = items;
      setCustomers(items);
    } catch {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }

  const filteredCustomers = customers.filter((item) => {
    const keyword = customerKeyword.trim().toLowerCase();
    if (!keyword) return true;
    return `${item.name} ${item.key} ${item.channels.join(' ')}`.toLowerCase().includes(keyword);
  });

  function handleLogout() {
    clearAuth();
    setUserMenuOpen(false);
    navigate('/agent-login', { replace: true });
  }

  function openSessionsFromNotice() {
    setNoticeCount(0);
    setNoticeResetToken((value) => value + 1);
    setActiveNav('sessions');
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex font-sans">
      <AgentNoticeTracker resetToken={noticeResetToken} onChange={setNoticeCount} />
      <Sidebar active={activeNav} onChange={setActiveNav} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-800">
              {activeNav === 'dashboard' && '鏁版嵁姒傝'}
              {activeNav === 'sessions' && '鍧愬腑骞冲彴'}
              {activeNav === 'customerLinks' && '瀵硅瘽閾炬帴'}
              {activeNav === 'channels' && '娓犻亾璁剧疆'}
              {activeNav === 'agents' && '鍧愬腑鍒嗛厤'}
              {activeNav === 'groups' && '坐席组'}
              {activeNav === 'customers' && '瀹㈡埛鍒楄〃'}
              {activeNav === 'analytics' && '鏁版嵁鍒嗘瀽'}
              {activeNav === 'settings' && '绯荤粺璁剧疆'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
              <i className="ri-search-line text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="鍏ㄥ眬鎼滅储..."
                className="bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 w-40"
              />
            </div>

            <button
              onClick={openSessionsFromNotice}
              className="relative w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              title="未处理消息"
            >
              <i className="ri-notification-3-line" />
              {noticeCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold leading-[18px] text-center shadow-soft">
                  {noticeCount > 99 ? '99+' : noticeCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-brand-600 text-sm font-medium">席</span>
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-slate-700">{auth?.userInfo.userNickname || auth?.userInfo.userName || '瀹㈡湇鍧愬腑'}</div>
                <div className="text-[11px] text-emerald-500">鍦ㄧ嚎</div>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
                title="鐢ㄦ埛鑿滃崟"
              >
                <i className={`ri-arrow-down-s-line transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-elevated">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="text-sm font-semibold text-slate-800 truncate">{auth?.userInfo.userNickname || auth?.userInfo.userName || '褰撳墠鐢ㄦ埛'}</div>
                      <div className="mt-1 text-xs text-slate-400 truncate">租户：{auth?.tenantId || getTenantId()}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <i className="ri-logout-box-r-line" />
                      闁偓閸戣櫣娅ヨぐ?                    </button>
                  </div>
                </>
              )}
            </div>

            <Link
              to="/"
              className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
            >
              <i className="ri-home-line" />
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {activeNav === 'dashboard' && (
            <div className="h-full overflow-y-auto p-6">
              <StatsCards stats={stats} />

              {/* Recent sessions preview */}
              <div className="mt-6 bg-white rounded-xl border border-slate-100 shadow-soft overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">最近会话</h3>
                  <button
                    onClick={() => setActiveNav('sessions')}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    鏌ョ湅鍏ㄩ儴
                  </button>
                </div>
                <div className="divide-y divide-slate-50">
                  {recentLoading && (
                    <div className="px-5 py-8 text-center text-xs text-slate-400">姝ｅ湪鍔犺浇鏈€杩戜細璇?..</div>
                  )}
                  {!recentLoading && recentSessions.length === 0 && (
                    <div className="px-5 py-8 text-center text-xs text-slate-400">暂无最近会话</div>
                  )}
                  {!recentLoading && recentSessions.map((item) => {
                    const name = getSessionCustomerName(item.session);
                    const avatar = getSessionCustomerAvatar(item.session);
                    return (
                      <button
                        key={item.session.id}
                        onClick={() => setActiveNav('sessions')}
                        className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {avatar ? (
                            <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover bg-slate-100 flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-slate-600">{name.slice(0, 1).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm text-slate-800 truncate">{name}</div>
                            <div className="text-xs text-slate-400 truncate">{recentSessionSummary(item)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <span className={`w-2 h-2 rounded-full ${sessionStatusDot(item.session.status)}`} />
                          <span className="text-xs text-slate-400">{formatRelativeTime(item.session.last_msg_time || item.session.updated_at || item.session.created_at)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Performance chart placeholder */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">浠婃棩浼氳瘽瓒嬪娍</h3>
                  <div className="h-40 flex items-end gap-2">
                    {[35, 52, 45, 60, 75, 68, 85, 72, 90, 65, 55, 70].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-md bg-brand-100 hover:bg-brand-200 transition-colors"
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[10px] text-slate-400">{i + 8}时</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">满意度分布</h3>
                  <div className="space-y-3">
                    {[
                      { label: '闈炲父婊℃剰 (5鏄?', count: 86, total: 120, color: 'bg-emerald-500' },
                      { label: '婊℃剰 (4鏄?', count: 24, total: 120, color: 'bg-brand-500' },
                      { label: '涓€鑸?(3鏄?', count: 7, total: 120, color: 'bg-amber-400' },
                      { label: '涓嶆弧鎰?(1-2鏄?', count: 3, total: 120, color: 'bg-red-400' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="text-slate-500">{item.count}人</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full transition-all`}
                            style={{ width: `${(item.count / item.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNav === 'sessions' && (
            <AgentWorkbench onNoticeCountChange={setNoticeCount} />
          )}

          {activeNav === 'customerLinks' && <CustomerLinks />}

          {activeNav === 'channels' && <ManageResource type="channels" />}

          {activeNav === 'agents' && <ManageResource type="agents" />}

          {activeNav === 'groups' && <ManageResource type="groups" />}

          {activeNav === 'customers' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="bg-white rounded-xl border border-slate-100 shadow-soft">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">瀹㈡埛鍒楄〃</h3>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                    <i className="ri-search-line text-slate-400 text-sm" />
                    <input
                      type="text"
                      value={customerKeyword}
                      onChange={(e) => setCustomerKeyword(e.target.value)}
                      placeholder="鎼滅储瀹㈡埛..."
                      className="bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 w-48"
                    />
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {customersLoading && (
                    <div className="px-5 py-8 text-center text-xs text-slate-400">姝ｅ湪鍔犺浇瀹㈡埛鍒楄〃...</div>
                  )}
                  {!customersLoading && filteredCustomers.length === 0 && (
                    <div className="px-5 py-8 text-center text-xs text-slate-400">鏆傛棤瀹㈡埛鏁版嵁</div>
                  )}
                  {!customersLoading && filteredCustomers.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setActiveNav('sessions')}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          {getSessionCustomerAvatar(c.latestSession) ? (
                            <img src={getSessionCustomerAvatar(c.latestSession)} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-slate-600">{c.name.slice(0, 1).toUpperCase()}</span>
                          )}
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${customerOnlineDot(c)}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                          <div className="text-xs text-slate-400 truncate">
                            {c.channels.join('、') || 'web'} · {c.sessionCount} 次会话 · 最近{sessionStatusText(c.latestSession.status)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <div className="flex gap-1">
                          {customerTags(c).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] rounded-full">{tag}</span>
                          ))}
                        </div>
                        <span className={`text-xs ${isCustomerOnline(c) ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {isCustomerOnline(c) ? '鍦ㄧ嚎' : '绂荤嚎'}
                        </span>
                        <span className="text-xs text-slate-400">{formatRelativeTime(c.latestSession.last_msg_time || c.latestSession.updated_at || c.latestSession.created_at)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeNav === 'analytics' && <AnalyticsView />}


          {activeNav === 'settings' && <TenantSettings />}

        </main>
      </div>
    </div>
  );
}

function AgentWorkbench({ onNoticeCountChange }: { onNoticeCountChange?: (count: number) => void }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeSessionID, setActiveSessionID] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadBySession, setUnreadBySession] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | undefined>(undefined);
  const activeSessionIDRef = useRef('');

  const activeSession = sessions.find((item) => item.id === activeSessionID) || null;

  useEffect(() => {
    onNoticeCountChange?.(calculateUnhandledCount(sessions, unreadBySession));
  }, [sessions, unreadBySession, onNoticeCountChange]);

  useEffect(() => {
    void bootstrap();
    return () => {
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (activeSessionID) void loadMessages(activeSessionID);
    activeSessionIDRef.current = activeSessionID;
    if (activeSessionID) {
      setUnreadBySession((old) => ({ ...old, [activeSessionID]: 0 }));
    }
  }, [activeSessionID]);

  async function bootstrap() {
    setLoading(true);
    setError('');
    try {
      const currentAgent = await resolveWorkbenchAgent();
      setAgent(currentAgent);
      if (currentAgent.agent_id) {
        await setAgentOnline(currentAgent.agent_id, 'default', currentAgent.max_sessions || 5);
        connectAgentWS(currentAgent.agent_id);
      }
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : '坐席平台初始化失败');
    } finally {
      setLoading(false);
    }
  }

  async function resolveWorkbenchAgent() {
    try {
      return await getMyAgent();
    } catch (err) {
      const auth = getAuth();
      if (auth?.userInfo?.userType === 2) {
        throw err;
      }
      const res = await listAgents();
      const fallback = (res.items || []).find((item) => item.status !== 'disabled') || res.items?.[0];
      if (!fallback) {
        throw new Error('当前租户还没有可用坐席，请先在坐席分配中添加坐席，或使用坐席账号登录。');
      }
      return fallback;
    }
  }

  async function loadSessions(nextActiveID = activeSessionID) {
    const res = await listSessions('', 100, 0);
    const items = compactDuplicateSessions(res.items || []);
    setSessions(items);
    if (!nextActiveID || !items.some((item) => item.id === nextActiveID)) {
      setActiveSessionID(items[0]?.id || '');
    }
  }

  async function loadMessages(sessionID: string) {
    const res = await listSessionMessages(sessionID, 0, 200);
    setMessages((res.items || []).sort((a, b) => a.seq - b.seq));
  }

  function connectAgentWS(agentID: string) {
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    const ws = new WebSocket(getWsUrl('agent', agentID, `agent-${agentID}`));
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ event: 'ping' }));
    ws.onclose = () => {
      if (wsRef.current === ws) {
        reconnectTimerRef.current = window.setTimeout(() => connectAgentWS(agentID), 3000);
      }
    };
    ws.onmessage = (event) => {
      const envelope = JSON.parse(event.data);
      if (envelope.event !== 'message') return;
      const message = parseWsData<ChatMessage>(envelope.data);
      const isActive = message.session_id === activeSessionIDRef.current;
      if (message.sender_type === 'customer') {
        notifyMessage('收到客户新消息', message.msg_type === 'image' ? '[图片]' : message.content.slice(0, 60), {
          sound: true,
          desktop: true,
          vibration: true,
        });
        if (!isActive) {
          setUnreadBySession((old) => ({ ...old, [message.session_id]: (old[message.session_id] || 0) + 1 }));
        }
      }
      setMessages((old) => {
        if (!isActive) return old;
        if (old.some((item) => item.id === message.id || item.client_msg_id === message.client_msg_id)) return old;
        return [...old, message].sort((a, b) => a.seq - b.seq);
      });
      setSessions((old) => {
        const exists = old.some((item) => item.id === message.session_id);
        if (!exists) {
          void loadSessions(activeSessionIDRef.current);
          return old;
        }
        return old.map((item) => item.id === message.session_id ? {
          ...item,
          last_seq: Math.max(item.last_seq || 0, message.seq || 0),
          last_msg_time: message.send_time,
          updated_at: message.send_time || item.updated_at,
        } : item);
      });
    };
  }

  async function handleAccept(session: SessionItem) {
    if (!agent?.agent_id) return setError('????????????');
    const accepted = await acceptSession(session.id, agent.agent_id);
    setSessions((old) => old.map((item) => item.id === accepted.id ? accepted : item));
    setActiveSessionID(accepted.id);
    await sendAgentGreeting(accepted);
  }

  async function waitForAgentSocket() {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    await new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const timer = window.setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          window.clearInterval(timer);
          resolve();
        }
        if (Date.now() - start > 3000) {
          window.clearInterval(timer);
          reject(new Error('WebSocket ???'));
        }
      }, 50);
    });
  }

  async function sendAgentGreeting(session: SessionItem) {
    if (!agent?.agent_id) return;
    const content = `?????${agent.display_name || agent.username || '??'}?????????`;
    const clientMsgID = `agent-greeting-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const greeting: ChatMessage = {
      id: clientMsgID,
      tenant_id: session.tenant_id,
      app_id: session.app_id,
      channel_id: session.channel_id,
      session_id: session.id,
      client_msg_id: clientMsgID,
      sender_id: agent.agent_id,
      sender_type: 'agent',
      receiver_id: session.user_id,
      msg_type: 'text',
      content,
      seq: (messages[messages.length - 1]?.seq || 0) + 1,
      status: 'sending',
      send_time: new Date().toISOString(),
    };
    setMessages((old) => session.id === activeSessionIDRef.current ? [...old, greeting] : old);
    try {
      await waitForAgentSocket();
      sendWsMessage(wsRef.current, { session_id: session.id, content, msg_type: 'text', client_msg_id: clientMsgID });
    } catch (err) {
      setMessages((old) => old.map((item) => item.client_msg_id === clientMsgID ? { ...item, status: 'failed' } : item));
      setError(err instanceof Error ? err.message : '?????????');
    }
  }

  async function handleSend(content: string) {
    if (!activeSession || !agent?.agent_id) return;
    let targetSession = activeSession;
    if (targetSession.status === 'waiting') {
      targetSession = await acceptSession(targetSession.id, agent.agent_id);
      setSessions((old) => old.map((item) => item.id === targetSession.id ? targetSession : item));
      setActiveSessionID(targetSession.id);
    }
    const clientMsgID = `agent-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimistic: ChatMessage = {
      id: clientMsgID,
      tenant_id: targetSession.tenant_id,
      app_id: targetSession.app_id,
      channel_id: targetSession.channel_id,
      session_id: targetSession.id,
      client_msg_id: clientMsgID,
      sender_id: agent.agent_id,
      sender_type: 'agent',
      receiver_id: targetSession.user_id,
      msg_type: 'text',
      content,
      seq: (messages[messages.length - 1]?.seq || 0) + 1,
      status: 'sending',
      send_time: new Date().toISOString(),
    };
    setMessages((old) => [...old, optimistic]);
    try {
      await waitForAgentSocket();
      sendWsMessage(wsRef.current, { session_id: targetSession.id, content, msg_type: 'text', client_msg_id: clientMsgID });
    } catch (err) {
      setMessages((old) => old.map((item) => item.client_msg_id === clientMsgID ? { ...item, status: 'failed' } : item));
      setError(err instanceof Error ? err.message : '??????');
    }
  }

  async function handleSendImage(file: File) {
    if (!activeSession || !agent?.agent_id) return;
    let targetSession = activeSession;
    if (targetSession.status === 'waiting') {
      targetSession = await acceptSession(targetSession.id, agent.agent_id);
      setSessions((old) => old.map((item) => item.id === targetSession.id ? targetSession : item));
      setActiveSessionID(targetSession.id);
    }
    const uploaded = await uploadChatImage(file);
    const clientMsgID = `agent-image-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimistic: ChatMessage = {
      id: clientMsgID,
      tenant_id: targetSession.tenant_id,
      app_id: targetSession.app_id,
      channel_id: targetSession.channel_id,
      session_id: targetSession.id,
      client_msg_id: clientMsgID,
      sender_id: agent.agent_id,
      sender_type: 'agent',
      receiver_id: targetSession.user_id,
      msg_type: 'image',
      content: uploaded.url,
      seq: (messages[messages.length - 1]?.seq || 0) + 1,
      status: 'sending',
      send_time: new Date().toISOString(),
    };
    setMessages((old) => [...old, optimistic]);
    try {
      await waitForAgentSocket();
      sendWsMessage(wsRef.current, { session_id: targetSession.id, content: uploaded.url, msg_type: 'image', client_msg_id: clientMsgID });
    } catch (err) {
      setMessages((old) => old.map((item) => item.client_msg_id === clientMsgID ? { ...item, status: 'failed' } : item));
      setError(err instanceof Error ? err.message : '图片发送失败');
    }
  }

  if (loading) {
    return <div className="h-full flex items-center justify-center text-sm text-slate-400">姝ｅ湪鍔犺浇鍧愬腑骞冲彴...</div>;
  }

  if (error && !agent) {
    return <div className="h-full flex items-center justify-center text-sm text-rose-500">{error}</div>;
  }

  return (
    <div className="h-full max-h-full min-h-0 overflow-hidden flex" onClick={unlockSound}>
      <SessionList activeId={activeSessionID} sessions={sessions} unreadBySession={unreadBySession} onSelect={setActiveSessionID} onRefresh={() => void loadSessions()} />
      <ChatArea session={activeSession} messages={messages} agent={agent} error={error} onAccept={handleAccept} onSend={handleSend} onSendImage={handleSendImage} />
      <CustomerPanel session={activeSession} />
    </div>
  );
}

function parseWsData<T>(data: unknown): T {
  return typeof data === 'string' ? JSON.parse(data) as T : data as T;
}

function AgentNoticeTracker({ resetToken, onChange }: { resetToken: number; onChange: (count: number) => void }) {
  const sessionsRef = useRef<SessionItem[]>([]);
  const unreadRef = useRef<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | undefined>(undefined);
  const refreshTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    unreadRef.current = {};
    onChange(0);
  }, [resetToken, onChange]);

  useEffect(() => {
    let closed = false;

    async function refreshSessions() {
      try {
        const res = await listSessions('', 100, 0);
        if (closed) return;
        sessionsRef.current = compactDuplicateSessions(res.items || []);
        emitNoticeCount();
      } catch {
        // 顶部提醒只做兜底同步，失败时保留当前角标状态。
      }
    }

    async function resolveNoticeAgent() {
      try {
        return await getMyAgent();
      } catch {
        const res = await listAgents();
        return (res.items || []).find((item) => item.status !== 'disabled') || res.items?.[0] || null;
      }
    }

    function emitNoticeCount() {
      onChange(calculateUnhandledCount(sessionsRef.current, unreadRef.current));
    }

    function connect(agentID: string) {
      if (closed) return;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      const ws = new WebSocket(getWsUrl('agent', agentID, `agent-notice-${agentID}`));
      wsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ event: 'ping' }));
      ws.onclose = () => {
        if (!closed) reconnectTimerRef.current = window.setTimeout(() => connect(agentID), 3000);
      };
      ws.onmessage = (event) => {
        const envelope = JSON.parse(event.data);
        if (envelope.event !== 'message') return;
        const message = parseWsData<ChatMessage>(envelope.data);
        if (message.sender_type !== 'customer') return;
        unreadRef.current = {
          ...unreadRef.current,
          [message.session_id]: (unreadRef.current[message.session_id] || 0) + 1,
        };
        const exists = sessionsRef.current.some((item) => item.id === message.session_id);
        if (exists) {
          sessionsRef.current = sessionsRef.current.map((item) => item.id === message.session_id ? {
            ...item,
            last_seq: Math.max(item.last_seq || 0, message.seq || 0),
            last_msg_time: message.send_time,
            updated_at: message.send_time || item.updated_at,
          } : item);
          emitNoticeCount();
        } else {
          void refreshSessions();
          emitNoticeCount();
        }
      };
    }

    async function bootstrap() {
      await refreshSessions();
      const agent = await resolveNoticeAgent();
      if (!closed && agent?.agent_id) connect(agent.agent_id);
      refreshTimerRef.current = window.setInterval(refreshSessions, 10000);
    }

    void bootstrap();
    return () => {
      closed = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (refreshTimerRef.current) window.clearInterval(refreshTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [onChange]);

  return null;
}

function calculateUnhandledCount(sessions: SessionItem[], unreadBySession: Record<string, number>) {
  return sessions.reduce((total, session) => {
    const unread = unreadBySession[session.id] || 0;
    if (unread > 0) return total + unread;
    return total + (session.status === 'waiting' ? 1 : 0);
  }, 0);
}

function compactDuplicateSessions(items: SessionItem[]) {
  const byKey = new Map<string, SessionItem>();
  for (const item of items) {
    if (isClosedSession(item)) {
      byKey.set(item.id, item);
      continue;
    }
    const key = [
      item.tenant_id,
      item.app_id || 'default',
      item.channel_id || 'web',
      (item.user_id || item.user_name || item.id).trim(),
    ].join(':');
    const current = byKey.get(key);
    if (!current || compareSessionPriority(item, current) > 0) {
      byKey.set(key, item);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => sessionTime(b) - sessionTime(a));
}

function compareSessionPriority(a: SessionItem, b: SessionItem) {
  const seqDiff = (a.last_seq || 0) - (b.last_seq || 0);
  if (seqDiff !== 0) return seqDiff;
  return sessionTime(a) - sessionTime(b);
}

function sessionTime(session: SessionItem) {
  const value = session.last_msg_time || session.updated_at || session.created_at;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function isClosedSession(session: SessionItem) {
  return session.status === 'closed' || session.status === 'rated' || session.status === 'timeout';
}

function AnalyticsView() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: '鎬讳細璇濇暟', value: '1,284', change: '+12%', icon: 'ri-chat-3-line', color: 'text-brand-500' },
          { label: '骞冲潎鍝嶅簲鏃堕棿', value: '42s', change: '-8s', icon: 'ri-time-line', color: 'text-emerald-500' },
          { label: '解决率', value: '92.5%', change: '+3.2%', icon: 'ri-checkbox-circle-line', color: 'text-sky-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <i className={`${stat.icon} ${stat.color} text-xl`} />
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{stat.change}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">鐑棬鍜ㄨ璇濋</h3>
          <div className="space-y-3">
            {[
              { topic: '浜у搧瀹氫环鍜ㄨ', count: 156, pct: 78 },
              { topic: '技术支持', count: 98, pct: 52 },
              { topic: '璐︽埛闂', count: 72, pct: 38 },
              { topic: '鍔熻兘寤鸿', count: 45, pct: 24 },
              { topic: '鍚堜綔娲借皥', count: 23, pct: 12 },
            ].map((item) => (
              <div key={item.topic} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-28 truncate">{item.topic}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-400 rounded-full" style={{ width: `${item.pct}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-10 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">鍧愬腑鏈嶅姟鎺掕</h3>
          <div className="space-y-3">
            {[
              { name: '瀹㈡湇灏忔潕', sessions: 128, rating: 4.9, rank: 1 },
              { name: '瀹㈡湇灏忕帇', sessions: 115, rating: 4.8, rank: 2 },
              { name: '瀹㈡湇灏忓紶', sessions: 96, rating: 4.7, rank: 3 },
              { name: '瀹㈡湇灏忛檲', sessions: 89, rating: 4.6, rank: 4 },
            ].map((agent) => (
              <div key={agent.name} className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  agent.rank === 1 ? 'bg-amber-100 text-amber-600' : agent.rank === 2 ? 'bg-slate-100 text-slate-600' : agent.rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                }`}>{agent.rank}</span>
                <span className="text-sm text-slate-700 flex-1">{agent.name}</span>
                <span className="text-xs text-slate-500">{agent.sessions} 浼氳瘽</span>
                <span className="text-xs font-medium text-amber-500">{agent.rating} 星</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildCustomerPreviews(sessions: SessionItem[]) {
  const grouped = new Map<string, CustomerPreview>();
  for (const session of sessions) {
    const key = [session.tenant_id, session.app_id || 'default', (session.user_id || getSessionCustomerName(session)).trim()].join(':');
    const name = getSessionCustomerName(session);
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        key,
        name,
        online: !!session.customer_online,
        sessionCount: 1,
        latestSession: session,
        channels: uniqueCompact([session.channel_id || 'web']),
        statuses: uniqueCompact([session.status]),
      });
      continue;
    }
    current.sessionCount += 1;
    current.online = current.online || !!session.customer_online;
    current.channels = uniqueCompact([...current.channels, session.channel_id || 'web']);
    current.statuses = uniqueCompact([...current.statuses, session.status]);
    if (sessionTime(session) > sessionTime(current.latestSession)) {
      current.latestSession = session;
      current.name = name;
    }
  }
  return Array.from(grouped.values()).sort((a, b) => sessionTime(b.latestSession) - sessionTime(a.latestSession));
}

function uniqueCompact(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function isCustomerOnline(customer: CustomerPreview) {
  return customer.online;
}

function customerOnlineDot(customer: CustomerPreview) {
  return isCustomerOnline(customer) ? 'bg-emerald-400' : 'bg-slate-300';
}

function customerTags(customer: CustomerPreview) {
  const tags: string[] = [];
  if (customer.statuses.includes('waiting')) tags.push('待接入');
  if (customer.statuses.includes('serving')) tags.push('服务中');
  if (customer.sessionCount > 1) tags.push(`${customer.sessionCount}次会话`);
  if (tags.length === 0) tags.push(sessionStatusText(customer.latestSession.status));
  return tags.slice(0, 3);
}

function recentSessionSummary(item: RecentSessionPreview) {
  if (item.lastMessage) {
    const prefix = item.lastMessage.sender_type === 'agent' ? '坐席' : '客户';
    const content = item.lastMessage.msg_type === 'image' ? '[图片]' : item.lastMessage.content;
    return `${prefix}: ${content}`;
  }
  return `${sessionStatusText(item.session.status)} · ${item.session.channel_id || 'web'} · seq ${item.session.last_seq || 0}`;
}

async function loadSessionLastMessage(session: SessionItem) {
  if (!session.last_seq) return undefined;
  try {
    const afterSeq = Math.max(0, session.last_seq - 1);
    const msgRes = await listSessionMessages(session.id, afterSeq, 2);
    return (msgRes.items || []).sort((a, b) => a.seq - b.seq).at(-1);
  } catch {
    return undefined;
  }
}

function sessionStatusText(status: string) {
  if (status === 'waiting') return '待接入';
  if (status === 'serving') return '服务中';
  if (status === 'closed') return '已结束';
  if (status === 'timeout') return '已超时';
  if (status === 'rated') return '已评价';
  return status || '未知';
}

function sessionStatusDot(status: string) {
  if (status === 'serving') return 'bg-emerald-400';
  if (status === 'waiting') return 'bg-amber-400';
  if (status === 'closed' || status === 'rated') return 'bg-slate-300';
  if (status === 'timeout') return 'bg-rose-400';
  return 'bg-slate-300';
}

function formatRelativeTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function CustomerLinks() {
  const [copied, setCopied] = useState('');
  const [defaultTheme, setDefaultTheme] = useState<ChatTheme>('fresh');
  const [themeMessage, setThemeMessage] = useState('');
  const [themeError, setThemeError] = useState('');
  const [themeSaving, setThemeSaving] = useState(false);
  const tenantId = getTenantId();
  const appId = getAppId();
  const origin = window.location.origin;
  const basePath = __BASE_PATH__ && __BASE_PATH__ !== '/' ? `/${__BASE_PATH__.replace(/^\/|\/$/g, '')}` : '';
  const query = new URLSearchParams({
    tenant_id: tenantId,
    app_id: appId,
    theme: defaultTheme,
  }).toString();
  const floatUrl = `${origin}${basePath}/chat-demo?${query}&embed=1`;
  const fullscreenUrl = `${origin}${basePath}/chat-fullscreen?${query}`;
  const sdkUrl = `${origin}${basePath}/kefu-sdk.js`;
  const sdkOptions = `{
    tenantId: '${tenantId}',
    appId: '${appId}',
    theme: '${defaultTheme}',
    userId: '10001',
    userName: '李四',
    avatarUrl: 'https://example.com/avatar.png'
  }`;
  const htmlSnippet = `<script src="${sdkUrl}"></script>
<script>
  window.KefuChat.init(${sdkOptions});
</script>`;
  const reactSnippet = `import { useEffect } from 'react';

export default function KefuChatLoader({ user }) {
  useEffect(() => {
    if (!window.KefuChat) return;
    window.KefuChat.init({
      tenantId: '${tenantId}',
      appId: '${appId}',
      theme: '${defaultTheme}',
      userId: user?.id,
      userName: user?.name,
      avatarUrl: user?.avatar
    });

    return () => window.KefuChat.destroy();
  }, [user?.id]);

  return null;
}`;
  const vueSnippet = `<script setup>
import { onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  user: Object
});

onMounted(() => {
  window.KefuChat?.init({
    tenantId: '${tenantId}',
    appId: '${appId}',
    theme: '${defaultTheme}',
    userId: props.user?.id,
    userName: props.user?.name,
    avatarUrl: props.user?.avatar
  });
});

onBeforeUnmount(() => {
  window.KefuChat?.destroy();
});
</script>`;
  const links = [
    {
      key: 'float',
      title: '悬浮窗口入口',
      desc: '适合放到官网、H5 页面或业务系统，客户点击右下角按钮发起咨询。',
      icon: 'ri-chat-3-line',
      url: floatUrl,
      snippets: [
        { key: 'html', title: 'HTML / H5 引入方式', code: htmlSnippet },
        { key: 'react', title: 'React 引入方式', code: reactSnippet },
        { key: 'vue', title: 'Vue 引入方式', code: vueSnippet },
      ],
    },
    {
      key: 'fullscreen',
      title: '全屏网页版入口',
      desc: '适合直接发给客户，打开后进入完整网页版客服对话。',
      icon: 'ri-window-line',
      url: fullscreenUrl,
    },
  ];

  async function copyLink(key: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(key);
    window.setTimeout(() => setCopied(''), 1800);
  }

  useEffect(() => {
    loadThemeConfig();
  }, []);

  async function loadThemeConfig() {
    try {
      const res = await listTenantConfigs();
      const config = res.items?.find((item) => item.config_key === 'chat_theme');
      setDefaultTheme(normalizeChatTheme(config?.config_value));
    } catch (err) {
      setThemeError(err instanceof Error ? err.message : '主题配置加载失败');
    }
  }

  async function saveDefaultTheme() {
    setThemeSaving(true);
    setThemeError('');
    setThemeMessage('');
    try {
      await saveTenantConfig({
        config_key: 'chat_theme',
        config_value: defaultTheme,
        value_type: 'string',
        remark: '租户客户侧对话默认界面主题风格',
      });
      setThemeMessage('默认主题已保存，新的客户打开对话时生效');
    } catch (err) {
      setThemeError(err instanceof Error ? err.message : '主题保存失败');
    } finally {
      setThemeSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl space-y-5">
        <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <i className="ri-links-fill" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">对话链接</h3>
              <p className="text-xs text-slate-400 mt-1">当前租户：{tenantId}，应用：{appId}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">默认界面主题</h3>
              <p className="text-xs text-slate-400 mt-1">设置客户首次打开悬浮窗口和全屏对话时使用的主题风格。</p>
            </div>
            <button
              onClick={saveDefaultTheme}
              disabled={themeSaving}
              className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {themeSaving ? '保存中...' : '保存主题'}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {themeList.map((themeKey) => {
              const themeInfo = themeLabels[themeKey];
              const active = defaultTheme === themeKey;
              return (
                <button
                  key={themeKey}
                  type="button"
                  onClick={() => setDefaultTheme(themeKey)}
                  className={`text-left rounded-xl border px-3 py-3 transition-colors ${
                    active ? 'border-brand-400 bg-brand-50' : 'border-slate-100 bg-slate-50 hover:border-brand-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${themeInfo.dot}`} />
                    <span className="text-xs font-semibold text-slate-800">{themeInfo.label}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-slate-400">{themeInfo.desc}</p>
                </button>
              );
            })}
          </div>
          {themeMessage && <div className="mt-3 text-xs text-emerald-600">{themeMessage}</div>}
          {themeError && <div className="mt-3 text-xs text-rose-500">{themeError}</div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {links.map((item) => (
            <div key={item.key} className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                  <i className={item.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-slate-800">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-5">{item.desc}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-500 break-all">
                {item.url}
              </div>
              {'snippets' in item && item.snippets && (
                <div className="mt-3">
                  <div className="mb-1.5 text-xs font-medium text-slate-500">统一 JSSDK 引入方式</div>
                  <div className="space-y-3">
                    {item.snippets.map((snippet) => (
                      <div key={snippet.key}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-500">{snippet.title}</span>
                          <button
                            onClick={() => copyLink(`${item.key}-${snippet.key}`, snippet.code)}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700"
                          >
                            {copied === `${item.key}-${snippet.key}` ? '已复制' : '复制代码'}
                          </button>
                        </div>
                        <pre className="max-h-44 overflow-auto rounded-xl bg-slate-950 px-3 py-3 text-xs leading-5 text-slate-100 whitespace-pre-wrap break-all">
                          {snippet.code}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => copyLink(item.key, item.url)}
                  className="px-3 py-2 rounded-xl bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors"
                >
                  {copied === item.key ? '已复制' : '复制链接'}
                </button>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  打开预览
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TenantSettings() {
  const [displayName, setDisplayName] = useState('ChatFlow');
  const [faqs, setFaqs] = useState<PublicFAQ[]>([]);
  const [commonFAQs, setCommonFAQs] = useState<PublicFAQ[]>([]);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      const [res, faqRes, commonRes] = await Promise.all([listTenantConfigs(), listTenantFAQs(), listCommonFAQs()]);
      const config = res.items?.find((item) => item.config_key === 'display_name');
      setDisplayName(config?.config_value || 'ChatFlow');
      setFaqs(normalizeFAQs(faqRes.items || []));
      setCommonFAQs(normalizeFAQs(commonRes.items || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : '璇诲彇閰嶇疆澶辫触');
    }
  }

  async function saveSettings() {
    const value = displayName.trim();
    if (!value) {
      setError('请输入租户对外显示名称');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await saveTenantConfig({
        config_key: 'display_name',
        config_value: value,
        value_type: 'string',
        remark: '绉熸埛瀵瑰鏄剧ず鍚嶇О锛岀敤浜庡鎴蜂晶鑱婂ぉ绐楀彛鍝佺墝灞曠ず',
      });
      await saveTenantFAQs(normalizeFAQs(faqs));
      setMessage('保存成功，客户侧刷新后生效');
    } catch (err) {
      setError(err instanceof Error ? err.message : '淇濆瓨閰嶇疆澶辫触');
    } finally {
      setLoading(false);
    }
  }

  async function persistFAQs(nextFAQs: PublicFAQ[], successMessage: string) {
    const normalized = normalizeFAQs(nextFAQs);
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await saveTenantFAQs(normalized);
      setFaqs(normalizeFAQs(res.items || []));
      setMessage(successMessage);
    } catch (err) {
      setFaqs(normalized);
      setError(err instanceof Error ? err.message : '淇濆瓨甯歌闂澶辫触');
    } finally {
      setLoading(false);
    }
  }

  async function addFAQ() {
    const question = faqForm.question.trim();
    const answer = faqForm.answer.trim();
    if (!question || !answer) {
      setError('璇疯緭鍏ラ棶棰樼畝杩板拰绛旀');
      return;
    }
    setError('');
    const nextFAQs = [...faqs, { id: `faq-${Date.now()}-${Math.random().toString(16).slice(2)}`, question, answer }];
    await persistFAQs(nextFAQs, '常见问题已保存');
    setFaqForm({ question: '', answer: '' });
  }

  function updateFAQ(index: number, patch: Partial<PublicFAQ>) {
    setFaqs((old) => old.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function removeFAQ(index: number) {
    await persistFAQs(faqs.filter((_, i) => i !== index), '常见问题已删除');
  }

  async function addFAQFromCommon(item: PublicFAQ) {
    setError('');
    if (faqs.some((faq) => faq.question.trim() === item.question.trim())) {
      setMessage('璇ラ棶棰樺凡鍦ㄥ綋鍓嶇鎴峰父瑙侀棶棰樹腑');
      return;
    }
    await persistFAQs([...faqs, { ...item, id: item.id || `faq-${Date.now()}-${Math.random().toString(16).slice(2)}` }], '宸蹭粠閫氱敤闂搴撴坊鍔犲苟淇濆瓨');
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl space-y-5">
        <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">绉熸埛绯荤粺閰嶇疆</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">绉熸埛瀵瑰鏄剧ず鍚嶇О</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例如：蓝鲸在线客服"
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 outline-none focus:border-brand-300 transition-colors"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                会显示在客户侧聊天窗口标题中，例如“{displayName || 'ChatFlow'} 客服”。
              </p>
            </div>
          </div>
          {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{error}</div>}
          {message && <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-700">{message}</div>}
          <button
            onClick={saveSettings}
            disabled={loading}
            className="mt-5 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {loading ? '淇濆瓨涓?..' : '淇濆瓨閰嶇疆'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">甯歌闂</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <input
                value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                placeholder="闂绠€杩帮紝渚嬪锛氬浣曠敵璇峰彂绁紵"
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 outline-none focus:border-brand-300 transition-colors"
              />
              <textarea
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                placeholder="绛旀鍐呭"
                className="w-full h-20 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 outline-none resize-none focus:border-brand-300 transition-colors"
              />
              <button
                onClick={addFAQ}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-100 bg-brand-50 text-brand-600 text-sm font-medium hover:bg-brand-100 transition-colors"
              >
                娣诲姞甯歌闂
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {faqs.map((faq, index) => (
                <div key={faq.id || index} className="py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={faq.question}
                      onChange={(e) => updateFAQ(index, { question: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 outline-none focus:border-brand-300 transition-colors"
                    />
                    <button
                      onClick={() => removeFAQ(index)}
                      className="w-9 h-9 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                      title="鍒犻櫎"
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  </div>
                  <textarea
                    value={faq.answer}
                    onChange={(e) => updateFAQ(index, { answer: e.target.value })}
                    className="w-full h-20 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 outline-none resize-none focus:border-brand-300 transition-colors"
                  />
                </div>
              ))}
              {faqs.length === 0 && <div className="py-6 text-center text-sm text-slate-400">鏆傛棤甯歌闂</div>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">通用问题库</h3>
          <div className="space-y-2">
            {commonFAQs.map((faq, index) => (
              <div key={faq.id || index} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-700">{faq.question}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-slate-400">{faq.answer}</div>
                </div>
                <button
                  type="button"
                  onClick={() => addFAQFromCommon(faq)}
                  className="shrink-0 rounded-lg border border-brand-100 bg-white px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
                >
                  娣诲姞
                </button>
              </div>
            ))}
            {commonFAQs.length === 0 && <div className="py-4 text-center text-sm text-slate-400">鏆傛棤閫氱敤闂</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeFAQs(items: PublicFAQ[]) {
  return items
    .map((item) => ({
      id: item.id || `faq-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question && item.answer);
}

function ToggleRow({ label, defaultOn }: { label: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        onClick={() => setOn(!on)}
        className={`w-10 h-5 rounded-full transition-colors relative ${on ? 'bg-brand-500' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-soft transition-transform ${on ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}

function ManageResource({ type }: { type: 'channels' | 'agents' | 'groups' }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [groups, setGroups] = useState<AgentGroup[]>([]);
  const [channelForm, setChannelForm] = useState({
    channel_name: '',
    channel_type: 'web',
    app_id: getAuth()?.appId || 'default',
    default_group_id: '',
    status: 'enabled',
  });
  const [agentForm, setAgentForm] = useState({
    username: '',
    display_name: '',
    password: '',
    bound_user_id: '',
    max_sessions: 5,
    group_id: '',
    status: 'enabled',
  });
  const [groupForm, setGroupForm] = useState({
    group_id: '',
    name: '',
    status: 'enabled',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingChannelKey, setEditingChannelKey] = useState('');
  const [editingAgentID, setEditingAgentID] = useState('');
  const isBackendAdmin = getAuth()?.userInfo.isAdmin === 1;
  const tenantAgentLimitReached = type === 'agents' && !editingAgentID && !isBackendAdmin && agents.length >= 3;

  const config = {
    channels: { title: '娓犻亾绠＄悊', button: '淇濆瓨娓犻亾', icon: 'ri-links-line' },
    agents: { title: '鍧愬腑绠＄悊', button: '淇濆瓨鍧愬腑', icon: 'ri-customer-service-2-line' },
    groups: { title: '坐席组管理', button: '保存坐席组', icon: 'ri-team-line' },
  }[type];

  useEffect(() => {
    refresh();
  }, [type]);

  async function refresh() {
    const [channelRes, agentRes, groupRes] = await Promise.all([listChannels(), listAgents(), listAgentGroups()]);
    setChannels(channelRes.items || []);
    setAgents(agentRes.items || []);
    setGroups(groupRes.items || []);
  }

  async function addItem() {
    setError('');
    setMessage('');
    try {
      if (type === 'channels') {
        if (!channelForm.channel_name.trim()) return setError('请输入渠道名称');
        await saveChannel({
          channel_name: channelForm.channel_name.trim(),
          channel_type: channelForm.channel_type,
          app_id: channelForm.app_id.trim() || 'default',
          default_group_id: channelForm.default_group_id,
          app_key: editingChannelKey || undefined,
          status: channelForm.status,
        });
        setEditingChannelKey('');
        setChannelForm((old) => ({ ...old, channel_name: '', default_group_id: '' }));
      }
      if (type === 'agents') {
        if (!agentForm.username.trim()) return setError('请输入坐席账号');
        if (tenantAgentLimitReached) return setError(`当前租户最多只能自助添加${tenantAgentLimit}个坐席，超过后请联系后台管理员添加`);
        if (!editingAgentID && !agentForm.password.trim()) return setError('请输入坐席初始密码');
        const agent = await saveAgent({
          username: agentForm.username.trim(),
          display_name: agentForm.display_name.trim() || agentForm.username.trim(),
          agent_id: editingAgentID || undefined,
          password: editingAgentID ? undefined : agentForm.password,
          max_sessions: Number(agentForm.max_sessions) || 5,
          status: agentForm.status,
          online_status: 'offline',
        });
        if (agentForm.group_id && agent.agent_id) {
          await addAgentToGroup(agentForm.group_id, agent.agent_id);
        }
        setEditingAgentID('');
        setAgentForm((old) => ({ ...old, username: '', display_name: '', password: '', bound_user_id: '', group_id: '' }));
      }
      if (type === 'groups') {
        if (!groupForm.name.trim()) return setError('请输入坐席组名称');
        await saveAgentGroup({ group_id: groupForm.group_id || undefined, name: groupForm.name.trim(), status: groupForm.status });
        setGroupForm((old) => ({ ...old, group_id: '', name: '' }));
      }
      setMessage('娣囨繂鐡ㄩ幋鎰');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '娣囨繂鐡ㄦ径杈Е');
    }
  }

  function editChannel(item: Channel) {
    setEditingChannelKey(item.app_key || '');
    setChannelForm({
      channel_name: item.channel_name || '',
      channel_type: item.channel_type || 'web',
      app_id: item.app_id || 'default',
      default_group_id: item.default_group_id || '',
      status: item.status || 'enabled',
    });
  }

  function editAgent(item: Agent) {
    setEditingAgentID(item.agent_id || '');
    setAgentForm({
      username: item.username || '',
      display_name: item.display_name || '',
      password: '',
      bound_user_id: item.gfast_user_id ? String(item.gfast_user_id) : '未绑定',
      max_sessions: item.max_sessions || 5,
      group_id: '',
      status: item.status || 'enabled',
    });
  }

  function editGroup(item: AgentGroup) {
    setGroupForm({ group_id: item.group_id || '', name: item.name || '', status: item.status || 'enabled' });
  }

  function resetChannelForm() {
    setEditingChannelKey('');
    setChannelForm({
      channel_name: '',
      channel_type: 'web',
      app_id: getAuth()?.appId || 'default',
      default_group_id: '',
      status: 'enabled',
    });
  }

  function resetAgentForm() {
    setEditingAgentID('');
    setAgentForm({
      username: '',
      display_name: '',
      password: '',
      bound_user_id: '',
      max_sessions: 5,
      group_id: '',
      status: 'enabled',
    });
  }

  function resetGroupForm() {
    setGroupForm({
      group_id: '',
      name: '',
      status: 'enabled',
    });
  }

  async function removeChannel(item: Channel) {
    if (!item.app_key || !window.confirm(`确认删除渠道“${item.channel_name}”？`)) return;
    await deleteChannel(item.app_key);
    resetChannelForm();
    setError('');
    setMessage('閸掔娀娅庨幋鎰');
    await refresh();
  }

  async function removeAgent(item: Agent) {
    if (!item.agent_id || !window.confirm(`纭鍒犻櫎鍧愬腑鈥?{item.display_name || item.username}鈥濓紵`)) return;
    await deleteAgent(item.agent_id);
    resetAgentForm();
    setError('');
    setMessage('鍒犻櫎鎴愬姛');
    await refresh();
  }

  async function removeGroup(item: AgentGroup) {
    if (!item.group_id || !window.confirm(`确认删除坐席组“${item.name}”？相关坐席绑定和渠道默认组会被清理。`)) return;
    await deleteAgentGroup(item.group_id);
    resetGroupForm();
    setError('');
    setMessage('鍒犻櫎鎴愬姛');
    await refresh();
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5">
        <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <i className={config.icon} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              {type === 'channels' && editingChannelKey ? '编辑渠道' : type === 'agents' && editingAgentID ? '编辑坐席' : type === 'groups' && groupForm.group_id ? '编辑坐席组' : config.button}
            </h3>
          </div>
          {type === 'channels' && (
            <div className="space-y-4">
              <Field label="渠道名称">
                <input value={channelForm.channel_name} onChange={(e) => setChannelForm({ ...channelForm, channel_name: e.target.value })} placeholder="例如：官网 Web 渠道" className="form-input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="渠道类型">
                  <select value={channelForm.channel_type} onChange={(e) => setChannelForm({ ...channelForm, channel_type: e.target.value })} className="form-input">
                    <option value="web">Web</option>
                    <option value="h5">H5</option>
                    <option value="app">App</option>
                    <option value="wechat">微信</option>
                  </select>
                </Field>
                <Field label="应用ID">
                  <input value={channelForm.app_id} onChange={(e) => setChannelForm({ ...channelForm, app_id: e.target.value })} className="form-input" />
                </Field>
              </div>
              <Field label="默认坐席组">
                <select value={channelForm.default_group_id} onChange={(e) => setChannelForm({ ...channelForm, default_group_id: e.target.value })} className="form-input">
                  <option value="">不指定，使用默认分配</option>
                  {groups.map((group) => <option key={group.group_id || group.id} value={group.group_id}>{group.name}</option>)}
                </select>
              </Field>
              <StatusSelect value={channelForm.status} onChange={(status) => setChannelForm({ ...channelForm, status })} />
            </div>
          )}
          {type === 'agents' && (
            <div className="space-y-4">
              {tenantAgentLimitReached && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  当前租户坐席数量已达到上限，如需更多坐席请联系后台管理员添加。
                </div>
              )}
              <Field label="坐席账号">
                <input
                  value={agentForm.username}
                  disabled={!!editingAgentID}
                  onChange={(e) => setAgentForm({ ...agentForm, username: e.target.value })}
                  placeholder="登录账号或坐席编码"
                  className={`form-input ${editingAgentID ? 'cursor-not-allowed text-slate-400' : ''}`}
                />
              </Field>
              <Field label="显示名称">
                <input value={agentForm.display_name} onChange={(e) => setAgentForm({ ...agentForm, display_name: e.target.value })} placeholder="客服小王" className="form-input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                {editingAgentID ? (
                  <Field label="GFast用户ID">
                    <input value={agentForm.bound_user_id} disabled className="form-input cursor-not-allowed text-slate-400" />
                  </Field>
                ) : (
                  <Field label="初始密码">
                    <input type="password" value={agentForm.password} onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })} placeholder="用于坐席首次登录" className="form-input" />
                  </Field>
                )}
                <Field label="最大会话数">
                  <input type="number" min={1} value={agentForm.max_sessions} onChange={(e) => setAgentForm({ ...agentForm, max_sessions: Number(e.target.value) })} className="form-input" />
                </Field>
              </div>
              <Field label="所属坐席组">
                <select value={agentForm.group_id} onChange={(e) => setAgentForm({ ...agentForm, group_id: e.target.value })} className="form-input">
                  <option value="">暂不绑定</option>
                  {groups.map((group) => <option key={group.group_id || group.id} value={group.group_id}>{group.name}</option>)}
                </select>
              </Field>
              <StatusSelect value={agentForm.status} onChange={(status) => setAgentForm({ ...agentForm, status })} />
            </div>
          )}
          {type === 'groups' && (
            <div className="space-y-4">
              <Field label="坐席组名称">
                <input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="例如：售前组 / VIP组" className="form-input" />
              </Field>
              <StatusSelect value={groupForm.status} onChange={(status) => setGroupForm({ ...groupForm, status })} />
            </div>
          )}
          {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{error}</div>}
          {message && <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-700">{message}</div>}
          <button
            onClick={addItem}
            disabled={tenantAgentLimitReached}
            className={`mt-5 w-full px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors ${tenantAgentLimitReached ? 'bg-slate-300 cursor-not-allowed' : 'bg-brand-500 hover:bg-brand-600'}`}
          >
            {config.button}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-soft">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <i className={config.icon} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">{config.title}</h3>
          </div>
          <button onClick={refresh} className="text-xs text-brand-600 hover:text-brand-700 font-medium">刷新</button>
        </div>
        <div className="divide-y divide-slate-50">
          {type === 'channels' && channels.map((item) => <ChannelRow key={item.id || item.app_key || item.channel_name} item={item} groups={groups} onEdit={editChannel} onDelete={removeChannel} />)}
          {type === 'agents' && agents.map((item) => <AgentRow key={item.agent_id || item.username} item={item} onEdit={editAgent} onDelete={removeAgent} />)}
          {type === 'groups' && groups.map((item) => <GroupRow key={item.group_id || item.name} item={item} onEdit={editGroup} onDelete={removeGroup} />)}
          {type === 'channels' && channels.length === 0 && <EmptyRow />}
          {type === 'agents' && agents.length === 0 && <EmptyRow />}
          {type === 'groups' && groups.length === 0 && <EmptyRow />}
        </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function StatusSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Field label="状态">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="form-input">
        <option value="enabled">启用</option>
        <option value="disabled">禁用</option>
      </select>
    </Field>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const enabled = (status || 'enabled') === 'enabled';
  return <span className={`px-2 py-0.5 text-[11px] rounded-full ${enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{enabled ? '启用' : '禁用'}</span>;
}

function ChannelRow({ item, groups, onEdit, onDelete }: { item: Channel; groups: AgentGroup[]; onEdit: (item: Channel) => void; onDelete: (item: Channel) => void }) {
  const groupName = groups.find((group) => group.group_id === item.default_group_id)?.name || item.default_group_id || '默认分配';
  return (
    <div className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-800">{item.channel_name}</div>
        <div className="text-xs text-slate-400 mt-1 truncate">类型 {item.channel_type} · 应用 {item.app_id || 'default'} · Key {item.app_key || '-'}</div>
        <div className="text-xs text-slate-400 mt-1">默认坐席组：{groupName}</div>
      </div>
      <RowActions status={item.status} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
    </div>
  );
}

function AgentRow({ item, onEdit, onDelete }: { item: Agent; onEdit: (item: Agent) => void; onDelete: (item: Agent) => void }) {
  return (
    <div className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
      <div>
        <div className="text-sm font-medium text-slate-800">{item.display_name || item.username}</div>
        <div className="text-xs text-slate-400 mt-1">璐﹀彿 {item.username} 路 鏈€澶т細璇?{item.max_sessions}</div>
        <div className="text-xs text-slate-400 mt-1">GFast用户ID：{item.gfast_user_id || '未绑定'} · 在线状态：{item.online_status || 'offline'}</div>
      </div>
      <RowActions status={item.status} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
    </div>
  );
}

function GroupRow({ item, onEdit, onDelete }: { item: AgentGroup; onEdit: (item: AgentGroup) => void; onDelete: (item: AgentGroup) => void }) {
  return (
    <div className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
      <div>
        <div className="text-sm font-medium text-slate-800">{item.name}</div>
        <div className="text-xs text-slate-400 mt-1">组ID：{item.group_id || '-'}</div>
      </div>
      <RowActions status={item.status} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
    </div>
  );
}

function RowActions({ status, onEdit, onDelete }: { status?: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={status} />
      <button onClick={onEdit} className="w-8 h-8 rounded-lg hover:bg-brand-50 text-slate-500 hover:text-brand-600 transition-colors" title="编辑">
        <i className="ri-edit-line" />
      </button>
      <button onClick={onDelete} className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors" title="删除">
        <i className="ri-delete-bin-line" />
      </button>
    </div>
  );
}

function EmptyRow() {
  return <div className="px-5 py-12 text-center text-sm text-slate-400">閺嗗倹妫ら弫鐗堝祦</div>;
}
