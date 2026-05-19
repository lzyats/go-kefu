import axios, { AxiosInstance } from 'axios';
import { ElMessage } from 'element-plus';
import { Session } from '/@/utils/storage';

export function getCustomerApiBaseURL() {
	return import.meta.env.VITE_CUSTOMER_API_URL || '/customer-api';
}

const customerService: AxiosInstance = axios.create({
	baseURL: getCustomerApiBaseURL(),
	timeout: 50000,
	headers: { 'Content-Type': 'application/json' },
});

customerService.interceptors.request.use((config) => {
	if (Session.get('token')) {
		config.headers!['Authorization'] = `Bearer ${Session.get('token')}`;
	}
	const userInfo = Session.get('userInfo');
	const adminId = userInfo?.id || userInfo?.userId || userInfo?.user_id;
	if (adminId) {
		config.headers!['X-Admin-ID'] = String(adminId);
	}
	config.headers!['X-Tenant-ID'] = getCurrentTenantId();
	config.headers!['X-App-ID'] = getCurrentAppId();
	return config;
});

customerService.interceptors.response.use(
	(response) => response.data,
	(error) => {
		const message = error?.response?.data?.error || error?.response?.data?.message || error.message || '客服后台接口请求失败';
		ElMessage.error(message);
		return Promise.reject(error);
	}
);

export interface PageQuery {
	limit?: number;
	offset?: number;
	status?: string;
}

export interface Tenant {
	id?: string;
	name: string;
	status?: string;
	agent_limit?: number;
	admin_username?: string;
	admin_password?: string;
	gfast_user_id?: number;
	created_at?: string;
	updated_at?: string;
}

export interface TenantAdmin {
	id?: string;
	tenant_id?: string;
	gfast_user_id: number;
	gfast_username?: string;
	role_type?: string;
	status?: string;
	created_at?: string;
	updated_at?: string;
}

export interface Channel {
	id?: string;
	tenant_id?: string;
	app_id?: string;
	channel_type: string;
	channel_name: string;
	app_key?: string;
	secret?: string;
	default_group_id?: string;
	status?: string;
	created_at?: string;
	updated_at?: string;
}

export interface Agent {
	id?: string;
	tenant_id?: string;
	agent_id?: string;
	gfast_user_id?: number;
	username: string;
	display_name: string;
	max_sessions: number;
	status?: string;
	online_status?: string;
	created_at?: string;
	updated_at?: string;
}

export interface UploadImageResult {
	url: string;
	content_type: string;
	size: number;
}

export interface AgentGroup {
	id?: string;
	tenant_id?: string;
	group_id?: string;
	name: string;
	status?: string;
	created_at?: string;
	updated_at?: string;
}

export interface SessionItem {
	id: string;
	tenant_id: string;
	app_id: string;
	channel_id: string;
	user_id: string;
	agent_id: string;
	group_id: string;
	status: string;
	priority: number;
	last_seq: number;
	last_msg_time: string;
	source_ip?: string;
	user_agent?: string;
	login_time?: string;
	created_at: string;
	updated_at: string;
}

export interface ChatMessage {
	id: string;
	tenant_id: string;
	app_id: string;
	channel_id: string;
	session_id: string;
	client_msg_id: string;
	sender_id: string;
	sender_type: 'customer' | 'agent' | 'admin';
	receiver_id: string;
	msg_type: string;
	content: string;
	seq: number;
	status: string;
	send_time: string;
}

export interface SensitiveWord {
	id?: string;
	word: string;
	level: string;
	action: string;
	status: string;
	created_at?: string;
}

export interface Blacklist {
	id?: string;
	target_type: string;
	target_value: string;
	reason: string;
	status: string;
	expire_at?: string;
	created_at?: string;
}

export interface RiskEvent {
	id: string;
	event_type: string;
	target_type: string;
	target_value: string;
	level: string;
	description: string;
	status: string;
	created_at: string;
}

export interface TenantConfig {
	id?: string;
	config_key: string;
	config_value: string;
	value_type: string;
	remark: string;
	created_at?: string;
	updated_at?: string;
}

export interface CustomerFAQ {
	id?: string;
	tenant_id?: string;
	faq_id?: string;
	question: string;
	answer: string;
	is_common?: boolean;
	status?: string;
	sort?: number;
	created_at?: string;
	updated_at?: string;
}

export interface DailyReport {
	date: string;
	new_sessions: number;
	closed_sessions: number;
	messages: number;
	active_customers: number;
}

export interface DashboardStats {
	online_agents: number;
	waiting_sessions: number;
	serving_sessions: number;
	today_messages: number;
}

export function getCurrentTenantId() {
	return Session.get('customerTenantId') || localStorage.getItem('customerTenantId') || 'tenant-demo';
}

export function setCurrentTenantId(tenantId: string) {
	Session.set('customerTenantId', tenantId);
	localStorage.setItem('customerTenantId', tenantId);
}

export function getCurrentAppId() {
	return Session.get('customerAppId') || localStorage.getItem('customerAppId') || 'default';
}

export function setCurrentAppId(appId: string) {
	Session.set('customerAppId', appId);
	localStorage.setItem('customerAppId', appId);
}

export function getCustomerWsUrl(userType: 'customer' | 'agent', userId: string, deviceId?: string) {
	const apiUrl = import.meta.env.VITE_CUSTOMER_WS_URL || '';
	const fallback = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8102/ws`;
	let base = apiUrl || fallback;
	if (base.startsWith('/')) {
		base = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${base}`;
	} else if (base.startsWith('http://')) {
		base = base.replace(/^http:\/\//, 'ws://');
	} else if (base.startsWith('https://')) {
		base = base.replace(/^https:\/\//, 'wss://');
	}
	const params = new URLSearchParams({
		tenant_id: getCurrentTenantId(),
		app_id: getCurrentAppId(),
		user_type: userType,
		user_id: userId,
		device_id: deviceId || `${userType}-web`,
	});
	return `${base}?${params.toString()}`;
}

export function getCustomerAssetUrl(url: string) {
	if (!url) return '';
	if (/^https?:\/\//i.test(url)) return url;
	if (url.startsWith('/uploads/')) return `${getCustomerApiBaseURL()}${url}`;
	return url;
}

export function createSession(data: { user_id: string; channel_id?: string; group_id?: string; priority?: number }) {
	return customerService.post('/api/v1/sessions', data);
}

export function sendChatMessage(data: {
	session_id: string;
	client_msg_id?: string;
	sender_id: string;
	sender_type: 'customer' | 'agent' | 'admin';
	receiver_id?: string;
	msg_type?: string;
	content: string;
}) {
	return customerService.post('/api/v1/messages', data);
}

export function listSessionMessages(sessionId: string, params?: { after_seq?: number; limit?: number }) {
	return customerService.get(`/api/v1/sessions/${sessionId}/messages`, { params });
}

export function setAgentOnline(agentId: string, data: { group_id?: string; max_sessions?: number; active_sessions?: number }) {
	return customerService.post(`/api/v1/agents/${agentId}/online`, data);
}

export function setAgentOffline(agentId: string, groupId?: string) {
	return customerService.post(`/api/v1/agents/${agentId}/offline`, undefined, { params: { group_id: groupId || 'default' } });
}

export function getAgent(agentId: string) {
	return customerService.get(`/api/v1/agents/${agentId}`);
}

export function uploadChatImage(file: File) {
	const formData = new FormData();
	formData.append('file', file);
	return customerService.post('/api/v1/uploads/images', formData, {
		headers: { 'Content-Type': 'multipart/form-data' },
	}) as Promise<UploadImageResult>;
}

export function listTenants(query?: PageQuery) {
	return customerService.get('/admin/v1/tenants', { params: query });
}

export function saveTenant(data: Tenant) {
	return customerService.post('/admin/v1/tenants', data);
}

export function deleteTenant(tenantId: string) {
	return customerService.delete(`/admin/v1/tenants/${tenantId}`);
}

export function listMyTenants() {
	return customerService.get('/admin/v1/my/tenants');
}

export function listTenantAdmins(tenantId: string, query?: PageQuery) {
	return customerService.get(`/admin/v1/tenants/${tenantId}/admins`, { params: query });
}

export function bindTenantAdmin(tenantId: string, data: TenantAdmin) {
	return customerService.post(`/admin/v1/tenants/${tenantId}/admins`, data);
}

export function unbindTenantAdmin(tenantId: string, gfastUserId: number) {
	return customerService.delete(`/admin/v1/tenants/${tenantId}/admins/${gfastUserId}`);
}

export function getDashboard() {
	return customerService.get('/admin/v1/dashboard');
}

export function listChannels(query?: PageQuery) {
	return customerService.get('/admin/v1/channels', { params: query });
}

export function saveChannel(data: Channel) {
	return customerService.post('/admin/v1/channels', data);
}

export function listAgents(query?: PageQuery) {
	return customerService.get('/admin/v1/agents', { params: query });
}

export function getMyAgent() {
	return customerService.get('/admin/v1/my/agent');
}

export function saveAgent(data: Agent) {
	return customerService.post('/admin/v1/agents', data);
}

export function listAgentGroups(query?: PageQuery) {
	return customerService.get('/admin/v1/agent-groups', { params: query });
}

export function saveAgentGroup(data: AgentGroup) {
	return customerService.post('/admin/v1/agent-groups', data);
}

export function addAgentToGroup(groupId: string, agentId: string) {
	return customerService.post(`/admin/v1/agent-groups/${groupId}/agents/${agentId}`);
}

export function listSessions(query?: PageQuery) {
	return customerService.get('/admin/v1/sessions', { params: query });
}

export function acceptSession(sessionId: string, agentId: string) {
	return customerService.post(`/admin/v1/sessions/${sessionId}/accept`, { agent_id: agentId });
}

export function listMessages(query?: PageQuery & { session_id?: string; sender_id?: string; keyword?: string }) {
	return customerService.get('/admin/v1/messages', { params: query });
}

export function listSensitiveWords(query?: PageQuery) {
	return customerService.get('/admin/v1/sensitive-words', { params: query });
}

export function saveSensitiveWord(data: SensitiveWord) {
	return customerService.post('/admin/v1/sensitive-words', data);
}

export function listBlacklists(query?: PageQuery) {
	return customerService.get('/admin/v1/blacklists', { params: query });
}

export function saveBlacklist(data: Blacklist) {
	return customerService.post('/admin/v1/blacklists', data);
}

export function listRiskEvents(query?: PageQuery) {
	return customerService.get('/admin/v1/risk-events', { params: query });
}

export function listDailyReports(days = 7) {
	return customerService.get('/admin/v1/reports/daily', { params: { days } });
}

export function listTenantConfigs(query?: PageQuery) {
	return customerService.get('/admin/v1/configs', { params: query });
}

export function saveTenantConfig(data: TenantConfig) {
	return customerService.post('/admin/v1/configs', data);
}

export function listTenantFAQs(query?: PageQuery) {
	return customerService.get('/admin/v1/faqs', { params: query }) as Promise<{ items: CustomerFAQ[] }>;
}

export function saveTenantFAQs(items: CustomerFAQ[]) {
	return customerService.post('/admin/v1/faqs', { items }) as Promise<{ items: CustomerFAQ[] }>;
}

export function listCommonFAQs() {
	return customerService.get('/admin/v1/faqs/common') as Promise<{ items: CustomerFAQ[] }>;
}

export function saveCommonFAQs(items: CustomerFAQ[]) {
	return customerService.post('/admin/v1/faqs/common', { items }) as Promise<{ items: CustomerFAQ[] }>;
}
