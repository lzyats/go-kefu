package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// SysConfigDao is the data access object for table sys_config.
type SysConfigDao struct {
	table   string
	group   string
	columns SysConfigColumns
}

// SysConfigColumns defines and stores column names for table sys_config.
type SysConfigColumns struct {
	ConfigId        string
	ConfigName      string
	ConfigKey       string
	ConfigValue     string
	ConfigType      string
	ConfigValueType string
	ConfigOptions   string
	CreateBy        string
	UpdateBy        string
	Remark          string
	CreatedAt       string
	UpdatedAt       string
}

var sysConfigColumns = SysConfigColumns{
	ConfigId:        "config_id",
	ConfigName:      "config_name",
	ConfigKey:       "config_key",
	ConfigValue:     "config_value",
	ConfigType:      "config_type",
	ConfigValueType: "config_value_type",
	ConfigOptions:   "config_options",
	CreateBy:        "create_by",
	UpdateBy:        "update_by",
	Remark:          "remark",
	CreatedAt:       "created_at",
	UpdatedAt:       "updated_at",
}

func NewSysConfigDao() *SysConfigDao {
	return &SysConfigDao{
		group:   "default",
		table:   "sys_config",
		columns: sysConfigColumns,
	}
}

func (dao *SysConfigDao) DB() gdb.DB {
	return g.DB(dao.group)
}

func (dao *SysConfigDao) Table() string {
	return dao.table
}

func (dao *SysConfigDao) Columns() SysConfigColumns {
	return dao.columns
}

func (dao *SysConfigDao) Group() string {
	return dao.group
}

func (dao *SysConfigDao) Ctx(ctx context.Context) *gdb.Model {
	return dao.DB().Model(dao.table).Safe().Ctx(ctx)
}

func (dao *SysConfigDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}
