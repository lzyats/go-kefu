<template>
	<div class="customer-page">
		<TenantBar @change="loadData" />
		<el-card shadow="hover">
			<div class="toolbar">
				<el-button type="primary" @click="openDialog()">新增坐席</el-button>
				<el-button @click="loadData">刷新</el-button>
			</div>
			<el-table v-loading="loading" :data="items" style="width: 100%">
				<el-table-column prop="agent_id" label="坐席ID" min-width="180" show-overflow-tooltip />
				<el-table-column prop="gfast_user_id" label="绑定用户ID" width="120" />
				<el-table-column prop="username" label="账号" min-width="140" />
				<el-table-column prop="display_name" label="显示名称" min-width="140" />
				<el-table-column prop="max_sessions" label="最大接待" width="100" />
				<el-table-column prop="online_status" label="在线" width="100">
					<template #default="{ row }">
						<el-tag :type="row.online_status === 'online' ? 'success' : 'info'">{{ row.online_status }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="status" label="状态" width="100" />
				<el-table-column label="操作" width="120">
					<template #default="{ row }">
						<el-button text type="primary" @click="openDialog(row)">编辑</el-button>
					</template>
				</el-table-column>
			</el-table>
		</el-card>
		<el-dialog v-model="dialog.visible" title="坐席信息" width="560px">
			<el-form label-width="100px">
				<el-form-item label="坐席ID">
					<el-input v-model="dialog.form.agent_id" placeholder="留空自动生成" />
				</el-form-item>
				<el-form-item label="绑定用户">
					<el-select
						v-model="dialog.form.gfast_user_id"
						filterable
						remote
						clearable
						placeholder="搜索 GFast 用户账号或昵称"
						:remote-method="searchUsers"
						:loading="userLoading"
						style="width: 100%"
						@change="applySelectedUser"
					>
						<el-option v-for="user in users" :key="user.id" :label="`${user.userNickname || user.userName}（${user.userName}）`" :value="user.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="账号">
					<el-input v-model="dialog.form.username" />
				</el-form-item>
				<el-form-item label="显示名称">
					<el-input v-model="dialog.form.display_name" />
				</el-form-item>
				<el-form-item label="最大接待数">
					<el-input-number v-model="dialog.form.max_sessions" :min="1" :max="100" />
				</el-form-item>
				<el-form-item label="在线状态">
					<el-select v-model="dialog.form.online_status" style="width: 100%">
						<el-option label="离线" value="offline" />
						<el-option label="在线" value="online" />
					</el-select>
				</el-form-item>
				<el-form-item label="状态">
					<el-select v-model="dialog.form.status" style="width: 100%">
						<el-option label="启用" value="enabled" />
						<el-option label="禁用" value="disabled" />
					</el-select>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="dialog.visible = false">取消</el-button>
				<el-button type="primary" @click="submit">保存</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import TenantBar from '/@/views/customer/components/TenantBar.vue';
import { Agent, listAgents, saveAgent } from '/@/api/customer/admin';
import { getUserList } from '/@/api/system/user';

interface GFastUser {
	id: number;
	userName: string;
	userNickname: string;
}

const loading = ref(false);
const userLoading = ref(false);
const items = ref<Agent[]>([]);
const users = ref<GFastUser[]>([]);
const dialog = reactive({
	visible: false,
	form: { agent_id: '', gfast_user_id: 0, username: '', display_name: '', max_sessions: 5, status: 'enabled', online_status: 'offline' } as Agent,
});

const loadData = async () => {
	loading.value = true;
	try {
		const res = await listAgents({ limit: 100, offset: 0 });
		items.value = res.items || [];
	} finally {
		loading.value = false;
	}
};

const openDialog = (row?: Agent) => {
	dialog.form = row ? { ...row } : { agent_id: '', gfast_user_id: 0, username: '', display_name: '', max_sessions: 5, status: 'enabled', online_status: 'offline' };
	dialog.visible = true;
	searchUsers(row?.username || '');
};

const searchUsers = async (keyword = '') => {
	userLoading.value = true;
	try {
		const res = await getUserList({ pageNum: 1, pageSize: 20, keyWords: keyword });
		users.value = res.data?.userList || [];
	} finally {
		userLoading.value = false;
	}
};

const applySelectedUser = () => {
	const user = users.value.find((item) => item.id === dialog.form.gfast_user_id);
	if (!user) return;
	dialog.form.username = user.userName || dialog.form.username;
	dialog.form.display_name = user.userNickname || user.userName || dialog.form.display_name;
};

const submit = async () => {
	await saveAgent(dialog.form);
	ElMessage.success('保存成功');
	dialog.visible = false;
	loadData();
};

onMounted(loadData);
</script>

<style scoped lang="scss">
.customer-page {
	padding: 12px;
}

.toolbar {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
}
</style>

