<template>
	<el-alert v-if="visible" class="tenant-bar" type="info" :closable="false" show-icon>
		<template #title>
			<div class="tenant-bar__content">
				<span>当前租户</span>
				<el-input v-model="tenantId" class="tenant-bar__input" size="small" placeholder="tenant-demo" @change="save" />
				<span>应用</span>
				<el-input v-model="appId" class="tenant-bar__input" size="small" placeholder="default" @change="save" />
				<el-button size="small" type="primary" @click="save">应用</el-button>
			</div>
		</template>
	</el-alert>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getCurrentAppId, getCurrentTenantId, listMyTenants, setCurrentAppId, setCurrentTenantId } from '/@/api/customer/admin';
import { Session } from '/@/utils/storage';

interface MyTenant {
	id?: string;
	tenant_id?: string;
}

const emit = defineEmits(['change']);
const visible = ref(false);
const tenantId = ref(getCurrentTenantId());
const appId = ref(getCurrentAppId());

const isTenantUser = () => Number(Session.get('userInfo')?.isAdmin ?? Session.get('userInfo')?.is_admin) === 0;

const save = () => {
	setCurrentTenantId(tenantId.value || 'tenant-demo');
	setCurrentAppId(appId.value || 'default');
	ElMessage.success('租户上下文已切换');
	emit('change');
};

const normalizeMyTenants = (res: any) => {
	const payload = res?.data && ('locked' in res.data || 'items' in res.data) ? res.data : res;
	return {
		locked: Boolean(payload?.locked),
		items: Array.isArray(payload?.items) ? (payload.items as MyTenant[]) : [],
	};
};

onMounted(async () => {
	const tenantUser = isTenantUser();
	try {
		const res = await listMyTenants();
		const { locked, items } = normalizeMyTenants(res);
		if (locked || tenantUser) {
			const firstTenant = items[0];
			const nextTenantId = firstTenant?.id || firstTenant?.tenant_id || tenantId.value;
			setCurrentTenantId(nextTenantId);
			setCurrentAppId('default');
			tenantId.value = nextTenantId;
			appId.value = 'default';
			visible.value = false;
			emit('change');
			return;
		}
	} catch {
		// 平台调试时允许保留手动切换入口，接口异常不阻断页面。
	}
	if (tenantUser) {
		visible.value = false;
		return;
	}
	visible.value = true;
});
</script>

<style scoped lang="scss">
.tenant-bar {
	margin-bottom: 12px;
}

.tenant-bar__content {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.tenant-bar__input {
	width: 180px;
}
</style>
