<template>
	<div class="customer-page">
		<TenantBar @change="loadData" />
		<el-row :gutter="12">
			<el-col :xs="24" :lg="12">
				<el-card shadow="hover">
					<template #header>
						<div class="card-header">
							<span>敏感词</span>
							<el-button type="primary" size="small" @click="openWord()">新增</el-button>
						</div>
					</template>
					<el-table v-loading="loading" :data="words">
						<el-table-column prop="word" label="词条" />
						<el-table-column prop="level" label="等级" width="100" />
						<el-table-column prop="action" label="动作" width="100" />
						<el-table-column prop="status" label="状态" width="100" />
						<el-table-column label="操作" width="90">
							<template #default="{ row }">
								<el-button text type="primary" @click="openWord(row)">编辑</el-button>
							</template>
						</el-table-column>
					</el-table>
				</el-card>
			</el-col>
			<el-col :xs="24" :lg="12">
				<el-card shadow="hover">
					<template #header>
						<div class="card-header">
							<span>黑名单</span>
							<el-button type="primary" size="small" @click="openBlacklist()">新增</el-button>
						</div>
					</template>
					<el-table v-loading="loading" :data="blacklists">
						<el-table-column prop="target_type" label="类型" width="100" />
						<el-table-column prop="target_value" label="目标" />
						<el-table-column prop="reason" label="原因" show-overflow-tooltip />
						<el-table-column prop="status" label="状态" width="100" />
						<el-table-column label="操作" width="90">
							<template #default="{ row }">
								<el-button text type="primary" @click="openBlacklist(row)">编辑</el-button>
							</template>
						</el-table-column>
					</el-table>
				</el-card>
			</el-col>
		</el-row>
		<el-card class="mt15" shadow="hover">
			<template #header>风控事件</template>
			<el-table v-loading="loading" :data="events">
				<el-table-column prop="event_type" label="事件" width="150" />
				<el-table-column prop="target_value" label="目标" width="180" />
				<el-table-column prop="level" label="等级" width="100" />
				<el-table-column prop="description" label="描述" show-overflow-tooltip />
				<el-table-column prop="status" label="状态" width="100" />
				<el-table-column prop="created_at" label="时间" width="180" show-overflow-tooltip />
			</el-table>
		</el-card>
		<el-dialog v-model="wordDialog.visible" title="敏感词" width="480px">
			<el-form label-width="80px">
				<el-form-item label="词条"><el-input v-model="wordDialog.form.word" /></el-form-item>
				<el-form-item label="等级">
					<el-select v-model="wordDialog.form.level" style="width: 100%">
						<el-option label="低" value="low" />
						<el-option label="中" value="medium" />
						<el-option label="高" value="high" />
					</el-select>
				</el-form-item>
				<el-form-item label="动作">
					<el-select v-model="wordDialog.form.action" style="width: 100%">
						<el-option label="审核" value="review" />
						<el-option label="拦截" value="block" />
						<el-option label="告警" value="alert" />
					</el-select>
				</el-form-item>
				<el-form-item label="状态"><el-select v-model="wordDialog.form.status" style="width: 100%"><el-option label="启用" value="enabled" /><el-option label="禁用" value="disabled" /></el-select></el-form-item>
			</el-form>
			<template #footer><el-button @click="wordDialog.visible = false">取消</el-button><el-button type="primary" @click="submitWord">保存</el-button></template>
		</el-dialog>
		<el-dialog v-model="blackDialog.visible" title="黑名单" width="480px">
			<el-form label-width="90px">
				<el-form-item label="类型"><el-select v-model="blackDialog.form.target_type" style="width: 100%"><el-option label="用户" value="user" /><el-option label="IP" value="ip" /><el-option label="设备" value="device" /></el-select></el-form-item>
				<el-form-item label="目标"><el-input v-model="blackDialog.form.target_value" /></el-form-item>
				<el-form-item label="原因"><el-input v-model="blackDialog.form.reason" /></el-form-item>
				<el-form-item label="状态"><el-select v-model="blackDialog.form.status" style="width: 100%"><el-option label="启用" value="enabled" /><el-option label="禁用" value="disabled" /></el-select></el-form-item>
			</el-form>
			<template #footer><el-button @click="blackDialog.visible = false">取消</el-button><el-button type="primary" @click="submitBlacklist">保存</el-button></template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import TenantBar from '/@/views/customer/components/TenantBar.vue';
import { Blacklist, listBlacklists, listRiskEvents, listSensitiveWords, saveBlacklist, saveSensitiveWord, SensitiveWord } from '/@/api/customer/admin';

const loading = ref(false);
const words = ref<SensitiveWord[]>([]);
const blacklists = ref<Blacklist[]>([]);
const events = ref([]);
const wordDialog = reactive({ visible: false, form: { word: '', level: 'medium', action: 'review', status: 'enabled' } as SensitiveWord });
const blackDialog = reactive({ visible: false, form: { target_type: 'user', target_value: '', reason: '', status: 'enabled' } as Blacklist });

const loadData = async () => {
	loading.value = true;
	try {
		const [w, b, e] = await Promise.all([listSensitiveWords({ limit: 100, offset: 0 }), listBlacklists({ limit: 100, offset: 0 }), listRiskEvents({ limit: 100, offset: 0 })]);
		words.value = w.items || [];
		blacklists.value = b.items || [];
		events.value = e.items || [];
	} finally {
		loading.value = false;
	}
};
const openWord = (row?: SensitiveWord) => { wordDialog.form = row ? { ...row } : { word: '', level: 'medium', action: 'review', status: 'enabled' }; wordDialog.visible = true; };
const openBlacklist = (row?: Blacklist) => { blackDialog.form = row ? { ...row } : { target_type: 'user', target_value: '', reason: '', status: 'enabled' }; blackDialog.visible = true; };
const submitWord = async () => { await saveSensitiveWord(wordDialog.form); ElMessage.success('保存成功'); wordDialog.visible = false; loadData(); };
const submitBlacklist = async () => { await saveBlacklist(blackDialog.form); ElMessage.success('保存成功'); blackDialog.visible = false; loadData(); };
onMounted(loadData);
</script>

<style scoped lang="scss">
.customer-page { padding: 12px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
</style>
