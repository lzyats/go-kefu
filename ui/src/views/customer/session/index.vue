<template>
	<div class="customer-page">
		<TenantBar @change="loadData" />
		<el-card shadow="hover">
			<div class="toolbar">
				<el-select v-model="query.status" clearable placeholder="会话状态" style="width: 180px" @change="loadData">
					<el-option label="排队中" value="waiting" />
					<el-option label="服务中" value="serving" />
					<el-option label="转接中" value="transferring" />
					<el-option label="已关闭" value="closed" />
					<el-option label="超时" value="timeout" />
				</el-select>
				<el-button type="primary" @click="loadData">查询</el-button>
			</div>
			<el-table v-loading="loading" :data="items" style="width: 100%">
				<el-table-column prop="id" label="会话ID" min-width="220" show-overflow-tooltip />
				<el-table-column prop="user_id" label="用户" min-width="120" />
				<el-table-column prop="agent_id" label="坐席" min-width="120" />
				<el-table-column prop="group_id" label="坐席组" min-width="120" />
				<el-table-column prop="channel_id" label="渠道" min-width="120" />
				<el-table-column prop="status" label="状态" width="120">
					<template #default="{ row }">
						<el-tag>{{ row.status }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="last_seq" label="消息序号" width="100" />
				<el-table-column prop="updated_at" label="更新时间" min-width="180" show-overflow-tooltip />
			</el-table>
		</el-card>
	</div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import TenantBar from '/@/views/customer/components/TenantBar.vue';
import { listSessions, SessionItem } from '/@/api/customer/admin';

const loading = ref(false);
const items = ref<SessionItem[]>([]);
const query = reactive({
	status: '',
});

const loadData = async () => {
	loading.value = true;
	try {
		const res = await listSessions({ status: query.status || undefined, limit: 100, offset: 0 });
		items.value = res.items || [];
	} finally {
		loading.value = false;
	}
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
