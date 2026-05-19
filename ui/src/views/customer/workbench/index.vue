<template>
	<div class="workbench-page">
		<TenantBar @change="reloadAll" />
		<section class="workbench-shell">
			<aside class="session-list">
				<div class="panel-head">
					<div>
						<h2>坐席工作台</h2>
						<p>{{ online ? '在线接待中' : '当前离线' }}</p>
					</div>
					<el-switch v-model="online" active-text="在线" inactive-text="离线" @change="toggleOnline" />
				</div>
				<div class="agent-form">
					<el-select v-model="currentAgentId" filterable placeholder="选择坐席" :disabled="agentLocked" @change="syncAgent">
						<el-option v-for="agent in agents" :key="agent.agent_id" :label="agentLabel(agent)" :value="agent.agent_id" />
					</el-select>
					<el-select v-model="currentGroupId" filterable placeholder="选择坐席组">
						<el-option v-for="group in groups" :key="group.group_id" :label="`${group.name} (${group.group_id})`" :value="group.group_id" />
					</el-select>
				</div>
				<div class="session-tabs">
					<button v-for="tab in statusTabs" :key="tab.value" class="session-tab" :class="{ active: status === tab.value }" type="button" @click="switchStatus(tab.value)">
						<span>{{ tab.label }}</span>
						<em v-if="tab.badge > 0">{{ tab.badge }}</em>
					</button>
				</div>
				<div v-loading="sessionLoading" class="sessions">
					<button v-for="session in sessions" :key="session.id" class="session-item" :class="{ active: activeSession?.id === session.id }" @click="selectSession(session)">
						<span class="session-item__title">
							{{ session.user_id }}
							<el-tag v-if="isWaitingMessage(session)" size="small" type="danger" effect="dark">待接入消息</el-tag>
						</span>
						<span class="session-item__meta">{{ session.status }} · {{ session.group_id || '-' }} · IP {{ session.source_ip || '-' }}</span>
						<span class="session-item__time">{{ formatTime(session.updated_at || session.created_at) }}</span>
					</button>
					<el-empty v-if="!sessionLoading && sessions.length === 0" description="暂无会话" :image-size="96" />
				</div>
			</aside>
			<main class="chat-panel">
				<header class="chat-head">
					<div>
						<h3>{{ activeSession ? activeSession.user_id : '选择一个会话开始处理' }}</h3>
						<p v-if="activeSession">会话 {{ activeSession.id }} · 坐席 {{ activeSession.agent_id || '未分配' }} · IP {{ activeSession.source_ip || '-' }} · 进入 {{ formatTime(activeSession.login_time || activeSession.created_at) }}</p>
					</div>
					<el-button :icon="Refresh" circle @click="reloadActive" />
				</header>
				<div ref="messageBox" v-loading="messageLoading" class="messages">
					<template v-if="activeSession">
						<template v-for="item in displayMessages" :key="item.key">
							<div v-if="item.type === 'time'" class="message-time">{{ item.label }}</div>
							<div v-else class="message-row" :class="{ mine: item.message.sender_type === 'agent' }">
								<div class="message-bubble">
									<div class="message-meta">{{ item.message.sender_type === 'agent' ? '坐席' : '客户' }} · #{{ item.message.seq }}</div>
									<el-image v-if="item.message.msg_type === 'image'" class="message-image" :src="messageImageUrl(item.message.content)" :preview-src-list="[messageImageUrl(item.message.content)]" preview-teleported fit="cover" />
									<div v-else class="message-content">{{ item.message.content }}</div>
								</div>
							</div>
						</template>
						<el-empty v-if="!messageLoading && messages.length === 0" description="还没有消息" :image-size="96" />
					</template>
					<el-empty v-else description="从左侧选择会话" :image-size="120" />
				</div>
				<footer class="composer">
					<div class="composer-tools">
						<el-popover trigger="click" placement="top-start" width="260">
							<div class="emoji-panel">
								<button v-for="emoji in emojis" :key="emoji" type="button" @click="insertEmoji(emoji)">{{ emoji }}</button>
							</div>
							<template #reference>
								<el-button :icon="MagicStick" circle />
							</template>
						</el-popover>
						<el-button :icon="Picture" circle :loading="uploading" :disabled="!activeSession" @click="pickImage" />
						<input ref="imageInput" class="hidden-input" type="file" accept="image/*" @change="uploadImageReply" />
					</div>
					<el-input v-model="draft" type="textarea" :rows="3" resize="none" placeholder="输入回复内容" @keydown.enter.exact.prevent="sendReply" />
					<el-button type="primary" :icon="Promotion" :disabled="!activeSession || !draft.trim()" @click="sendReply">发送</el-button>
				</footer>
			</main>
		</section>
	</div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { MagicStick, Picture, Promotion, Refresh } from '@element-plus/icons-vue';
import TenantBar from '/@/views/customer/components/TenantBar.vue';
import {
	Agent,
	AgentGroup,
	ChatMessage,
	acceptSession,
	getCustomerAssetUrl,
	getCurrentTenantId,
	getCustomerWsUrl,
	getMyAgent,
	listAgentGroups,
	listAgents,
	listMessages,
	listSessions,
	SessionItem,
	setAgentOffline,
	setAgentOnline,
	uploadChatImage,
} from '/@/api/customer/admin';
import { Session } from '/@/utils/storage';
import { notifyNewMessage, stopTitleFlash, unlockMessageSound } from '/@/views/customer/utils/notify';

const agents = ref<Agent[]>([]);
const groups = ref<AgentGroup[]>([]);
const sessions = ref<SessionItem[]>([]);
const waitingSessions = ref<SessionItem[]>([]);
const messages = ref<ChatMessage[]>([]);
const activeSession = ref<SessionItem>();
const currentAgentId = ref('');
const currentGroupId = ref('default');
const agentLocked = ref(false);
const status = ref('serving');
const online = ref(false);
const draft = ref('');
const uploading = ref(false);
const sessionLoading = ref(false);
const messageLoading = ref(false);
const messageBox = ref<HTMLElement>();
const imageInput = ref<HTMLInputElement>();
const acknowledgedWaitingSeq = ref<Record<string, number>>({});
let ws: WebSocket | undefined;
let reconnectTimer: number | undefined;
const notifiedMessageKeys = new Set<string>();
const emojis = ['😀', '😁', '😂', '😊', '😍', '😝', '😎', '😢', '😨', '👍', '👏', '🙏', '🎀', '❤️', '🔥', '🌮', '💕', '✨', '🤝', '☕'];
const MESSAGE_TIME_GAP = 5 * 60 * 1000;

const currentAgent = computed(() => agents.value.find((item) => item.agent_id === currentAgentId.value));

const waitingMessageCount = computed(() => waitingSessions.value.filter((item) => isWaitingMessage(item)).length);

const statusTabs = computed(() => [
	{ label: '服务中', value: 'serving', badge: 0 },
	{ label: '排队中', value: 'waiting', badge: waitingMessageCount.value },
	{ label: '全部', value: '', badge: waitingMessageCount.value },
]);

const agentLabel = (agent: Agent) => `${agent.display_name || agent.username} (${agent.agent_id})`;

const formatTime = (value?: string) => {
	if (!value) return '-';
	return new Date(value).toLocaleString();
};

const messageTime = (message: ChatMessage) => {
	const value = Date.parse(message.send_time || '');
	return Number.isFinite(value) ? value : Number(message.seq || 0);
};

const sortMessages = (items: ChatMessage[]) =>
	[...items].sort((a, b) => {
		const timeDiff = messageTime(a) - messageTime(b);
		if (timeDiff !== 0) return timeDiff;
		return Number(a.seq || 0) - Number(b.seq || 0);
	});

const formatMessageTime = (value?: string) => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	const now = new Date();
	const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
	if (date.toDateString() === now.toDateString()) return time;
	const day = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
	if (date.getFullYear() === now.getFullYear()) return `${day} ${time}`;
	return `${date.getFullYear()}-${day} ${time}`;
};

const displayMessages = computed(() => {
	const sorted = sortMessages(messages.value);
	return sorted.flatMap((message, index) => {
		const previous = sorted[index - 1];
		const showTime = !previous || messageTime(message) - messageTime(previous) >= MESSAGE_TIME_GAP;
		const key = message.id || `${message.session_id}:${message.client_msg_id || message.seq}`;
		const row = { type: 'message' as const, key: `msg-${key}`, message };
		if (!showTime) return [row];
		return [{ type: 'time' as const, key: `time-${key}`, label: formatMessageTime(message.send_time) }, row];
	});
});

const messageImageUrl = (url: string) => {
	return getCustomerAssetUrl(url);
};

const insertEmoji = (emoji: string) => {
	draft.value += emoji;
};

const pickImage = () => {
	imageInput.value?.click();
};

const scrollToBottom = async () => {
	await nextTick();
	if (messageBox.value) messageBox.value.scrollTop = messageBox.value.scrollHeight;
};

const messageKey = (message: ChatMessage) => message.id || `${message.session_id}:${message.client_msg_id || message.seq}`;

const isWaitingMessage = (session: SessionItem) => {
	const lastSeq = Number(session.last_seq || 0);
	const acknowledgedSeq = acknowledgedWaitingSeq.value[session.id] || 0;
	return session.status === 'waiting' && !session.agent_id && lastSeq > acknowledgedSeq;
};

const clearWaitingMessageNotice = (session: SessionItem) => {
	if (session.status !== 'waiting') return;
	acknowledgedWaitingSeq.value = {
		...acknowledgedWaitingSeq.value,
		[session.id]: Number(session.last_seq || 0),
	};
};

const notifyCustomerMessage = (message: ChatMessage) => {
	if (message.sender_type !== 'customer') return;
	const key = messageKey(message);
	if (notifiedMessageKeys.has(key)) return;
	notifiedMessageKeys.add(key);
	const from = sessions.value.find((item) => item.id === message.session_id)?.user_id || message.sender_id || '客户';
	notifyNewMessage('客户新消息', `${from}: ${message.msg_type === 'image' ? '发来一张图片' : message.content || '收到一条客户消息'}`);
};

const applyActiveSessionFromMessage = (message: ChatMessage) => {
	if (!activeSession.value || activeSession.value.id !== message.session_id || message.sender_type !== 'agent') return;
	activeSession.value = {
		...activeSession.value,
		agent_id: message.sender_id || activeSession.value.agent_id,
		status: 'serving',
		updated_at: message.send_time || activeSession.value.updated_at,
	};
};

const syncAgent = () => {
	const agent = currentAgent.value;
	if (agent?.max_sessions && online.value) {
		void setAgentOnline(currentAgentId.value, { group_id: currentGroupId.value, max_sessions: agent.max_sessions, active_sessions: 0 });
	}
	connectAgentSocket();
};

const currentGFastUserID = () => {
	const userInfo = Session.get('userInfo') || {};
	return Number(userInfo.id || userInfo.userId || userInfo.user_id || 0);
};

const isFrontUser = () => {
	const userInfo = Session.get('userInfo') || {};
	return Number(userInfo.isAdmin ?? userInfo.is_admin ?? 1) === 0;
};

const appendMessage = async (message: ChatMessage, options?: { refreshSessions?: boolean }) => {
	if (activeSession.value?.id === message.session_id && !messages.value.some((item) => item.id === message.id || item.client_msg_id === message.client_msg_id)) {
		messages.value.push(message);
		messages.value = sortMessages(messages.value);
		applyActiveSessionFromMessage(message);
		await scrollToBottom();
	}
	if (options?.refreshSessions !== false) await loadSessions();
};

const handleIncomingMessage = async (message: ChatMessage) => {
	notifyCustomerMessage(message);
	await appendMessage(message);
};

const switchStatus = async (value: string) => {
	status.value = value;
	await loadSessions();
};

const connectAgentSocket = () => {
	if (!currentAgentId.value) return;
	if (reconnectTimer) window.clearTimeout(reconnectTimer);
	if (ws) {
		ws.onclose = null;
		ws.close();
	}
	ws = new WebSocket(getCustomerWsUrl('agent', currentAgentId.value, `agent-${currentAgentId.value}`));
	ws.onmessage = (event) => {
		try {
			const envelope = JSON.parse(event.data);
			if (envelope.event === 'message') handleIncomingMessage(envelope.data as ChatMessage);
			if (envelope.event === 'error') ElMessage.error(envelope.data?.message || 'WebSocket 消息错误');
		} catch {
			ElMessage.error('WebSocket 消息解析失败');
		}
	};
	ws.onclose = () => {
		if (online.value && currentAgentId.value) {
			reconnectTimer = window.setTimeout(connectAgentSocket, 1500);
		}
	};
};

const loadBase = async () => {
	const [agentRes, groupRes] = await Promise.all([listAgents({ limit: 100, offset: 0 }), listAgentGroups({ limit: 100, offset: 0 })]);
	agents.value = agentRes.items || [];
	groups.value = groupRes.items || [];
	if (!currentGroupId.value && groups.value[0]?.group_id) currentGroupId.value = groups.value[0].group_id;
	agentLocked.value = false;
	if (isFrontUser()) {
		try {
			const myAgent = await getMyAgent();
			agents.value = [myAgent];
			currentAgentId.value = myAgent.agent_id || '';
			agentLocked.value = true;
			connectAgentSocket();
			return;
		} catch {
			currentAgentId.value = '';
			agentLocked.value = true;
			ElMessage.warning('当前账号还没有绑定客服坐席，请联系租户管理员在坐席管理中绑定');
			return;
		}
	}
	if (!currentAgentId.value) {
		const userInfo = Session.get('userInfo') || {};
		const username = userInfo.userName || userInfo.user_name;
		const gfastUserID = currentGFastUserID();
		const matched = agents.value.find((item) => (gfastUserID && item.gfast_user_id === gfastUserID) || item.username === username);
		currentAgentId.value = matched?.agent_id || agents.value[0]?.agent_id || '';
	}
	connectAgentSocket();
};

const loadSessions = async () => {
	sessionLoading.value = true;
	try {
		const [res, waitingRes] = await Promise.all([
			listSessions({ status: status.value || undefined, limit: 100, offset: 0 }),
			status.value === 'waiting' ? Promise.resolve(undefined) : listSessions({ status: 'waiting', limit: 100, offset: 0 }),
		]);
		const all = res.items || [];
		waitingSessions.value = status.value === 'waiting' ? all : waitingRes?.items || [];
		const latestActive = activeSession.value ? all.find((item: SessionItem) => item.id === activeSession.value?.id) : undefined;
		if (latestActive) activeSession.value = latestActive;
		sessions.value = currentAgentId.value ? all.filter((item: SessionItem) => !item.agent_id || item.agent_id === currentAgentId.value) : all;
		if (activeSession.value && !sessions.value.some((item) => item.id === activeSession.value?.id)) {
			activeSession.value = undefined;
			messages.value = [];
		}
	} finally {
		sessionLoading.value = false;
	}
};

const loadMessagesFor = async (session: SessionItem) => {
	messageLoading.value = true;
	try {
		const res = await listMessages({ session_id: session.id, limit: 200, offset: 0 });
		messages.value = sortMessages(res.items || []);
		await scrollToBottom();
	} finally {
		messageLoading.value = false;
	}
};

const selectSession = async (session: SessionItem) => {
	stopTitleFlash();
	clearWaitingMessageNotice(session);
	let selected = session;
	if (session.status === 'waiting' && !session.agent_id && currentAgentId.value) {
		try {
			selected = await acceptSession(session.id, currentAgentId.value);
			status.value = 'serving';
		} catch {
			return;
		}
	}
	activeSession.value = selected;
	await loadMessagesFor(selected);
	await loadSessions();
};

const reloadActive = async () => {
	await loadSessions();
	if (activeSession.value) await loadMessagesFor(activeSession.value);
};

const reloadAll = async () => {
	activeSession.value = undefined;
	messages.value = [];
	await loadBase();
	await loadSessions();
};

const toggleOnline = async () => {
	if (!currentAgentId.value) {
		online.value = false;
		ElMessage.warning('请先选择坐席');
		return;
	}
	if (online.value) {
		unlockMessageSound();
		await setAgentOnline(currentAgentId.value, {
			group_id: currentGroupId.value || 'default',
			max_sessions: currentAgent.value?.max_sessions || 5,
			active_sessions: 0,
		});
		connectAgentSocket();
		ElMessage.success('坐席已上线');
	} else {
		await setAgentOffline(currentAgentId.value, currentGroupId.value || 'default');
		if (ws) ws.close();
		ElMessage.success('坐席已离线');
	}
	await loadSessions();
};

const sendWsReply = (content: string, msgType = 'text') => {
	if (!activeSession.value || !currentAgentId.value) return false;
	unlockMessageSound();
	if (!ws || ws.readyState !== WebSocket.OPEN) {
		ElMessage.warning('WebSocket 未连接，请稍后再试');
		return false;
	}
	activeSession.value = {
		...activeSession.value,
		agent_id: currentAgentId.value,
		status: 'serving',
		updated_at: new Date().toISOString(),
	};
	if (status.value === 'waiting') status.value = 'serving';
	ws.send(
		JSON.stringify({
			event: 'send_message',
			data: {
				session_id: activeSession.value.id,
				client_msg_id: `agent-${Date.now()}`,
				msg_type: msgType,
				content,
			},
		})
	);
	return true;
};

const sendReply = async () => {
	if (!activeSession.value || !draft.value.trim() || !currentAgentId.value) return;
	const content = draft.value.trim();
	if (sendWsReply(content)) draft.value = '';
};

const uploadImageReply = async (event: Event) => {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (!file || !activeSession.value) return;
	if (!file.type.startsWith('image/')) {
		ElMessage.warning('请选择图片文件');
		return;
	}
	uploading.value = true;
	try {
		const res = await uploadChatImage(file);
		sendWsReply(res.url, 'image');
	} finally {
		uploading.value = false;
	}
};

onMounted(async () => {
	await reloadAll();
});

onBeforeUnmount(() => {
	if (reconnectTimer) window.clearTimeout(reconnectTimer);
	const shouldOffline = online.value;
	online.value = false;
	if (ws) {
		ws.onclose = null;
		ws.close();
	}
	if (shouldOffline && currentAgentId.value) void setAgentOffline(currentAgentId.value, currentGroupId.value || 'default');
	stopTitleFlash();
});
</script>

<style scoped lang="scss">
.workbench-page {
	padding: 12px;
	height: calc(100vh - 84px);
	min-height: 560px;
	overflow: hidden;
}

.workbench-shell {
	display: grid;
	grid-template-columns: 340px minmax(0, 1fr);
	height: 100%;
	border: 1px solid var(--el-border-color-light);
	background: var(--el-bg-color);
	overflow: hidden;
}

.session-list {
	display: flex;
	flex-direction: column;
	border-right: 1px solid var(--el-border-color-light);
	min-width: 0;
	min-height: 0;
}

.panel-head,
.chat-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 16px;
	border-bottom: 1px solid var(--el-border-color-light);

	h2,
	h3 {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
	}

	p {
		margin: 4px 0 0;
		color: var(--el-text-color-secondary);
		font-size: 12px;
	}
}

.agent-form {
	display: grid;
	gap: 8px;
	padding: 12px;
	border-bottom: 1px solid var(--el-border-color-light);
}

.session-tabs {
	display: flex;
	gap: 8px;
	padding: 12px;
	border-bottom: 1px solid var(--el-border-color-light);
}

.session-tab {
	position: relative;
	height: 32px;
	padding: 0 14px;
	border: 1px solid var(--el-border-color);
	border-radius: 6px;
	background: var(--el-bg-color);
	color: var(--el-text-color-regular);
	cursor: pointer;

	&.active {
		color: var(--el-color-primary);
		border-color: var(--el-color-primary);
		background: var(--el-color-primary-light-9);
	}

	em {
		position: absolute;
		top: -7px;
		right: -7px;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 9px;
		background: var(--el-color-danger);
		color: #fff;
		font-size: 12px;
		font-style: normal;
		line-height: 18px;
		text-align: center;
		box-shadow: 0 0 0 2px var(--el-bg-color);
	}
}

.sessions {
	flex: 1;
	overflow: auto;
	padding: 8px;
	min-height: 0;
}

.session-item {
	width: 100%;
	display: grid;
	gap: 4px;
	text-align: left;
	border: 0;
	background: transparent;
	border-radius: 6px;
	padding: 12px;
	cursor: pointer;
	color: var(--el-text-color-primary);

	&:hover,
	&.active {
		background: var(--el-fill-color-light);
	}
}

.session-item__title {
	font-weight: 700;
}

.session-item__meta,
.session-item__time {
	color: var(--el-text-color-secondary);
	font-size: 12px;
}

.chat-panel {
	display: grid;
	grid-template-rows: auto 1fr auto;
	min-width: 0;
	min-height: 0;
}

.messages {
	overflow: auto;
	padding: 16px;
	background: var(--el-fill-color-extra-light);
	min-height: 0;
}

.message-row {
	display: flex;
	margin-bottom: 12px;

	&.mine {
		justify-content: flex-end;
	}
}

.message-time {
	margin: 10px 0 14px;
	text-align: center;
	font-size: 12px;
	color: var(--el-text-color-secondary);
}

.message-bubble {
	max-width: min(620px, 76%);
	padding: 10px 12px;
	border-radius: 8px;
	background: var(--el-bg-color);
	box-shadow: var(--el-box-shadow-lighter);
	white-space: pre-wrap;
	word-break: break-word;
}

.mine .message-bubble {
	background: var(--el-color-primary-light-9);
}

.message-meta {
	font-size: 12px;
	color: var(--el-text-color-secondary);
	margin-bottom: 4px;
}

.composer {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) 96px;
	align-items: end;
	gap: 12px;
	padding: 12px;
	border-top: 1px solid var(--el-border-color-light);
}

.composer-tools {
	display: flex;
	gap: 8px;
	align-items: center;
	padding-bottom: 2px;
}

.emoji-panel {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 6px;

	button {
		border: 0;
		background: transparent;
		border-radius: 6px;
		font-size: 20px;
		line-height: 32px;
		cursor: pointer;

		&:hover {
			background: var(--el-fill-color-light);
		}
	}
}

.hidden-input {
	display: none;
}

.message-image {
	width: min(260px, 52vw);
	max-height: 280px;
	border-radius: 6px;
	display: block;
}

@media (max-width: 900px) {
	.workbench-page {
		height: auto;
		min-height: 100vh;
		overflow: visible;
	}

	.workbench-shell {
		grid-template-columns: 1fr;
		height: auto;
		min-height: calc(100vh - 24px);
	}

	.session-list {
		border-right: 0;
		border-bottom: 1px solid var(--el-border-color-light);
		max-height: 420px;
	}

	.composer {
		grid-template-columns: auto minmax(0, 1fr);

		.el-button[type='primary'] {
			grid-column: 2;
		}
	}
}
</style>


