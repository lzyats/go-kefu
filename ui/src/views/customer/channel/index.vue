<template>
	<div class="customer-page">
		<TenantBar @change="loadData" />
		<el-card shadow="hover">
			<div class="toolbar">
				<el-button type="primary" @click="openDialog()">新增渠道</el-button>
				<el-button @click="loadData">刷新</el-button>
			</div>
			<el-table v-loading="loading" :data="items" style="width: 100%">
				<el-table-column prop="channel_name" label="渠道名称" min-width="160" />
				<el-table-column prop="channel_type" label="类型" width="120" />
				<el-table-column prop="app_id" label="应用" width="120" />
				<el-table-column prop="default_group_id" label="默认坐席组" min-width="160" show-overflow-tooltip />
				<el-table-column prop="app_key" label="App Key" min-width="220" show-overflow-tooltip />
				<el-table-column prop="status" label="状态" width="100">
					<template #default="{ row }">
						<el-tag :type="row.status === 'enabled' ? 'success' : 'info'">{{ row.status }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="操作" width="120">
					<template #default="{ row }">
						<el-button text type="primary" @click="openDialog(row)">编辑</el-button>
					</template>
				</el-table-column>
			</el-table>
		</el-card>
		<el-dialog v-model="dialog.visible" title="渠道配置" width="560px">
			<el-form label-width="100px">
				<el-form-item label="渠道名称">
					<el-input v-model="dialog.form.channel_name" />
				</el-form-item>
				<el-form-item label="渠道类型">
					<el-select v-model="dialog.form.channel_type" style="width: 100%">
						<el-option label="Web" value="web" />
						<el-option label="H5" value="h5" />
						<el-option label="App" value="app" />
						<el-option label="微信" value="wechat" />
					</el-select>
				</el-form-item>
				<el-form-item label="App ID">
					<el-input v-model="dialog.form.app_id" placeholder="default" />
				</el-form-item>
				<el-form-item label="App Key">
					<el-input v-model="dialog.form.app_key" placeholder="留空自动生成" />
				</el-form-item>
				<el-form-item label="默认坐席组">
					<el-select v-model="dialog.form.default_group_id" clearable placeholder="未选择时使用 default" style="width: 100%">
						<el-option v-for="item in groups" :key="item.group_id" :label="`${item.name}（${item.group_id}）`" :value="item.group_id" />
					</el-select>
				</el-form-item>
				<el-form-item label="Secret">
					<el-input v-model="dialog.form.secret" placeholder="留空自动生成" show-password />
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
import { AgentGroup, Channel, listAgentGroups, listChannels, saveChannel } from '/@/api/customer/admin';

const loading = ref(false);
const items = ref<Channel[]>([]);
const groups = ref<AgentGroup[]>([]);
const emptyForm = (): Channel => ({
	channel_name: '',
	channel_type: 'web',
	app_id: 'default',
	app_key: '',
	secret: '',
	default_group_id: '',
	status: 'enabled',
});
const dialog = reactive({
	visible: false,
	form: emptyForm(),
});

const loadData = async () => {
	loading.value = true;
	try {
		const [res, groupRes] = await Promise.all([listChannels({ limit: 100, offset: 0 }), listAgentGroups({ limit: 100, offset: 0 })]);
		items.value = res.items || [];
		groups.value = groupRes.items || [];
	} finally {
		loading.value = false;
	}
};

const openDialog = (row?: Channel) => {
	dialog.form = row ? { ...row, secret: '' } : emptyForm();
	dialog.visible = true;
};

const submit = async () => {
	await saveChannel(dialog.form);
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
