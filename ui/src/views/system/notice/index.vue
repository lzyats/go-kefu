<template>
	<div class="system-notice-container">
		<el-card shadow="hover">
			<div class="system-notice-search mb15">
				<el-form :model="tableData.param" ref="queryRef" :inline="true" label-width="72px">
					<el-form-item label="通知标题" prop="title">
						<el-input v-model="tableData.param.title" placeholder="请输入通知标题" clearable size="default" @keyup.enter.native="dataList" />
					</el-form-item>
					<el-form-item label="通知类型" prop="noticeType">
						<el-select v-model="tableData.param.noticeType" placeholder="请选择通知类型" clearable size="default" style="width: 160px">
							<el-option v-for="item in noticeTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
						</el-select>
					</el-form-item>
					<el-form-item label="发送范围" prop="targetType">
						<el-select v-model="tableData.param.targetType" placeholder="请选择发送范围" clearable size="default" style="width: 160px">
							<el-option label="全部用户" value="all" />
							<el-option label="指定用户" value="user" />
						</el-select>
					</el-form-item>
					<el-form-item label="状态" prop="status">
						<el-select v-model="tableData.param.status" placeholder="请选择状态" clearable size="default" style="width: 140px">
							<el-option label="正常" value="1" />
							<el-option label="禁用" value="0" />
						</el-select>
					</el-form-item>
					<el-form-item>
						<el-button size="default" type="primary" class="ml10" @click="dataList">
							<el-icon><ele-Search /></el-icon>
							查询
						</el-button>
						<el-button size="default" @click="resetQuery">
							<el-icon><ele-Refresh /></el-icon>
							重置
						</el-button>
						<el-button size="default" type="success" class="ml10" @click="openSendDialog" v-auth="'api/v1/system/notice/send'">
							<el-icon><ele-Position /></el-icon>
							发送通知
						</el-button>
						<el-button size="default" type="danger" class="ml10" @click="onRowDel(null)" v-auth="'api/v1/system/notice/delete'">
							<el-icon><ele-Delete /></el-icon>
							删除通知
						</el-button>
					</el-form-item>
				</el-form>
			</div>

			<el-table :data="tableData.data" style="width: 100%" @selection-change="handleSelectionChange">
				<el-table-column type="selection" width="55" align="center" />
				<el-table-column label="通知ID" prop="id" width="140" align="center" />
				<el-table-column label="标题" prop="title" min-width="180" :show-overflow-tooltip="true" />
				<el-table-column label="内容" prop="content" min-width="260" :show-overflow-tooltip="true" />
				<el-table-column label="类型" prop="noticeType" width="110" align="center">
					<template #default="scope">
						<el-tag>{{ noticeTypeLabel(scope.row.noticeType) }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="范围" prop="targetType" width="110" align="center">
					<template #default="scope">
						<el-tag :type="scope.row.targetType === 'all' ? 'success' : 'warning'">{{ scope.row.targetType === 'all' ? '全部用户' : '指定用户' }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="跳转地址" prop="linkUrl" min-width="160" :show-overflow-tooltip="true" />
				<el-table-column label="状态" prop="status" width="90" align="center">
					<template #default="scope">
						<el-tag :type="scope.row.status === 1 ? 'success' : 'info'">{{ scope.row.status === 1 ? '正常' : '禁用' }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="创建时间" prop="createdAt" width="180" align="center" />
				<el-table-column label="操作" width="170" fixed="right">
					<template #default="scope">
						<el-button size="small" text type="primary" @click="openUserList(scope.row)" v-auth="'api/v1/system/notice/user-list'">投递记录</el-button>
						<el-button size="small" text type="danger" @click="onRowDel(scope.row)" v-auth="'api/v1/system/notice/delete'">删除</el-button>
					</template>
				</el-table-column>
			</el-table>

			<pagination
				v-show="tableData.total > 0"
				:total="tableData.total"
				v-model:page="tableData.param.pageNum"
				v-model:limit="tableData.param.pageSize"
				@pagination="dataList"
			/>
		</el-card>

		<el-dialog title="发送通知" v-model="sendDialog.visible" width="680px" destroy-on-close>
			<el-form ref="sendFormRef" :model="sendForm" :rules="sendRules" label-width="96px">
				<el-form-item label="通知标题" prop="title">
					<el-input v-model="sendForm.title" placeholder="请输入通知标题" maxlength="128" show-word-limit />
				</el-form-item>
				<el-form-item label="通知类型" prop="noticeType">
					<el-select v-model="sendForm.noticeType" placeholder="请选择通知类型" style="width: 100%">
						<el-option v-for="item in noticeTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
					</el-select>
				</el-form-item>
				<el-form-item label="发送范围" prop="targetType">
					<el-radio-group v-model="sendForm.targetType">
						<el-radio-button label="all">全部用户</el-radio-button>
						<el-radio-button label="user">指定用户</el-radio-button>
					</el-radio-group>
				</el-form-item>
				<el-form-item v-if="sendForm.targetType === 'user'" label="接收用户" prop="targetUserIds">
					<el-select
						v-model="sendForm.targetUserIds"
						multiple
						filterable
						remote
						reserve-keyword
						placeholder="输入用户名、昵称或手机号检索"
						:remote-method="searchUsers"
						:loading="userSearchLoading"
						style="width: 100%"
					>
						<el-option v-for="item in userOptions" :key="item.id" :label="userOptionLabel(item)" :value="item.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="跳转地址">
					<el-input v-model="sendForm.linkUrl" placeholder="例如：/recharge" />
				</el-form-item>
				<el-form-item label="扩展数据">
					<el-input v-model="sendForm.payloadJson" type="textarea" :rows="3" placeholder='例如：{"source":"admin"}' />
				</el-form-item>
				<el-form-item label="通知内容" prop="content">
					<el-input v-model="sendForm.content" type="textarea" :rows="5" placeholder="请输入通知内容" maxlength="1000" show-word-limit />
				</el-form-item>
			</el-form>
			<template #footer>
				<span class="dialog-footer">
					<el-button @click="sendDialog.visible = false">取消</el-button>
					<el-button type="primary" :loading="sendDialog.loading" @click="submitNotice">发送</el-button>
				</span>
			</template>
		</el-dialog>

		<el-dialog title="投递记录" v-model="userDialog.visible" width="760px">
			<el-table :data="userDialog.list" style="width: 100%">
				<el-table-column label="用户ID" prop="userId" width="140" align="center" />
				<el-table-column label="用户名" prop="userName" min-width="150" />
				<el-table-column label="昵称" prop="nickname" min-width="150" />
				<el-table-column label="读取状态" prop="readStatus" width="110" align="center">
					<template #default="scope">
						<el-tag :type="scope.row.readStatus === 1 ? 'success' : 'warning'">{{ scope.row.readStatus === 1 ? '已读' : '未读' }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="读取时间" prop="readAt" width="170" align="center" />
				<el-table-column label="投递时间" prop="createdAt" width="170" align="center" />
			</el-table>
			<pagination
				v-show="userDialog.total > 0"
				:total="userDialog.total"
				v-model:page="userDialog.param.pageNum"
				v-model:limit="userDialog.param.pageSize"
				@pagination="loadUserRecords"
			/>
		</el-dialog>
	</div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, ref, toRefs } from 'vue';
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus';
import { deleteNotice, getNoticeList, getNoticeUserList, sendNotice } from '/@/api/system/notice';
import { getUserList } from '/@/api/system/user';

interface NoticeRow {
	id: number;
	title: string;
	content: string;
	noticeType: string;
	targetType: string;
	linkUrl: string;
	status: number;
	createdAt: string;
}

export default defineComponent({
	name: 'systemNotice',
	setup() {
		const queryRef = ref<FormInstance>();
		const sendFormRef = ref<FormInstance>();
		const userSearchLoading = ref(false);
		const userOptions = ref<any[]>([]);
		const noticeTypeOptions = [
			{ label: '系统通知', value: 'system' },
			{ label: '站内消息', value: 'message' },
			{ label: '任务通知', value: 'task' },
			{ label: '财务通知', value: 'finance' },
		];
		const state = reactive({
			ids: [] as Array<number | string>,
			tableData: {
				data: [] as NoticeRow[],
				total: 0,
				loading: false,
				param: {
					pageNum: 1,
					pageSize: 10,
					title: '',
					noticeType: '',
					targetType: '',
					status: '',
				},
			},
			sendDialog: {
				visible: false,
				loading: false,
			},
			sendForm: {
				title: '',
				content: '',
				noticeType: 'system',
				targetType: 'all',
				targetUserIds: [] as Array<number | string>,
				linkUrl: '',
				payloadJson: '{}',
			},
			userDialog: {
				visible: false,
				noticeId: 0,
				list: [] as any[],
				total: 0,
				param: {
					pageNum: 1,
					pageSize: 10,
				},
			},
		});

		const sendRules = {
			title: [{ required: true, message: '请输入通知标题', trigger: 'blur' }],
			content: [{ required: true, message: '请输入通知内容', trigger: 'blur' }],
			noticeType: [{ required: true, message: '请选择通知类型', trigger: 'change' }],
			targetType: [{ required: true, message: '请选择发送范围', trigger: 'change' }],
			targetUserIds: [
				{
					validator: (_rule: any, value: Array<number | string>, callback: Function) => {
						if (state.sendForm.targetType === 'user' && (!value || value.length === 0)) {
							callback(new Error('请选择接收用户'));
							return;
						}
						callback();
					},
					trigger: 'change',
				},
			],
		};

		const dataList = () => {
			getNoticeList(state.tableData.param).then((res: any) => {
				state.tableData.data = res.data.list || [];
				state.tableData.total = res.data.total || 0;
			});
		};

		const resetQuery = () => {
			queryRef.value?.resetFields();
			state.tableData.param.pageNum = 1;
			dataList();
		};

		const handleSelectionChange = (selection: NoticeRow[]) => {
			state.ids = selection.map((item) => item.id);
		};

		const noticeTypeLabel = (value: string) => {
			return noticeTypeOptions.find((item) => item.value === value)?.label || value || '-';
		};

		const openSendDialog = () => {
			state.sendForm.title = '';
			state.sendForm.content = '';
			state.sendForm.noticeType = 'system';
			state.sendForm.targetType = 'all';
			state.sendForm.targetUserIds = [];
			state.sendForm.linkUrl = '';
			state.sendForm.payloadJson = '{}';
			userOptions.value = [];
			state.sendDialog.visible = true;
		};

		const searchUsers = (query: string) => {
			const keyWords = query.trim();
			if (!keyWords) {
				userOptions.value = [];
				return;
			}
			userSearchLoading.value = true;
			getUserList({ pageNum: 1, pageSize: 20, keyWords })
				.then((res: any) => {
					userOptions.value = res.data.userList || [];
				})
				.finally(() => {
					userSearchLoading.value = false;
				});
		};

		const userOptionLabel = (item: any) => {
			return `${item.userName || '-'} / ${item.userNickname || '-'} / ${item.mobile || '-'}`;
		};

		const submitNotice = () => {
			sendFormRef.value?.validate((valid) => {
				if (!valid) return;
				try {
					JSON.parse(state.sendForm.payloadJson || '{}');
				} catch {
					ElMessage.error('扩展数据必须是合法JSON');
					return;
				}
				state.sendDialog.loading = true;
				sendNotice(state.sendForm)
					.then(() => {
						ElMessage.success('发送成功');
						state.sendDialog.visible = false;
						dataList();
					})
					.finally(() => {
						state.sendDialog.loading = false;
					});
			});
		};

		const onRowDel = (row: NoticeRow | null) => {
			const ids = row ? [row.id] : state.ids;
			if (ids.length === 0) {
				ElMessage.error('请选择要删除的数据。');
				return;
			}
			ElMessageBox.confirm(row ? `确认删除通知“${row.title}”？` : '确认删除所选通知？', '提示', {
				confirmButtonText: '确认',
				cancelButtonText: '取消',
				type: 'warning',
			}).then(() => {
				deleteNotice(ids).then(() => {
					ElMessage.success('删除成功');
					dataList();
				});
			});
		};

		const openUserList = (row: NoticeRow) => {
			state.userDialog.noticeId = row.id;
			state.userDialog.param.pageNum = 1;
			state.userDialog.visible = true;
			loadUserRecords();
		};

		const loadUserRecords = () => {
			getNoticeUserList({
				noticeId: state.userDialog.noticeId,
				...state.userDialog.param,
			}).then((res: any) => {
				state.userDialog.list = res.data.list || [];
				state.userDialog.total = res.data.total || 0;
			});
		};

		onMounted(() => {
			dataList();
		});

		return {
			queryRef,
			sendFormRef,
			noticeTypeOptions,
			noticeTypeLabel,
			userSearchLoading,
			userOptions,
			userOptionLabel,
			sendRules,
			dataList,
			resetQuery,
			handleSelectionChange,
			openSendDialog,
			searchUsers,
			submitNotice,
			onRowDel,
			openUserList,
			loadUserRecords,
			...toRefs(state),
		};
	},
});
</script>
