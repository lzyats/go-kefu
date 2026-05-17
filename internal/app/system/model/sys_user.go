/*
* @desc:閻劍鍩涘Ο鈥崇€风€电钖?* @company:娴滄垵宕℃總鍥唵缁夋垶濡ч張澶愭閸忣剙寰?* @Author: yixiaohu
* @Date:   2022/3/7 11:47
 */

package model

import (
	"github.com/gogf/gf/v2/util/gmeta"
	"github.com/tiger1103/gfast/v3/internal/app/system/model/entity"
)

// LoginUserRes 閻ц缍嶆潻鏂挎礀
type LoginUserRes struct {
	Id           uint64 `orm:"id,primary"       json:"id"`
	UserName     string `orm:"user_name,unique" json:"userName"`
	UserNickname string `orm:"user_nickname"    json:"userNickname"`
	UserPassword string `orm:"user_password"    json:"userPassword"`
	UserSalt     string `orm:"user_salt"        json:"userSalt"`
	UserStatus   uint   `orm:"user_status"      json:"userStatus"`
	IsAdmin      int    `orm:"is_admin"         json:"isAdmin"`
	Avatar       string `orm:"avatar"           json:"avatar"`
	GoogleSecret string `orm:"google_secret"    json:"-"`
	GoogleStatus int    `orm:"google_status"    json:"googleStatus"`
	DeptId       uint64 `orm:"dept_id"          json:"deptId"`
}

// SysUserRoleDeptRes 鐢附婀侀柈銊╂，閵嗕浇顫楅懝灞傗偓浣哥煐娴ｅ秳淇婇幁顖滄畱閻劍鍩涢弫鐗堝祦
type SysUserRoleDeptRes struct {
	*entity.SysUser
	Dept     *entity.SysDept       `json:"dept"`
	RoleInfo []*SysUserRoleInfoRes `json:"roleInfo"`
	Post     []*SysUserPostInfoRes `json:"post"`
}

type SysUserRoleInfoRes struct {
	RoleId uint   `json:"roleId"`
	Name   string `json:"name"`
}

type SysUserPostInfoRes struct {
	PostId   int64  `json:"postId"`
	PostName string `json:"postName"`
}

type SysUserSimpleRes struct {
	gmeta.Meta   `orm:"table:sys_user"`
	Id           uint64 `orm:"id" json:"id"`
	Avatar       string `orm:"avatar" json:"avatar"`
	Sex          int    `orm:"sex" json:"sex"`
	UserName     string `orm:"user_name" json:"userName"`
	UserNickname string `orm:"user_nickname" json:"userNickname"`
}
