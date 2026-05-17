<template>
	<div class="customer-page">
		<TenantBar @change="loadData" />
		<el-card shadow="hover">
			<div class="toolbar">
				<el-select v-model="days" style="width: 140px" @change="loadData">
					<el-option label="最近7天" :value="7" />
					<el-option label="最近15天" :value="15" />
					<el-option label="最近30天" :value="30" />
				</el-select>
				<el-button type="primary" @click="loadData">刷新</el-button>
			</div>
			<el-table v-loading="loading" :data="items" style="width: 100%">
				<el-table-column prop="date" label="日期" min-width="120" />
				<el-table-column prop="new_sessions" label="新增会话" min-width="120" />
				<el-table-column prop="closed_sessions" label="关闭会话" min-width="120" />
				<el-table-column prop="messages" label="消息数" min-width="120" />
				<el-table-column prop="active_customers" label="活跃客户" min-width="120" />
			</el-table>
		</el-card>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import TenantBar from '/@/views/customer/components/TenantBar.vue';
import { DailyReport, listDailyReports } from '/@/api/customer/admin';

const loading = ref(false);
const days = ref(7);
const items = ref<DailyReport[]>([]);
const loadData = async () => {
	loading.value = true;
	try {
		const res = await listDailyReports(days.value);
		items.value = res.items || [];
	} finally {
		loading.value = false;
	}
};
onMounted(loadData);
</script>

<style scoped lang="scss">
.customer-page { padding: 12px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
</style>
