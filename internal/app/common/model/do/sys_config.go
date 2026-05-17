package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// SysConfig is the golang structure of table sys_config for DAO operations like Where/Data.
type SysConfig struct {
	g.Meta          `orm:"table:sys_config, do:true"`
	ConfigId        interface{}
	ConfigName      interface{}
	ConfigKey       interface{}
	ConfigValue     interface{}
	ConfigType      interface{}
	ConfigValueType interface{}
	ConfigOptions   interface{}
	CreateBy        interface{}
	UpdateBy        interface{}
	Remark          interface{}
	CreatedAt       *gtime.Time
	UpdatedAt       *gtime.Time
}
