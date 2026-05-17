<template>
	<div class="system-edit-config-container">
		<el-dialog :title="`${ruleForm.configId !== 0 ? '修改' : '新增'}参数`" v-model="isShowDialog" width="860px">
			<el-form :model="ruleForm" ref="formRef" :rules="rules" size="default" label-width="110px">
				<el-form-item label="参数名称" prop="configName">
					<el-input v-model="ruleForm.configName" placeholder="请输入参数名称" />
				</el-form-item>

				<el-form-item label="参数键名" prop="configKey">
					<el-input v-model="ruleForm.configKey" placeholder="请输入参数键名" />
				</el-form-item>

				<el-form-item label="参数类型" prop="configValueType">
					<el-select v-model="ruleForm.configValueType" class="w100" @change="handleValueTypeChange">
						<el-option v-for="item in valueTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
					</el-select>
				</el-form-item>

				<el-form-item label="参数值" prop="configValue">
					<el-input
						v-if="ruleForm.configValueType === 1"
						v-model="ruleForm.configValue"
						placeholder="请输入参数值"
					/>

					<el-switch
						v-else-if="ruleForm.configValueType === 2"
						v-model="ruleForm.configValue"
						inline-prompt
						active-text="开"
						inactive-text="关"
						active-value="1"
						inactive-value="0"
					/>

					<div v-else-if="ruleForm.configValueType === 3" class="type-block">
						<el-upload
							action="/api/v1/system/upload/singleImg"
							:show-file-list="false"
							:data="uploadData"
							:headers="uploadHeaders"
							:on-success="handleUploadSuccess"
						>
							<el-button type="primary">上传文件</el-button>
						</el-upload>
						<el-input v-model="ruleForm.configValue" placeholder="上传后会自动回填文件地址，也可手动填写" />
						<el-link v-if="ruleForm.configValue" :href="filePreviewUrl" target="_blank" type="primary">
							查看当前文件
						</el-link>
					</div>

					<div v-else-if="ruleForm.configValueType === 4" class="type-block">
						<el-select v-model="ruleForm.configValue" class="w100" placeholder="请选择默认值">
							<el-option
								v-for="(item, index) in selectOptions"
								:key="`${item.value}-${index}`"
								:label="item.label"
								:value="item.value"
							/>
						</el-select>
						<div class="option-list">
							<div v-for="(item, index) in selectOptions" :key="index" class="option-row">
								<el-input v-model="item.label" placeholder="选项名称" />
								<el-input v-model="item.value" placeholder="选项值" />
								<el-button :icon="Delete" circle @click="removeSelectOption(index)" :disabled="selectOptions.length === 1" />
							</div>
							<el-button type="primary" plain :icon="Plus" @click="addSelectOption">添加选项</el-button>
						</div>
					</div>

					<div v-else class="type-block">
						<el-input-number
							v-model="numberValue"
							class="w100"
							:step="numberOptions.step"
							:min="numberOptions.min"
							:max="numberOptions.max"
							@change="syncNumberValue"
						/>
						<div class="number-grid">
							<el-input-number v-model="numberOptions.min" class="w100" :step="1" />
							<el-input-number v-model="numberOptions.max" class="w100" :step="1" />
							<el-input-number v-model="numberOptions.step" class="w100" :step="1" :min="1" />
						</div>
					</div>
				</el-form-item>

				<el-form-item label="系统内置" prop="configType">
					<el-radio-group v-model="ruleForm.configType">
						<el-radio v-for="dict in sysYesNoOptions" :key="dict.value" :label="String(dict.value)">
							{{ dict.label }}
						</el-radio>
					</el-radio-group>
				</el-form-item>

				<el-form-item label="备注" prop="remark">
					<el-input v-model="ruleForm.remark" type="textarea" :rows="3" placeholder="请输入备注" />
				</el-form-item>
			</el-form>

			<template #footer>
				<span class="dialog-footer">
					<el-button @click="onCancel" size="default">取消</el-button>
					<el-button type="primary" @click="onSubmit" size="default">{{ ruleForm.configId !== 0 ? '保存修改' : '创建参数' }}</el-button>
				</span>
			</template>
		</el-dialog>
	</div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, ref, toRefs, unref } from 'vue';
import { ElMessage } from 'element-plus';
import { Delete, Plus } from '@element-plus/icons-vue';
import { addConfig, editConfig, getConfig } from '/@/api/system/config';
import { getToken, getUpFileUrl } from '/@/utils/gfast';

interface SelectOption {
	label: string;
	value: string;
}

interface NumberOptionsState {
	min?: number;
	max?: number;
	step: number;
}

interface RuleFormState {
	configId: number;
	configName: string;
	configKey: string;
	configValue: string;
	configType: string;
	configValueType: number;
	configOptions: string;
	remark: string;
}

interface EditConfigState {
	isShowDialog: boolean;
	ruleForm: RuleFormState;
	rules: Record<string, any>;
	selectOptions: SelectOption[];
	numberOptions: NumberOptionsState;
	numberValue?: number;
}

const defaultNumberOptions = (): NumberOptionsState => ({
	min: undefined,
	max: undefined,
	step: 1,
});

export default defineComponent({
	name: 'systemEditConfig',
	components: { Delete, Plus },
	props: {
		sysYesNoOptions: {
			type: Array,
			default: () => [],
		},
	},
	setup(prop, { emit }) {
		const formRef = ref<HTMLElement | null>(null);
		const uploadData = reactive({
			token: getToken(),
		});
		const uploadHeaders = reactive({
			Authorization: `Bearer ${getToken()}`,
		});
		const valueTypeOptions = [
			{ label: '文本', value: 1 },
			{ label: '开关', value: 2 },
			{ label: '上传', value: 3 },
			{ label: '下拉选择', value: 4 },
			{ label: '数值', value: 5 },
		];

		const state = reactive<EditConfigState>({
			isShowDialog: false,
			ruleForm: {
				configId: 0,
				configName: '',
				configKey: '',
				configValue: '',
				configType: '0',
				configValueType: 1,
				configOptions: '',
				remark: '',
			},
			rules: {
				configName: [{ required: true, message: '参数名称不能为空', trigger: 'blur' }],
				configKey: [{ required: true, message: '参数键名不能为空', trigger: 'blur' }],
				configValue: [{ required: true, message: '参数值不能为空', trigger: 'blur' }],
			},
			selectOptions: [{ label: '', value: '' }],
			numberOptions: defaultNumberOptions(),
			numberValue: undefined,
		});

		const filePreviewUrl = computed(() => getUpFileUrl(state.ruleForm.configValue));

		const resetForm = () => {
			state.ruleForm = {
				configId: 0,
				configName: '',
				configKey: '',
				configValue: '',
				configType: '0',
				configValueType: 1,
				configOptions: '',
				remark: '',
			};
			state.selectOptions = [{ label: '', value: '' }];
			state.numberOptions = defaultNumberOptions();
			state.numberValue = undefined;
		};

		const parseJSON = (raw?: string) => {
			if (!raw) return {};
			try {
				return JSON.parse(raw);
			} catch (e) {
				return {};
			}
		};

		const loadTypeOptions = (data: RuleFormState) => {
			const extra = parseJSON(data.configOptions);
			if (data.configValueType === 4) {
				const options = Array.isArray((extra as any).options) ? (extra as any).options : [];
				state.selectOptions = options.length > 0 ? options : [{ label: '', value: '' }];
			} else if (data.configValueType === 5) {
				state.numberOptions = {
					...defaultNumberOptions(),
					...(extra as any),
				};
				const num = Number(data.configValue);
				state.numberValue = Number.isFinite(num) ? num : undefined;
			}
		};

		const openDialog = (row?: RuleFormState | null) => {
			resetForm();
			if (row && row.configId) {
				getConfig(row.configId).then((res: any) => {
					const data = res.data.data || row;
					state.ruleForm = {
						configId: data.configId || 0,
						configName: data.configName || '',
						configKey: data.configKey || '',
						configValue: String(data.configValue ?? ''),
						configType: String(data.configType ?? '0'),
						configValueType: Number(data.configValueType || 1),
						configOptions: data.configOptions || '',
						remark: data.remark || '',
					};
					loadTypeOptions(state.ruleForm);
				});
			}
			state.isShowDialog = true;
		};

		const closeDialog = () => {
			state.isShowDialog = false;
		};

		const onCancel = () => {
			closeDialog();
		};

		const addSelectOption = () => {
			state.selectOptions.push({ label: '', value: '' });
		};

		const removeSelectOption = (index: number) => {
			state.selectOptions.splice(index, 1);
		};

		const handleValueTypeChange = (value: number) => {
			state.ruleForm.configOptions = '';
			if (value === 2) {
				state.ruleForm.configValue = state.ruleForm.configValue === '1' ? '1' : '0';
			} else if (value === 3) {
				state.ruleForm.configValue = '';
			} else if (value === 4) {
				state.ruleForm.configValue = '';
				state.selectOptions = [{ label: '', value: '' }];
			} else if (value === 5) {
				state.numberOptions = defaultNumberOptions();
				state.numberValue = undefined;
				state.ruleForm.configValue = '';
			} else {
				state.ruleForm.configValue = '';
			}
		};

		const syncNumberValue = () => {
			state.ruleForm.configValue = state.numberValue === undefined || state.numberValue === null ? '' : String(state.numberValue);
		};

		const buildConfigOptions = () => {
			if (state.ruleForm.configValueType === 4) {
				return JSON.stringify({
					options: state.selectOptions.filter((item) => item.label && item.value),
				});
			}
			if (state.ruleForm.configValueType === 5) {
				return JSON.stringify(state.numberOptions);
			}
			return '';
		};

		const validateDynamicFields = () => {
			if (state.ruleForm.configValueType === 4) {
				const options = state.selectOptions.filter((item) => item.label && item.value);
				if (options.length === 0) {
					ElMessage.warning('请至少配置一个下拉选项');
					return false;
				}
				if (!state.ruleForm.configValue) {
					state.ruleForm.configValue = options[0].value;
				}
			}
			if (state.ruleForm.configValueType === 5) {
				syncNumberValue();
				if (state.ruleForm.configValue === '') {
					ElMessage.warning('请输入数值参数');
					return false;
				}
			}
			if (state.ruleForm.configValueType === 3 && !state.ruleForm.configValue) {
				ElMessage.warning('请先上传文件或填写文件地址');
				return false;
			}
			return true;
		};

		const handleUploadSuccess = (response: any) => {
			const uploadedValue = response?.data?.url || response?.data?.path || '';
			if (response?.code === 0 && uploadedValue) {
				state.ruleForm.configValue = uploadedValue;
				ElMessage.success('文件上传成功');
				return;
			}
			ElMessage.error(response?.msg || response?.message || '文件上传失败');
		};

		const onSubmit = () => {
			const formWrap = unref(formRef) as any;
			if (!formWrap) return;
			formWrap.validate((valid: boolean) => {
				if (!valid || !validateDynamicFields()) return;
				const payload = {
					...state.ruleForm,
					configType: Number(state.ruleForm.configType),
					configOptions: buildConfigOptions(),
				};
				if (state.ruleForm.configId !== 0) {
					editConfig(payload).then(() => {
						ElMessage.success('参数修改成功');
						closeDialog();
						emit('dataList');
					});
				} else {
					addConfig(payload).then(() => {
						ElMessage.success('参数添加成功');
						closeDialog();
						emit('dataList');
					});
				}
			});
		};

		return {
			...toRefs(state),
			formRef,
			uploadData,
			uploadHeaders,
			valueTypeOptions,
			filePreviewUrl,
			addSelectOption,
			removeSelectOption,
			handleValueTypeChange,
			handleUploadSuccess,
			onCancel,
			onSubmit,
			openDialog,
			closeDialog,
			syncNumberValue,
			Delete,
			Plus,
		};
	},
});
</script>

<style scoped lang="scss">
.type-block {
	display: flex;
	width: 100%;
	flex-direction: column;
	gap: 12px;
}

.option-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.option-row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 40px;
	gap: 10px;
	align-items: center;
}

.number-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}
</style>
