<template>
	<div class="system-config-container">
		<el-card shadow="hover">
			<div class="system-config-search mb15">
				<el-form :model="tableData.param" ref="queryRef" :inline="true" label-width="68px">
					<el-form-item label="参数名称" prop="configName">
						<el-input
							v-model="tableData.param.configName"
							placeholder="请输入参数名称"
							clearable
							size="default"
							@keyup.enter.native="dataList"
						/>
					</el-form-item>

					<el-form-item label="参数键名" prop="configKey">
						<el-input
							v-model="tableData.param.configKey"
							placeholder="请输入参数键名"
							clearable
							size="default"
							@keyup.enter.native="dataList"
						/>
					</el-form-item>

					<el-form-item label="系统内置" prop="configType" style="width: 200px">
						<el-select v-model="tableData.param.configType" placeholder="系统内置" clearable size="default" style="width: 240px">
							<el-option v-for="dict in sys_yes_no" :key="dict.value" :label="dict.label" :value="dict.value" />
						</el-select>
					</el-form-item>

					<el-form-item label="创建时间" prop="dateRange">
						<el-date-picker
							v-model="tableData.param.dateRange"
							size="default"
							style="width: 240px"
							value-format="YYYY-MM-DD"
							type="daterange"
							range-separator="-"
							start-placeholder="开始日期"
							end-placeholder="结束日期"
						/>
					</el-form-item>

					<el-form-item>
						<el-button size="default" type="primary" class="ml10" @click="dataList">
							<el-icon><ele-Search /></el-icon>
							查询
						</el-button>
						<el-button size="default" @click="resetQuery(queryRef)">
							<el-icon><ele-Refresh /></el-icon>
							重置
						</el-button>
						<el-button size="default" type="success" class="ml10" @click="onOpenAddConfig">
							<el-icon><ele-FolderAdd /></el-icon>
							新增参数
						</el-button>
						<el-button size="default" type="danger" class="ml10" @click="onRowDel(null)">
							<el-icon><ele-Delete /></el-icon>
							删除参数
						</el-button>
					</el-form-item>
				</el-form>
			</div>

			<el-table :data="tableData.data" style="width: 100%" @selection-change="handleSelectionChange">
				<el-table-column type="selection" width="55" align="center" />
				<el-table-column label="参数主键" align="center" prop="configId" width="100" />
				<el-table-column label="参数名称" align="center" prop="configName" min-width="180" :show-overflow-tooltip="true" />
				<el-table-column label="参数键名" align="center" prop="configKey" min-width="220" :show-overflow-tooltip="true" />
				<el-table-column label="参数类型" align="center" prop="configValueType" width="120">
					<template #default="scope">
						<el-tag>{{ valueTypeLabel(scope.row.configValueType) }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="参数值" align="center" min-width="240" :show-overflow-tooltip="true">
					<template #default="scope">
						{{ formatConfigValue(scope.row) }}
					</template>
				</el-table-column>
				<el-table-column label="系统内置" align="center" prop="configType" width="100" :formatter="typeFormat" />
				<el-table-column label="备注" align="center" prop="remark" min-width="200" :show-overflow-tooltip="true" />
				<el-table-column label="创建时间" align="center" prop="createdAt" width="180" />
				<el-table-column label="操作" width="160" fixed="right">
					<template #default="scope">
						<el-button size="small" text type="primary" @click="onOpenEditConfig(scope.row)">修改</el-button>
						<el-button size="small" text type="danger" @click="onRowDel(scope.row)">删除</el-button>
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

		<EditConfig ref="editConfigRef" @dataList="dataList" :sysYesNoOptions="sys_yes_no" />
	</div>
</template>

<script lang="ts">
import { defineComponent, getCurrentInstance, onMounted, reactive, ref, toRefs, unref } from 'vue';
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus';
import EditConfig from '/@/views/system/config/component/editConfig.vue';
import { deleteConfig, getConfigList } from '/@/api/system/config';

interface TableDataRow {
	configId: number;
	configName: string;
	configKey: string;
	configValue: string;
	configType: number;
	configValueType: number;
	configOptions?: string;
	remark: string;
	createdAt: string;
}

interface TableDataState {
	ids: number[];
	tableData: {
		data: Array<TableDataRow>;
		total: number;
		loading: boolean;
		param: {
			pageNum: number;
			pageSize: number;
			configName: string;
			configKey: string;
			configType: string;
			dateRange: string[];
		};
	};
}

export default defineComponent({
	name: 'systemConfigList',
	components: { EditConfig },
	setup() {
		const { proxy } = getCurrentInstance() as any;
		const editConfigRef = ref();
		const queryRef = ref();
		const { sys_yes_no } = proxy.useDict('sys_yes_no');
		const state = reactive<TableDataState>({
			ids: [],
			tableData: {
				data: [],
				total: 0,
				loading: false,
				param: {
					dateRange: [],
					pageNum: 1,
					pageSize: 10,
					configName: '',
					configKey: '',
					configType: '',
				},
			},
		});

		const valueTypeMap: Record<number, string> = {
			1: '文本',
			2: '开关',
			3: '上传',
			4: '下拉选择',
			5: '数值',
		};

		const dataList = () => {
			getConfigList(state.tableData.param).then((res: any) => {
				state.tableData.data = res.data.list || [];
				state.tableData.total = res.data.total || 0;
			});
		};

		const onOpenAddConfig = () => {
			editConfigRef.value.openDialog();
		};

		const onOpenEditConfig = (row: TableDataRow) => {
			editConfigRef.value.openDialog(row);
		};

		const onRowDel = (row: TableDataRow | null) => {
			let msg = '你确认要删除所选参数吗？';
			let ids: number[] = [];
			if (row) {
				msg = `此操作将永久删除参数“${row.configName}”，是否继续？`;
				ids = [row.configId];
			} else {
				ids = state.ids;
			}
			if (ids.length === 0) {
				ElMessage.error('请选择要删除的数据');
				return;
			}
			ElMessageBox.confirm(msg, '提示', {
				confirmButtonText: '确认',
				cancelButtonText: '取消',
				type: 'warning',
			})
				.then(() => {
					deleteConfig(ids).then(() => {
						ElMessage.success('删除成功');
						dataList();
					});
				})
				.catch(() => {});
		};

		const resetQuery = (formEl: FormInstance | undefined) => {
			if (!formEl) return;
			formEl.resetFields();
			dataList();
		};

		const handleSelectionChange = (selection: TableDataRow[]) => {
			state.ids = selection.map((item) => item.configId);
		};

		const typeFormat = (row: TableDataRow) => {
			return proxy.selectDictLabel(unref(sys_yes_no), row.configType);
		};

		const valueTypeLabel = (value: number) => valueTypeMap[value] || '文本';

		const formatConfigValue = (row: TableDataRow) => {
			if (row.configValueType === 2) {
				return row.configValue === '1' ? '开启' : '关闭';
			}
			if (row.configValueType === 3) {
				return row.configValue;
			}
			if (row.configValueType === 4) {
				try {
					const parsed = JSON.parse(row.configOptions || '{}');
					const options = Array.isArray(parsed.options) ? parsed.options : [];
					const matched = options.find((item: any) => item.value === row.configValue);
					return matched ? `${matched.label} (${matched.value})` : row.configValue;
				} catch (e) {
					return row.configValue;
				}
			}
			return row.configValue;
		};

		onMounted(() => {
			dataList();
		});

		return {
			...toRefs(state),
			editConfigRef,
			queryRef,
			sys_yes_no,
			dataList,
			onOpenAddConfig,
			onOpenEditConfig,
			onRowDel,
			resetQuery,
			handleSelectionChange,
			typeFormat,
			valueTypeLabel,
			formatConfigValue,
		};
	},
});
</script>
