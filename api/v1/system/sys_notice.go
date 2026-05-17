package system

import (
	"github.com/gogf/gf/v2/frame/g"
	commonApi "github.com/tiger1103/gfast/v3/api/v1/common"
)

type NoticeMessage struct {
	Id          uint64 `json:"id"`
	Title       string `json:"title"`
	Content     string `json:"content"`
	NoticeType  string `json:"noticeType"`
	TargetType  string `json:"targetType"`
	TargetValue string `json:"targetValue"`
	LinkUrl     string `json:"linkUrl"`
	PayloadJson string `json:"payloadJson"`
	Status      int    `json:"status"`
	CreatedAt   string `json:"createdAt"`
}

type NoticeUserRecord struct {
	Id         uint64 `json:"id"`
	NoticeId   uint64 `json:"noticeId"`
	UserId     uint64 `json:"userId"`
	UserName   string `json:"userName"`
	Nickname   string `json:"nickname"`
	ReadStatus int    `json:"readStatus"`
	ReadAt     string `json:"readAt"`
	CreatedAt  string `json:"createdAt"`
}

type NoticeListReq struct {
	g.Meta     `path:"/notice/list" tags:"通知管理" method:"get" summary:"通知列表"`
	Title      string `p:"title"`
	NoticeType string `p:"noticeType"`
	TargetType string `p:"targetType"`
	Status     string `p:"status"`
	commonApi.PageReq
}

type NoticeListRes struct {
	g.Meta `mime:"application/json"`
	List   []*NoticeMessage `json:"list"`
	commonApi.ListRes
}

type NoticeSendReq struct {
	g.Meta        `path:"/notice/send" tags:"通知管理" method:"post" summary:"发送通知"`
	Title         string   `p:"title" v:"required#通知标题不能为空"`
	Content       string   `p:"content" v:"required#通知内容不能为空"`
	NoticeType    string   `p:"noticeType"`
	TargetType    string   `p:"targetType" v:"required|in:all,user#发送范围不能为空|发送范围不正确"`
	TargetUserIds []uint64 `p:"targetUserIds"`
	LinkUrl       string   `p:"linkUrl"`
	PayloadJson   string   `p:"payloadJson"`
}

type NoticeSendRes struct{}

type NoticeDeleteReq struct {
	g.Meta `path:"/notice/delete" tags:"通知管理" method:"delete" summary:"删除通知"`
	Ids    []uint64 `p:"ids"`
}

type NoticeDeleteRes struct{}

type NoticeUserListReq struct {
	g.Meta   `path:"/notice/user-list" tags:"通知管理" method:"get" summary:"通知投递记录"`
	NoticeId uint64 `p:"noticeId" v:"required#通知ID不能为空"`
	commonApi.PageReq
}

type NoticeUserListRes struct {
	g.Meta `mime:"application/json"`
	List   []*NoticeUserRecord `json:"list"`
	commonApi.ListRes
}

type NoticeWsReq struct {
	g.Meta `path:"/notice/ws" tags:"通知管理" method:"get" summary:"通知WebSocket"`
	Token  string `p:"token"`
}

type NoticeWsRes struct{}

type NoticeMyUnreadReq struct {
	g.Meta `path:"/notice/my-unread" tags:"通知管理" method:"get" summary:"我的未读通知数"`
	commonApi.Author
}

type NoticeMyUnreadRes struct {
	g.Meta `mime:"application/json"`
	Count  int `json:"count"`
}

type NoticeMyItem struct {
	Id          uint64 `json:"id"`
	NoticeId    uint64 `json:"noticeId"`
	Title       string `json:"title"`
	Content     string `json:"content"`
	NoticeType  string `json:"noticeType"`
	LinkUrl     string `json:"linkUrl"`
	PayloadJson string `json:"payloadJson"`
	ReadStatus  int    `json:"readStatus"`
	ReadAt      string `json:"readAt"`
	CreatedAt   string `json:"createdAt"`
}

type NoticeMyListReq struct {
	g.Meta     `path:"/notice/my-list" tags:"通知管理" method:"get" summary:"我的站内通知列表"`
	ReadStatus string `p:"readStatus"`
	commonApi.Author
	commonApi.PageReq
}

type NoticeMyListRes struct {
	g.Meta `mime:"application/json"`
	List   []*NoticeMyItem `json:"list"`
	commonApi.ListRes
}

type NoticeMyReadReq struct {
	g.Meta `path:"/notice/my-read" tags:"通知管理" method:"post" summary:"标记我的通知已读"`
	Ids    []uint64 `p:"ids" v:"required#通知ID不能为空"`
	commonApi.Author
}

type NoticeMyReadRes struct {
	g.Meta `mime:"application/json"`
	Count  int `json:"count"`
}

type NoticeMyAllReadReq struct {
	g.Meta `path:"/notice/my-all-read" tags:"通知管理" method:"post" summary:"全部标记已读"`
	commonApi.Author
}

type NoticeMyAllReadRes struct {
	g.Meta `mime:"application/json"`
	Count  int `json:"count"`
}
