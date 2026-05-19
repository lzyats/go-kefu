<template>
	<div class="client-chat">
		<section class="chat-window">
			<header class="client-head">
				<div>
					<h1>{{ title }}</h1>
					<p>{{ session ? statusText : '留下称呼后开始咨询' }}</p>
				</div>
				<el-tag :type="session?.agent_id ? 'success' : 'info'">{{ session?.agent_id ? '已接入' : '待接入' }}</el-tag>
			</header>

			<div v-if="!session" class="start-panel">
				<el-form label-position="top">
					<el-form-item label="您的称呼">
						<el-input v-model="visitorName" maxlength="40" placeholder="请输入称呼" />
					</el-form-item>
					<el-form-item label="咨询渠道">
						<el-input v-model="channelId" placeholder="web" />
					</el-form-item>
					<el-button type="primary" class="start-button" :disabled="!visitorName.trim()" :loading="starting" @click="startSession">开始咨询</el-button>
				</el-form>
			</div>

			<template v-else>
				<div ref="messageBox" v-loading="loading" class="client-messages">
					<template v-for="item in displayMessages" :key="item.key">
						<div v-if="item.type === 'time'" class="message-time">{{ item.label }}</div>
						<div v-else class="client-message" :class="{ mine: item.message.sender_type === 'customer' }">
							<div class="client-bubble">
								<div class="client-meta">{{ item.message.sender_type === 'customer' ? visitorName : '客服' }}</div>
								<el-image
									v-if="item.message.msg_type === 'image'"
									class="message-image"
									:src="messageImageUrl(item.message.content)"
									:preview-src-list="[messageImageUrl(item.message.content)]"
									preview-teleported
									fit="cover"
								/>
								<div v-else>{{ item.message.content }}</div>
							</div>
						</div>
					</template>
					<el-empty v-if="messages.length === 0 && !loading" description="您好，请问有什么可以帮您？" :image-size="100" />
				</div>
				<footer class="client-composer">
					<div class="composer-tools">
						<el-popover trigger="click" placement="top-start" width="260">
							<div class="emoji-panel">
								<button v-for="emoji in emojis" :key="emoji" type="button" @click="insertEmoji(emoji)">{{ emoji }}</button>
							</div>
							<template #reference>
								<el-button :icon="MagicStick" circle />
							</template>
						</el-popover>
						<el-button :icon="Picture" circle :loading="uploading" @click="pickImage" />
						<input ref="imageInput" class="hidden-input" type="file" accept="image/*" @change="uploadImageMessage" />
					</div>
					<el-input v-model="draft" type="textarea" :rows="3" resize="none" placeholder="输入消息" @keydown.enter.exact.prevent="sendMessage" />
					<el-button type="primary" :icon="Promotion" :disabled="!draft.trim()" @click="sendMessage">发送</el-button>
				</footer>
			</template>
		</section>
	</div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { MagicStick, Picture, Promotion } from '@element-plus/icons-vue';
import {
	ChatMessage,
	createSession,
	getAgent,
	getCustomerAssetUrl,
	getCurrentAppId,
	getCurrentTenantId,
	getCustomerWsUrl,
	listSessionMessages,
	setCurrentAppId,
	setCurrentTenantId,
	SessionItem,
	uploadChatImage,
} from '/@/api/customer/admin';
import { notifyNewMessage, stopTitleFlash, unlockMessageSound } from '/@/views/customer/utils/notify';

const route = useRoute();
const title = ref(String(route.query.title || '在线客服'));
const visitorName = ref(String(route.query.user_id || route.query.nickname || ''));
const channelId = ref(String(route.query.channel_id || 'web'));
const groupId = ref(String(route.query.group_id || ''));
const session = ref<SessionItem>();
const messages = ref<ChatMessage[]>([]);
const draft = ref('');
const uploading = ref(false);
const loading = ref(false);
const starting = ref(false);
const messageBox = ref<HTMLElement>();
const imageInput = ref<HTMLInputElement>();
const agentNames = ref<Record<string, string>>({});
let ws: WebSocket | undefined;
let reconnectTimer: number | undefined;

const emojis = ['😀', '😁', '😂', '😊', '😍', '😝', '😎', '😢', '😨', '👍', '👏', '🙏', '🎀', '❤️', '🔥', '🌮', '💕', '✨', '🤝', '☕'];
const MESSAGE_TIME_GAP = 5 * 60 * 1000;

interface CachedClientSession {
	session: SessionItem;
	visitor_name: string;
	channel_id: string;
	group_id: string;
	expires_at: number;
}

const statusText = computed(() => {
	if (!session.value) return '';
	if (session.value.agent_id) return `客服 ${agentNames.value[session.value.agent_id] || session.value.agent_id} 正在为您服务`;
	return '已进入排队，请稍候';
});

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

const ensureAgentName = async (agentID?: string) => {
	if (!agentID || agentNames.value[agentID]) return;
	try {
		const agent = await getAgent(agentID);
		agentNames.value = {
			...agentNames.value,
			[agentID]: agent.display_name || agent.username || agentID,
		};
	} catch {
		agentNames.value = { ...agentNames.value, [agentID]: agentID };
	}
};

const scrollToBottom = async () => {
	await nextTick();
	if (messageBox.value) messageBox.value.scrollTop = messageBox.value.scrollHeight;
};

const applySessionFromMessage = (message: ChatMessage) => {
	if (!session.value || message.session_id !== session.value.id || message.sender_type !== 'agent') return;
	session.value = {
		...session.value,
		agent_id: message.sender_id || session.value.agent_id,
		status: 'serving',
		updated_at: message.send_time || session.value.updated_at,
	};
	void ensureAgentName(session.value.agent_id);
	saveCachedSession();
};

const loadMessages = async () => {
	if (!session.value) return;
	loading.value = true;
	try {
		const res = await listSessionMessages(session.value.id, { after_seq: 0, limit: 200 });
		messages.value = sortMessages(res.items || []);
	const lastAgentMessage = [...messages.value].reverse().find((item) => item.sender_type === 'agent');
	if (lastAgentMessage) applySessionFromMessage(lastAgentMessage);
	if (session.value.agent_id) void ensureAgentName(session.value.agent_id);
	await scrollToBottom();
	} finally {
		loading.value = false;
	}
};

const appendMessage = async (message: ChatMessage) => {
	if (!session.value || message.session_id !== session.value.id) return;
	if (messages.value.some((item) => item.id === message.id || item.client_msg_id === message.client_msg_id)) return;
	messages.value.push(message);
	messages.value = sortMessages(messages.value);
	if (message.sender_type === 'agent') {
		applySessionFromMessage(message);
		notifyNewMessage('客服新消息', message.msg_type === 'image' ? '收到一张图片' : message.content || '收到一条客服消息');
	}
	await scrollToBottom();
};

const connectSocket = () => {
	if (!session.value) return;
	if (reconnectTimer) window.clearTimeout(reconnectTimer);
	if (ws) {
		ws.onclose = null;
		ws.close();
	}
	ws = new WebSocket(getCustomerWsUrl('customer', visitorName.value.trim(), `customer-${visitorName.value.trim()}`));
	ws.onmessage = (event) => {
		try {
			const envelope = JSON.parse(event.data);
			if (envelope.event === 'message') appendMessage(envelope.data as ChatMessage);
			if (envelope.event === 'error') ElMessage.error(envelope.data?.message || 'WebSocket 消息错误');
		} catch {
			ElMessage.error('WebSocket 消息解析失败');
		}
	};
	ws.onclose = () => {
		if (session.value) reconnectTimer = window.setTimeout(connectSocket, 1500);
	};
};

const recentPointerKey = () => `cs_client_recent:${getCurrentTenantId()}:${getCurrentAppId()}:${channelId.value || 'web'}`;

const cacheKey = (name = visitorName.value) => `cs_client_session:${getCurrentTenantId()}:${getCurrentAppId()}:${channelId.value || 'web'}:${name}`;

const saveCachedSession = () => {
	if (!session.value || !visitorName.value.trim()) return;
	const data: CachedClientSession = {
		session: session.value,
		visitor_name: visitorName.value.trim(),
		channel_id: channelId.value || 'web',
		group_id: groupId.value || '',
		expires_at: Date.now() + 60 * 60 * 1000,
	};
	localStorage.setItem(cacheKey(), JSON.stringify(data));
	localStorage.setItem(recentPointerKey(), cacheKey());
};

const readCachedSession = () => {
	const key = visitorName.value.trim() ? cacheKey() : localStorage.getItem(recentPointerKey()) || '';
	if (!key) return undefined;
	try {
		const data = JSON.parse(localStorage.getItem(key) || '') as CachedClientSession;
		if (!data?.session?.id || data.expires_at <= Date.now()) {
			localStorage.removeItem(key);
			return undefined;
		}
		return data;
	} catch {
		localStorage.removeItem(key);
		return undefined;
	}
};

const restoreCachedSession = async () => {
	const cached = readCachedSession();
	if (!cached) return false;
	visitorName.value = cached.visitor_name;
	channelId.value = cached.channel_id || channelId.value || 'web';
	groupId.value = cached.group_id || groupId.value;
	session.value = cached.session;
	if (session.value.agent_id) void ensureAgentName(session.value.agent_id);
	saveCachedSession();
	await loadMessages();
	connectSocket();
	return true;
};

const startSession = async () => {
	unlockMessageSound();
	starting.value = true;
	try {
		const res = await createSession({
			user_id: visitorName.value.trim(),
			channel_id: channelId.value || 'web',
			group_id: groupId.value || undefined,
			priority: 0,
		});
		session.value = res;
		if (session.value?.agent_id) void ensureAgentName(session.value.agent_id);
		saveCachedSession();
		await loadMessages();
		connectSocket();
	} finally {
		starting.value = false;
	}
};

const sendWsMessage = (content: string, msgType = 'text') => {
	if (!session.value) return false;
	unlockMessageSound();
	if (!ws || ws.readyState !== WebSocket.OPEN) {
		ElMessage.warning('WebSocket 未连接，请稍后再试');
		return false;
	}
	ws.send(
		JSON.stringify({
			event: 'send_message',
			data: {
				session_id: session.value.id,
				client_msg_id: `customer-${Date.now()}`,
				msg_type: msgType,
				content,
			},
		})
	);
	return true;
};

const sendMessage = async () => {
	if (!session.value || !draft.value.trim()) return;
	const content = draft.value.trim();
	if (sendWsMessage(content)) draft.value = '';
};

const uploadImageMessage = async (event: Event) => {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (!file || !session.value) return;
	if (!file.type.startsWith('image/')) {
		ElMessage.warning('请选择图片文件');
		return;
	}
	uploading.value = true;
	try {
		const res = await uploadChatImage(file);
		sendWsMessage(res.url, 'image');
	} finally {
		uploading.value = false;
	}
};

onMounted(async () => {
	const tenantId = String(route.query.tenant_id || route.query.tenant || '');
	const appId = String(route.query.app_id || route.query.app || 'default');
	if (tenantId) setCurrentTenantId(tenantId);
	if (appId) setCurrentAppId(appId);
	if (!tenantId) ElMessage.warning('缺少 tenant_id 参数，将使用默认租户');
	const restored = await restoreCachedSession();
	if (restored) ElMessage.success('已续接上次咨询');
});

onBeforeUnmount(() => {
	session.value = undefined;
	if (reconnectTimer) window.clearTimeout(reconnectTimer);
	if (ws) {
		ws.onclose = null;
		ws.close();
	}
	stopTitleFlash();
});
</script>

<style scoped lang="scss">
.client-chat {
	min-height: 100vh;
	display: grid;
	place-items: center;
	padding: 24px;
	background: #f4f7fb;
}

.chat-window {
	width: min(720px, 100%);
	height: min(760px, calc(100vh - 48px));
	display: grid;
	grid-template-rows: auto 1fr auto;
	background: #fff;
	border: 1px solid #dfe6f2;
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 18px 46px rgba(29, 41, 57, 0.12);
}

.client-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 18px 20px;
	border-bottom: 1px solid #e5eaf3;

	h1 {
		margin: 0;
		font-size: 20px;
	}

	p {
		margin: 4px 0 0;
		color: #667085;
	}
}

.start-panel {
	padding: 24px;
	align-self: start;
}

.start-button {
	width: 100%;
}

.client-messages {
	overflow: auto;
	padding: 18px;
	background: #f8fafc;
}

.client-message {
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
	color: #98a2b3;
}

.client-bubble {
	max-width: min(520px, 78%);
	padding: 10px 12px;
	border-radius: 8px;
	background: #fff;
	border: 1px solid #e5eaf3;
	white-space: pre-wrap;
	word-break: break-word;
}

.mine .client-bubble {
	background: #e8f3ff;
	border-color: #c6e2ff;
}

.client-meta {
	margin-bottom: 4px;
	font-size: 12px;
	color: #667085;
}

.client-composer {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) 96px;
	align-items: end;
	gap: 12px;
	padding: 14px;
	border-top: 1px solid #e5eaf3;
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
			background: #f2f4f7;
		}
	}
}

.hidden-input {
	display: none;
}

.message-image {
	width: min(240px, 62vw);
	max-height: 260px;
	border-radius: 6px;
	display: block;
}

@media (max-width: 640px) {
	.client-chat {
		padding: 0;
	}

	.chat-window {
		width: 100%;
		height: 100vh;
		border-radius: 0;
		border: 0;
	}

	.client-composer {
		grid-template-columns: auto minmax(0, 1fr);

		.el-button[type='primary'] {
			grid-column: 2;
		}
	}
}
</style>



