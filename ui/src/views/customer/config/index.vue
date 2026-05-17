<template>
	<div class="customer-page">
		<TenantBar @change="loadData" />
		<el-card shadow="hover">
			<div class="toolbar">
				<el-button type="primary" @click="openDialog()">新增配置</el-button>
				<el-button @click="loadData">刷新</el-button>
			</div>
			<el-table v-loading="loading" :data="items" style="width: 100%">
				<el-table-column prop="config_key" label="配置键" min-width="180" />
				<el-table-column prop="config_value" label="配置值" min-width="240" show-overflow-tooltip />
				<el-table-column prop="value_type" label="类型" width="120" />
				<el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
				<el-table-column label="操作" width="100">
					<template #default="{ row }"><el-button text type="primary" @click="openDialog(row)">编辑</el-button></template>
				</el-table-column>
			</el-table>
		</el-card>
		<el-dialog v-model="dialog.visible" title="系统配置" width="560px">
			<el-form label-width="90px">
				<el-form-item label="配置键"><el-input v-model="dialog.form.config_key" /></el-form-item>
				<el-form-item label="配置值"><el-input v-model="dialog.form.config_value" type="textarea" :rows="4" /></el-form-item>
				<el-form-item label="类型">
					<el-select v-model="dialog.form.value_type" style="width: 100%">
						<el-option label="字符串" value="string" />
						<el-option label="数字" value="number" />
						<el-option label="布尔" value="bool" />
						<el-option label="JSON" value="json" />
					</el-select>
				</el-form-item>
				<el-form-item label="备注"><el-input v-model="dialog.form.remark" /></el-form-item>
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
import { listTenantConfigs, saveTenantConfig, TenantConfig } from '/@/api/customer/admin';

const loading = ref(false);
const items = ref<TenantConfig[]>([]);
const dialog = reactive({ visible: false, form: { config_key: '', config_value: '', value_type: 'string', remark: '' } as TenantConfig });
const loadData = async () => {
	loading.value = true;
	try {
		const res = await listTenantConfigs({ limit: 100, offset: 0 });
		items.value = res.items || [];
	} finally {
		loading.value = false;
	}
};
const openDialog = (row?: TenantConfig) => { dialog.form = row ? { ...row } : { config_key: '', config_value: '', value_type: 'string', remark: '' }; dialog.visible = true; };
const submit = async () => { await saveTenantConfig(dialog.form); ElMessage.success('保存成功'); dialog.visible = false; loadData(); };
onMounted(loadData);
</script>

<style scoped lang="scss">
.customer-page { padding: 12px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
</style>
