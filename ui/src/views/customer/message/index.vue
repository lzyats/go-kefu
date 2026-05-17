<template>
	<div class="customer-page">
		<TenantBar @change="loadData" />
		<el-card shadow="hover">
			<div class="toolbar">
				<el-input v-model="query.session_id" placeholder="会话ID" clearable style="width: 220px" />
				<el-input v-model="query.sender_id" placeholder="发送人ID" clearable style="width: 180px" />
				<el-input v-model="query.keyword" placeholder="消息关键词" clearable style="width: 220px" />
				<el-button type="primary" @click="loadData">查询</el-button>
			</div>
			<el-table v-loading="loading" :data="items" style="width: 100%">
				<el-table-column prop="session_id" label="会话ID" min-width="220" show-overflow-tooltip />
				<el-table-column prop="sender_id" label="发送人" width="140" />
				<el-table-column prop="sender_type" label="类型" width="110" />
				<el-table-column prop="msg_type" label="消息类型" width="110" />
				<el-table-column prop="content" label="内容" min-width="260" show-overflow-tooltip />
				<el-table-column prop="seq" label="序号" width="90" />
				<el-table-column prop="send_time" label="发送时间" min-width="180" show-overflow-tooltip />
			</el-table>
		</el-card>
	</div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import TenantBar from '/@/views/customer/components/TenantBar.vue';
import { listMessages } from '/@/api/customer/admin';

const loading = ref(false);
const items = ref([]);
const query = reactive({ session_id: '', sender_id: '', keyword: '' });

const loadData = async () => {
	loading.value = true;
	try {
		const res = await listMessages({ ...query, limit: 100, offset: 0 });
		items.value = res.items || [];
	} finally {
		loading.value = false;
	}
};

onMounted(loadData);
</script>

<style scoped lang="scss">
.customer-page { padding: 12px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
</style>
