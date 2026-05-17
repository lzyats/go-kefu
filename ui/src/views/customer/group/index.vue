<template>
	<div class="customer-page">
		<TenantBar @change="loadData" />
		<el-card shadow="hover">
			<div class="toolbar">
				<el-button type="primary" @click="openGroupDialog()">新增坐席组</el-button>
				<el-button @click="loadData">刷新</el-button>
			</div>
			<el-table v-loading="loading" :data="groups" style="width: 100%">
				<el-table-column prop="tenant_id" label="租户ID" min-width="160" show-overflow-tooltip />
				<el-table-column prop="group_id" label="组ID" min-width="180" show-overflow-tooltip />
				<el-table-column prop="name" label="组名称" min-width="160" />
				<el-table-column prop="status" label="状态" width="120">
					<template #default="{ row }">
						<el-tag :type="row.status === 'enabled' ? 'success' : 'info'">{{ row.status }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="created_at" label="创建时间" min-width="180" show-overflow-tooltip />
				<el-table-column label="操作" width="220">
					<template #default="{ row }">
						<el-button text type="primary" @click="openGroupDialog(row)">编辑</el-button>
						<el-button text type="primary" @click="openRelDialog(row)">添加坐席</el-button>
					</template>
				</el-table-column>
			</el-table>
		</el-card>

		<el-dialog v-model="groupDialog.visible" title="坐席组" width="520px">
			<el-form label-width="100px">
				<el-form-item label="所属租户">
					<el-input :model-value="currentTenantId" disabled />
				</el-form-item>
				<el-form-item label="组ID">
					<el-input v-model="groupDialog.form.group_id" placeholder="留空自动生成" />
				</el-form-item>
				<el-form-item label="组名称">
					<el-input v-model="groupDialog.form.name" />
				</el-form-item>
				<el-form-item label="状态">
					<el-select v-model="groupDialog.form.status" style="width: 100%">
						<el-option label="启用" value="enabled" />
						<el-option label="禁用" value="disabled" />
					</el-select>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="groupDialog.visible = false">取消</el-button>
				<el-button type="primary" @click="submitGroup">保存</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="relDialog.visible" title="添加坐席到分组" width="480px">
			<el-form label-width="100px">
				<el-form-item label="所属租户">
					<el-input :model-value="currentTenantId" disabled />
				</el-form-item>
				<el-form-item label="坐席组">
					<el-input v-model="relDialog.groupId" disabled />
				</el-form-item>
				<el-form-item label="选择坐席">
					<el-select v-model="relDialog.agentId" filterable style="width: 100%">
						<el-option v-for="agent in agents" :key="agent.agent_id" :label="`${agent.display_name || agent.username} (${agent.agent_id})`" :value="agent.agent_id" />
					</el-select>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="relDialog.visible = false">取消</el-button>
				<el-button type="primary" @click="submitRel">保存</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import TenantBar from '/@/views/customer/components/TenantBar.vue';
import { addAgentToGroup, Agent, AgentGroup, getCurrentTenantId, listAgentGroups, listAgents, saveAgentGroup } from '/@/api/customer/admin';

const loading = ref(false);
const groups = ref<AgentGroup[]>([]);
const agents = ref<Agent[]>([]);
const currentTenantId = computed(() => getCurrentTenantId());
const groupDialog = reactive({
	visible: false,
	form: { group_id: '', name: '', status: 'enabled' } as AgentGroup,
});
const relDialog = reactive({
	visible: false,
	groupId: '',
	agentId: '',
});

const loadData = async () => {
	loading.value = true;
	try {
		const [groupRes, agentRes] = await Promise.all([listAgentGroups({ limit: 100, offset: 0 }), listAgents({ limit: 100, offset: 0 })]);
		groups.value = groupRes.items || [];
		agents.value = agentRes.items || [];
	} finally {
		loading.value = false;
	}
};

const openGroupDialog = (row?: AgentGroup) => {
	groupDialog.form = row ? { ...row } : { group_id: '', name: '', status: 'enabled' };
	groupDialog.visible = true;
};

const openRelDialog = (row: AgentGroup) => {
	relDialog.groupId = row.group_id || '';
	relDialog.agentId = '';
	relDialog.visible = true;
};

const submitGroup = async () => {
	await saveAgentGroup(groupDialog.form);
	ElMessage.success('保存成功');
	groupDialog.visible = false;
	loadData();
};

const submitRel = async () => {
	await addAgentToGroup(relDialog.groupId, relDialog.agentId);
	ElMessage.success('添加成功');
	relDialog.visible = false;
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
