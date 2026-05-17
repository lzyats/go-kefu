<template>
	<div class="layout-navbars-breadcrumb-user-news">
		<div class="head-box">
			<div class="head-box-title">{{ $t('message.user.newTitle') }}</div>
			<div class="head-box-btn" v-if="newsList.length > 0" @click="onAllReadClick">{{ $t('message.user.newBtn') }}</div>
		</div>
		<div class="content-box" v-loading="loading">
			<template v-if="newsList.length > 0">
				<div class="content-box-item" v-for="item in newsList" :key="item.id" @click="onNoticeClick(item)">
					<div class="content-box-title">
						<span>{{ item.title }}</span>
						<el-tag size="small" type="danger" v-if="item.readStatus === 0">未读</el-tag>
					</div>
					<div class="content-box-msg">{{ item.content }}</div>
					<div class="content-box-time">{{ item.createdAt }}</div>
				</div>
			</template>
			<el-empty :description="$t('message.user.newDesc')" v-else></el-empty>
		</div>
		<div class="foot-box" v-if="hasNoticeManageMenu" @click="onGoToNoticeClick">{{ $t('message.user.newGo') }}</div>
	</div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, reactive, toRefs } from 'vue';
import { useRouter } from 'vue-router';
import { getMyNoticeList, readAllMyNotice, readMyNotice } from '/@/api/system/notice';
import { Session } from '/@/utils/storage';

interface MyNoticeItem {
	id: number;
	noticeId: number;
	title: string;
	content: string;
	noticeType: string;
	linkUrl: string;
	payloadJson: string;
	readStatus: number;
	createdAt: string;
}

export default defineComponent({
	name: 'layoutBreadcrumbUserNews',
	emits: ['notice-count-change'],
	setup(_props, { emit }) {
		const router = useRouter();
		const state = reactive({
			loading: false,
			newsList: [] as MyNoticeItem[],
		});

		const loadNewsList = () => {
			state.loading = true;
			getMyNoticeList({ pageNum: 1, pageSize: 8, readStatus: 0 })
				.then((res: any) => {
					state.newsList = res.data.list || [];
					emit('notice-count-change', res.data.total || 0);
				})
				.finally(() => {
					state.loading = false;
				});
		};

		const onAllReadClick = () => {
			readAllMyNotice().then((res: any) => {
				state.newsList = [];
				emit('notice-count-change', res.data.count || 0);
			});
		};

		const onNoticeClick = (item: MyNoticeItem) => {
			readMyNotice([item.id]).then((res: any) => {
				state.newsList = state.newsList.filter((notice) => notice.id !== item.id);
				emit('notice-count-change', res.data.count || 0);
				if (item.linkUrl) {
					if (/^https?:\/\//i.test(item.linkUrl)) window.open(item.linkUrl);
					else router.push(item.linkUrl);
				}
			});
		};

		const hasNoticeManageMenu = computed(() => {
			const walk = (menus: any[]): boolean => {
				return (menus || []).some((menu: any) => menu?.path === '/system/notice/list' || walk(menu?.children || []));
			};
			return walk(Session.get('userMenu') || []);
		});

		const onGoToNoticeClick = () => {
			if (!hasNoticeManageMenu.value) return;
			router.push('/system/notice/list');
		};

		onMounted(() => {
			loadNewsList();
		});

		return {
			onAllReadClick,
			onNoticeClick,
			onGoToNoticeClick,
			hasNoticeManageMenu,
			...toRefs(state),
		};
	},
});
</script>

<style scoped lang="scss">
.layout-navbars-breadcrumb-user-news {
	.head-box {
		display: flex;
		border-bottom: 1px solid var(--el-border-color-lighter);
		box-sizing: border-box;
		color: var(--el-text-color-primary);
		justify-content: space-between;
		height: 35px;
		align-items: center;
		.head-box-btn {
			color: var(--el-color-primary);
			font-size: 13px;
			cursor: pointer;
			opacity: 0.8;
			&:hover {
				opacity: 1;
			}
		}
	}
	.content-box {
		font-size: 13px;
		min-height: 90px;
		max-height: 360px;
		overflow-y: auto;
		.content-box-item {
			padding: 12px 0;
			cursor: pointer;
			border-bottom: 1px solid var(--el-border-color-lighter);
			&:hover {
				color: var(--el-color-primary);
			}
			&:last-of-type {
				border-bottom: 0;
			}
			.content-box-title {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 8px;
				color: var(--el-text-color-primary);
			}
			.content-box-msg {
				color: var(--el-text-color-secondary);
				margin-top: 5px;
				margin-bottom: 5px;
				line-height: 1.5;
				display: -webkit-box;
				-webkit-line-clamp: 2;
				-webkit-box-orient: vertical;
				overflow: hidden;
			}
			.content-box-time {
				color: var(--el-text-color-secondary);
			}
		}
	}
	.foot-box {
		height: 35px;
		color: var(--el-color-primary);
		font-size: 13px;
		cursor: pointer;
		opacity: 0.8;
		display: flex;
		align-items: center;
		justify-content: center;
		border-top: 1px solid var(--el-border-color-lighter);
		&:hover {
			opacity: 1;
		}
	}
	:deep(.el-empty__description p) {
		font-size: 13px;
	}
}
</style>
