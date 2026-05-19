<template>
	<div class="customer-page">
		<TenantBar :key="tenantBarKey" @change="loadData" />
		<el-card shadow="hover">
			<div class="toolbar">
				<el-button type="primary" @click="openDialog()">新增租户</el-button>
				<el-button @click="loadData">刷新</el-button>
			</div>
			<el-table v-loading="loading" :data="items" style="width: 100%">
				<el-table-column prop="id" label="租户ID" min-width="160" show-overflow-tooltip />
				<el-table-column prop="name" label="租户名称" min-width="160" />
				<el-table-column prop="agent_limit" label="坐席数" width="100" />
				<el-table-column prop="status" label="状态" width="120">
					<template #default="{ row }">
						<el-tag :type="row.status === 'enabled' ? 'success' : 'info'">{{ row.status }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="created_at" label="创建时间" min-width="180" show-overflow-tooltip />
				<el-table-column label="操作" width="280">
					<template #default="{ row }">
						<el-button text type="primary" @click="applyTenant(row)">应用</el-button>
						<el-button text type="primary" @click="openAdminDialog(row)">绑定用户</el-button>
						<el-button text type="primary" @click="openDialog(row)">编辑</el-button>
						<el-button text type="danger" @click="submitDelete(row)">删除</el-button>
					</template>
				</el-table-column>
			</el-table>
		</el-card>

		<el-dialog v-model="dialog.visible" :title="dialog.isCreate ? '新增租户' : '编辑租户'" width="560px">
			<el-form label-width="110px">
				<el-form-item v-if="dialog.isCreate" label="租户ID">
					<el-alert title="系统将自动生成 12 位不重复数字，并同步作为该租户的系统用户ID。" type="info" :closable="false" show-icon />
				</el-form-item>
				<el-form-item v-else label="租户ID">
					<el-input v-model="dialog.form.id" disabled />
				</el-form-item>
				<el-form-item label="租户名称" required>
					<el-input v-model="dialog.form.name" placeholder="请输入租户名称" />
				</el-form-item>
				<el-form-item label="坐席数量" required>
					<el-input-number v-model="dialog.form.agent_limit" :min="1" :max="999" :step="1" controls-position="right" style="width: 180px" />
					<span class="form-tip">租户前端自助新增坐席时按这里限制</span>
				</el-form-item>
				<el-form-item v-if="dialog.isCreate" label="用户名" required>
					<el-input v-model="dialog.form.admin_username" placeholder="请输入租户登录用户名" />
				</el-form-item>
				<el-form-item v-if="dialog.isCreate" label="登录密码" required>
					<el-input v-model="dialog.form.admin_password" type="password" show-password placeholder="请输入租户登录密码" />
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

		<el-dialog v-model="adminDialog.visible" title="绑定后台用户" width="760px">
			<el-descriptions :column="2" border class="mb15">
				<el-descriptions-item label="租户ID">{{ adminDialog.tenant?.id }}</el-descriptions-item>
				<el-descriptions-item label="租户名称">{{ adminDialog.tenant?.name }}</el-descriptions-item>
			</el-descriptions>
			<div class="bind-toolbar">
				<el-select
					v-model="adminDialog.selectedUserId"
					filterable
					remote
					clearable
					placeholder="搜索 GFast 用户账号或昵称"
					:remote-method="searchUsers"
					:loading="userLoading"
					style="width: 320px"
				>
					<el-option v-for="user in users" :key="user.id" :label="`${user.userNickname || user.userName}（${user.userName}）`" :value="user.id" />
				</el-select>
				<el-select v-model="adminDialog.roleType" style="width: 160px">
					<el-option label="租户管理员" value="tenant_admin" />
					<el-option label="运营人员" value="operator" />
				</el-select>
				<el-button type="primary" @click="submitBind">绑定</el-button>
			</div>
			<el-table v-loading="adminLoading" :data="admins" style="width: 100%">
				<el-table-column prop="gfast_user_id" label="用户ID" width="150" />
				<el-table-column prop="gfast_username" label="用户" min-width="180" show-overflow-tooltip />
				<el-table-column prop="role_type" label="租户角色" width="140">
					<template #default="{ row }">{{ roleTypeText(row.role_type) }}</template>
				</el-table-column>
				<el-table-column prop="status" label="状态" width="110">
					<template #default="{ row }">
						<el-tag :type="row.status === 'enabled' ? 'success' : 'info'">{{ row.status }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="操作" width="120">
					<template #default="{ row }">
						<el-button text type="danger" @click="submitUnbind(row)">解绑</el-button>
					</template>
				</el-table-column>
			</el-table>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import TenantBar from '/@/views/customer/components/TenantBar.vue';
import {
	bindTenantAdmin,
	deleteTenant,
	listTenantAdmins,
	listTenants,
	saveTenant,
	setCurrentTenantId,
	Tenant,
	TenantAdmin,
	unbindTenantAdmin,
} from '/@/api/customer/admin';
import { getUserList } from '/@/api/system/user';

interface GFastUser {
	id: number;
	userName: string;
	userNickname: string;
	mobile?: string;
}

const loading = ref(false);
const adminLoading = ref(false);
const userLoading = ref(false);
const tenantBarKey = ref(0);
const items = ref<Tenant[]>([]);
const admins = ref<TenantAdmin[]>([]);
const users = ref<GFastUser[]>([]);
const dialog = reactive({
	visible: false,
	isCreate: true,
	form: { id: '', name: '', status: 'enabled', agent_limit: 3, admin_username: '', admin_password: '' } as Tenant,
});
const adminDialog = reactive({
	visible: false,
	tenant: undefined as Tenant | undefined,
	selectedUserId: undefined as number | undefined,
	roleType: 'tenant_admin',
});

const loadData = async () => {
	loading.value = true;
	try {
		const res = await listTenants({ limit: 100, offset: 0 });
		items.value = res.items || [];
	} finally {
		loading.value = false;
	}
};

const openDialog = (row?: Tenant) => {
	dialog.isCreate = !row;
	dialog.form = row
		? { ...row, admin_username: '', admin_password: '', agent_limit: row.agent_limit || 3 }
		: { id: '', name: '', status: 'enabled', agent_limit: 3, admin_username: '', admin_password: '' };
	dialog.visible = true;
};

const applyTenant = (row: Tenant) => {
	if (!row.id) return;
	setCurrentTenantId(row.id);
	tenantBarKey.value += 1;
	ElMessage.success(`已切换到租户：${row.name || row.id}`);
	loadData();
};

const roleTypeText = (roleType?: string) => {
	const map: Record<string, string> = {
		tenant_admin: '租户管理员',
		operator: '运营人员',
	};
	return map[roleType || ''] || roleType || '-';
};

const loadTenantAdmins = async () => {
	if (!adminDialog.tenant?.id) return;
	adminLoading.value = true;
	try {
		const res = await listTenantAdmins(adminDialog.tenant.id, { limit: 100, offset: 0 });
		admins.value = res.items || [];
	} finally {
		adminLoading.value = false;
	}
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

const openAdminDialog = async (row: Tenant) => {
	adminDialog.tenant = row;
	adminDialog.selectedUserId = undefined;
	adminDialog.roleType = 'tenant_admin';
	adminDialog.visible = true;
	await Promise.all([loadTenantAdmins(), searchUsers('')]);
};

const submitBind = async () => {
	if (!adminDialog.tenant?.id || !adminDialog.selectedUserId) {
		ElMessage.warning('请选择要绑定的后台用户');
		return;
	}
	const user = users.value.find((item) => item.id === adminDialog.selectedUserId);
	await bindTenantAdmin(adminDialog.tenant.id, {
		gfast_user_id: adminDialog.selectedUserId,
		gfast_username: user ? `${user.userNickname || user.userName}（${user.userName}）` : '',
		role_type: adminDialog.roleType,
		status: 'enabled',
	});
	ElMessage.success('绑定成功');
	adminDialog.selectedUserId = undefined;
	loadTenantAdmins();
};

const submitUnbind = async (row: TenantAdmin) => {
	if (!adminDialog.tenant?.id) return;
	await ElMessageBox.confirm(`确认解绑用户 ${row.gfast_username || row.gfast_user_id}？`, '提示', { type: 'warning' });
	await unbindTenantAdmin(adminDialog.tenant.id, row.gfast_user_id);
	ElMessage.success('解绑成功');
	loadTenantAdmins();
};

const submitDelete = async (row: Tenant) => {
	if (!row.id) return;
	await ElMessageBox.confirm(`确认删除租户「${row.name || row.id}」？删除后该租户登录用户、渠道、坐席、坐席组和配置会同步停用。`, '删除租户', {
		type: 'warning',
		confirmButtonText: '确认删除',
		cancelButtonText: '取消',
	});
	await deleteTenant(row.id);
	ElMessage.success('删除成功');
	loadData();
};

const submit = async () => {
	if (!dialog.form.name) {
		ElMessage.warning('请填写租户名称');
		return;
	}
	if (dialog.isCreate && !dialog.form.admin_password) {
		ElMessage.warning('新增租户时必须设置登录密码');
		return;
	}
	if (dialog.isCreate && !dialog.form.admin_username) {
		ElMessage.warning('新增租户时必须设置用户名');
		return;
	}
	const payload: Tenant = {
		...dialog.form,
		id: dialog.isCreate ? '' : dialog.form.id,
	};
	if (!dialog.isCreate) {
		payload.admin_username = '';
		payload.admin_password = '';
	}
	const saved = (await saveTenant(payload)) as Tenant;
	ElMessage.success(saved?.id ? `保存成功，租户ID：${saved.id}` : '保存成功');
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

.bind-toolbar {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
	flex-wrap: wrap;
}

.form-tip {
	margin-left: 10px;
	color: var(--el-text-color-secondary);
	font-size: 12px;
}

.mb15 {
	margin-bottom: 15px;
}
</style>
