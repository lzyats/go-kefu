<template>
	<div class="customer-page">
		<TenantBar @change="loadData" />
		<el-row :gutter="12">
			<el-col v-for="item in cards" :key="item.label" :xs="24" :sm="12" :lg="6">
				<el-card shadow="hover" class="stat-card">
					<div class="stat-card__label">{{ item.label }}</div>
					<div class="stat-card__value">{{ item.value }}</div>
				</el-card>
			</el-col>
		</el-row>
		<el-card class="mt15" shadow="hover">
			<template #header>客服系统概览</template>
			<el-descriptions :column="2" border>
				<el-descriptions-item label="在线坐席">{{ stats.online_agents }}</el-descriptions-item>
				<el-descriptions-item label="排队会话">{{ stats.waiting_sessions }}</el-descriptions-item>
				<el-descriptions-item label="服务中会话">{{ stats.serving_sessions }}</el-descriptions-item>
				<el-descriptions-item label="今日消息">{{ stats.today_messages }}</el-descriptions-item>
			</el-descriptions>
		</el-card>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue';
import TenantBar from '/@/views/customer/components/TenantBar.vue';
import { DashboardStats, getDashboard } from '/@/api/customer/admin';

const stats = reactive<DashboardStats>({
	online_agents: 0,
	waiting_sessions: 0,
	serving_sessions: 0,
	today_messages: 0,
});

const cards = computed(() => [
	{ label: '在线坐席', value: stats.online_agents },
	{ label: '排队会话', value: stats.waiting_sessions },
	{ label: '服务中会话', value: stats.serving_sessions },
	{ label: '今日消息', value: stats.today_messages },
]);

const loadData = async () => {
	const res = await getDashboard();
	Object.assign(stats, res);
};

onMounted(loadData);
</script>

<style scoped lang="scss">
.customer-page {
	padding: 12px;
}

.stat-card {
	margin-bottom: 12px;
}

.stat-card__label {
	color: var(--el-text-color-secondary);
	font-size: 13px;
}

.stat-card__value {
	font-size: 28px;
	font-weight: 700;
	margin-top: 8px;
}
</style>
