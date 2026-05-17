/*
* @desc:鐧诲綍
* @company:浜戝崡濂囪绉戞妧鏈夐檺鍏徃
* @Author: yixiaohu
* @Date:   2022/4/27 21:51
 */

package system

import (
	"github.com/gogf/gf/v2/frame/g"
	commonApi "github.com/tiger1103/gfast/v3/api/v1/common"
	"github.com/tiger1103/gfast/v3/internal/app/system/model"
)

type UserLoginReq struct {
	g.Meta     `path:"/login" tags:"鐧诲綍" method:"post" summary:"鐢ㄦ埛鐧诲綍"`
	Username   string `p:"username" v:"required#鐢ㄦ埛鍚嶄笉鑳戒负绌?`
	Password   string `p:"password" v:"required#瀵嗙爜涓嶈兘涓虹┖"`
	VerifyCode string `p:"verifyCode" v:"required#楠岃瘉鐮佷笉鑳戒负绌?`
	VerifyKey  string `p:"verifyKey"`
	GoogleCode string `p:"googleCode"`
}

type UserLoginRes struct {
	g.Meta      `mime:"application/json"`
	UserInfo    *model.LoginUserRes `json:"userInfo"`
	Token       string              `json:"token"`
	MenuList    []*model.UserMenus  `json:"menuList"`
	Permissions []string            `json:"permissions"`
}

type UserLoginOutReq struct {
	g.Meta `path:"/logout" tags:"鐧诲綍" method:"get" summary:"閫€鍑虹櫥褰?`
	commonApi.Author
}

type UserLoginOutRes struct {
}
