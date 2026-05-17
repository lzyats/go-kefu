package system

import (
	"github.com/gogf/gf/v2/frame/g"
	commonApi "github.com/tiger1103/gfast/v3/api/v1/common"
	commonEntity "github.com/tiger1103/gfast/v3/internal/app/common/model/entity"
)

type ConfigSearchReq struct {
	g.Meta     `path:"/config/list" tags:"系统参数管理" method:"get" summary:"系统参数列表"`
	ConfigName string `p:"configName"`
	ConfigKey  string `p:"configKey"`
	ConfigType string `p:"configType"`
	commonApi.PageReq
}

type ConfigSearchRes struct {
	g.Meta `mime:"application/json"`
	List   []*commonEntity.SysConfig `json:"list"`
	commonApi.ListRes
}

type ConfigReq struct {
	ConfigName      string `p:"configName" v:"required#参数名称不能为空"`
	ConfigKey       string `p:"configKey" v:"required#参数键名不能为空"`
	ConfigValue     string `p:"configValue" v:"required#参数值不能为空"`
	ConfigType      int    `p:"configType" v:"required|in:0,1#系统内置不能为空|系统内置只能为0或1"`
	ConfigValueType int    `p:"configValueType" v:"required|in:1,2,3,4,5#参数类型不能为空|参数类型不正确"`
	ConfigOptions   string `p:"configOptions"`
	Remark          string `p:"remark"`
}

type ConfigAddReq struct {
	g.Meta `path:"/config/add" tags:"系统参数管理" method:"post" summary:"添加系统参数"`
	*ConfigReq
}

type ConfigAddRes struct{}

type ConfigGetReq struct {
	g.Meta `path:"/config/get" tags:"系统参数管理" method:"get" summary:"获取系统参数"`
	Id     int `p:"id"`
}

type ConfigGetRes struct {
	g.Meta `mime:"application/json"`
	Data   *commonEntity.SysConfig `json:"data"`
}

type ConfigEditReq struct {
	g.Meta   `path:"/config/edit" tags:"系统参数管理" method:"put" summary:"修改系统参数"`
	ConfigId int64 `p:"configId" v:"required|min:1#主键ID不能为空|主键ID参数错误"`
	*ConfigReq
}

type ConfigEditRes struct{}

type ConfigDeleteReq struct {
	g.Meta `path:"/config/delete" tags:"系统参数管理" method:"delete" summary:"删除系统参数"`
	Ids    []int `p:"ids"`
}

type ConfigDeleteRes struct{}
