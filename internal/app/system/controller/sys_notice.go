package controller

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"strings"
	"sync"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/net/ghttp"
	"github.com/gogf/gf/v2/os/gtime"
	"github.com/gogf/gf/v2/util/gconv"
	"github.com/tiger1103/gfast/v3/api/v1/system"
	"github.com/tiger1103/gfast/v3/internal/app/system/service"
)

var Notice = noticeController{}

type noticeController struct {
	BaseController
}

var systemNoticeHub = newSystemNoticeHub()

type systemNoticeHubType struct {
	mu    sync.RWMutex
	conns map[uint64]map[*ghttp.WebSocket]struct{}
}

func newSystemNoticeHub() *systemNoticeHubType {
	return &systemNoticeHubType{conns: make(map[uint64]map[*ghttp.WebSocket]struct{})}
}

func (h *systemNoticeHubType) add(userID uint64, ws *ghttp.WebSocket) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.conns[userID] == nil {
		h.conns[userID] = make(map[*ghttp.WebSocket]struct{})
	}
	h.conns[userID][ws] = struct{}{}
}

func (h *systemNoticeHubType) remove(userID uint64, ws *ghttp.WebSocket) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.conns[userID], ws)
	if len(h.conns[userID]) == 0 {
		delete(h.conns, userID)
	}
}

func (h *systemNoticeHubType) push(userID uint64, payload g.Map) {
	h.mu.RLock()
	conns := make([]*ghttp.WebSocket, 0, len(h.conns[userID]))
	for ws := range h.conns[userID] {
		conns = append(conns, ws)
	}
	h.mu.RUnlock()
	for _, ws := range conns {
		_ = ws.WriteJSON(payload)
	}
}

type noticeMessageRow struct {
	Id          uint64      `orm:"id"`
	Title       string      `orm:"title"`
	Content     string      `orm:"content"`
	NoticeType  string      `orm:"notice_type"`
	TargetType  string      `orm:"target_type"`
	TargetValue string      `orm:"target_value"`
	LinkUrl     string      `orm:"link_url"`
	PayloadJson string      `orm:"payload_json"`
	Status      int         `orm:"status"`
	CreatedAt   *gtime.Time `orm:"created_at"`
}

type noticeUserRow struct {
	Id         uint64      `orm:"id"`
	NoticeId   uint64      `orm:"notice_id"`
	UserId     uint64      `orm:"user_id"`
	UserName   string      `orm:"user_name"`
	Nickname   string      `orm:"user_nickname"`
	ReadStatus int         `orm:"read_status"`
	ReadAt     *gtime.Time `orm:"read_at"`
	CreatedAt  *gtime.Time `orm:"created_at"`
}

type myNoticeRow struct {
	Id          uint64      `orm:"id"`
	NoticeId    uint64      `orm:"notice_id"`
	Title       string      `orm:"title"`
	Content     string      `orm:"content"`
	NoticeType  string      `orm:"notice_type"`
	LinkUrl     string      `orm:"link_url"`
	PayloadJson string      `orm:"payload_json"`
	ReadStatus  int         `orm:"read_status"`
	ReadAt      *gtime.Time `orm:"read_at"`
	CreatedAt   *gtime.Time `orm:"created_at"`
}

func (c *noticeController) List(ctx context.Context, req *system.NoticeListReq) (res *system.NoticeListRes, err error) {
	res = &system.NoticeListRes{List: []*system.NoticeMessage{}}
	model := g.DB().Model("notice_message")
	if strings.TrimSpace(req.Title) != "" {
		model = model.WhereLike("title", "%"+strings.TrimSpace(req.Title)+"%")
	}
	if strings.TrimSpace(req.NoticeType) != "" {
		model = model.Where("notice_type", strings.TrimSpace(req.NoticeType))
	}
	if strings.TrimSpace(req.TargetType) != "" {
		model = model.Where("target_type", strings.TrimSpace(req.TargetType))
	}
	if strings.TrimSpace(req.Status) != "" {
		model = model.Where("status", gconv.Int(req.Status))
	}
	total, err := model.Count()
	if err != nil {
		return nil, err
	}
	pageNum := req.PageNum
	pageSize := req.PageSize
	if pageNum <= 0 {
		pageNum = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	rows := make([]*noticeMessageRow, 0)
	err = model.Fields("id,title,content,notice_type,target_type,target_value,link_url,CAST(payload_json AS CHAR) AS payload_json,status,created_at").
		OrderDesc("created_at").
		Page(pageNum, pageSize).
		Scan(&rows)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		res.List = append(res.List, toNoticeMessage(row))
	}
	res.Total = total
	res.CurrentPage = pageNum
	return
}

func (c *noticeController) Send(ctx context.Context, req *system.NoticeSendReq) (res *system.NoticeSendRes, err error) {
	res = &system.NoticeSendRes{}
	title := strings.TrimSpace(req.Title)
	content := strings.TrimSpace(req.Content)
	noticeType := strings.TrimSpace(req.NoticeType)
	if noticeType == "" {
		noticeType = "system"
	}
	payload := strings.TrimSpace(req.PayloadJson)
	if payload == "" {
		payload = "{}"
	}
	if !json.Valid([]byte(payload)) {
		return nil, gerror.New("扩展数据必须是合法JSON")
	}
	targetUserIds := req.TargetUserIds
	if req.TargetType == "all" {
		targetUserIds, err = activeUserIds(ctx)
		if err != nil {
			return nil, err
		}
	}
	if len(targetUserIds) == 0 {
		return nil, gerror.New("接收用户不能为空")
	}
	now := gtime.Now()
	noticeID, err := randomTableID(ctx, "notice_message")
	if err != nil {
		return nil, err
	}
	userNoticeIds := make(map[uint64]uint64, len(targetUserIds))
	err = g.DB().Transaction(ctx, func(ctx context.Context, tx gdb.TX) error {
		if _, err := g.DB().Model("notice_message").TX(tx).Insert(g.Map{
			"id":           noticeID,
			"title":        title,
			"content":      content,
			"notice_type":  noticeType,
			"target_type":  req.TargetType,
			"target_value": targetValue(req.TargetType, targetUserIds),
			"link_url":     strings.TrimSpace(req.LinkUrl),
			"payload_json": payload,
			"status":       1,
			"created_at":   now,
		}); err != nil {
			return err
		}
		for _, userID := range uniqueUint64(targetUserIds) {
			itemID, err := randomTableID(ctx, "notice_user")
			if err != nil {
				return err
			}
			if _, err := g.DB().Model("notice_user").TX(tx).Insert(g.Map{
				"id":          itemID,
				"notice_id":   noticeID,
				"user_id":     userID,
				"read_status": 0,
				"created_at":  now,
			}); err != nil {
				return err
			}
			userNoticeIds[userID] = itemID
		}
		return nil
	})
	if err != nil {
		return
	}
	for userID, userNoticeID := range userNoticeIds {
		unread, _ := g.DB().Model("notice_user").
			Where("user_id", userID).
			Where("read_status", 0).
			Where("deleted_at IS NULL").
			Count()
		systemNoticeHub.push(userID, g.Map{
			"type":  "notice",
			"event": "new",
			"data": g.Map{
				"id":           userNoticeID,
				"notice_id":    noticeID,
				"title":        title,
				"content":      content,
				"notice_type":  noticeType,
				"link_url":     strings.TrimSpace(req.LinkUrl),
				"payload_json": payload,
				"read_status":  0,
				"created_at":   formatSystemTime(now),
			},
			"meta": g.Map{"unread_count": unread},
		})
	}
	return
}

func (c *noticeController) Delete(ctx context.Context, req *system.NoticeDeleteReq) (res *system.NoticeDeleteRes, err error) {
	res = &system.NoticeDeleteRes{}
	if len(req.Ids) == 0 {
		return res, nil
	}
	err = g.DB().Transaction(ctx, func(ctx context.Context, tx gdb.TX) error {
		if _, err := g.DB().Model("notice_user").TX(tx).WhereIn("notice_id", req.Ids).Update(g.Map{"deleted_at": gtime.Now()}); err != nil {
			return err
		}
		_, err := g.DB().Model("notice_message").TX(tx).WhereIn("id", req.Ids).Update(g.Map{"status": 0})
		return err
	})
	return
}

func (c *noticeController) UserList(ctx context.Context, req *system.NoticeUserListReq) (res *system.NoticeUserListRes, err error) {
	res = &system.NoticeUserListRes{List: []*system.NoticeUserRecord{}}
	model := g.DB().Model("notice_user nu").
		LeftJoin("sys_user u", "u.id = nu.user_id").
		Where("nu.notice_id", req.NoticeId).
		Where("nu.deleted_at IS NULL")
	total, err := model.Count()
	if err != nil {
		return nil, err
	}
	pageNum := req.PageNum
	pageSize := req.PageSize
	if pageNum <= 0 {
		pageNum = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	rows := make([]*noticeUserRow, 0)
	err = model.Fields("nu.id,nu.notice_id,nu.user_id,u.user_name,u.user_nickname,nu.read_status,nu.read_at,nu.created_at").
		OrderDesc("nu.created_at").
		Page(pageNum, pageSize).
		Scan(&rows)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		res.List = append(res.List, &system.NoticeUserRecord{
			Id:         row.Id,
			NoticeId:   row.NoticeId,
			UserId:     row.UserId,
			UserName:   row.UserName,
			Nickname:   row.Nickname,
			ReadStatus: row.ReadStatus,
			ReadAt:     formatSystemTime(row.ReadAt),
			CreatedAt:  formatSystemTime(row.CreatedAt),
		})
	}
	res.Total = total
	res.CurrentPage = pageNum
	return
}

func (c *noticeController) Ws(ctx context.Context, req *system.NoticeWsReq) (res *system.NoticeWsRes, err error) {
	token := strings.TrimSpace(req.Token)
	if token == "" {
		token = service.GfToken().GetRequestToken(g.RequestFromCtx(ctx))
	}
	_, key, err := service.GfToken().GetTokenData(ctx, token)
	if err != nil {
		return nil, err
	}
	userID := gconv.Uint64(strings.Split(key, "-")[0])
	if userID == 0 {
		return nil, gerror.New("登录状态无效")
	}
	ws, err := g.RequestFromCtx(ctx).WebSocket()
	if err != nil {
		return nil, err
	}
	systemNoticeHub.add(userID, ws)
	defer systemNoticeHub.remove(userID, ws)
	_ = ws.WriteJSON(g.Map{"type": "notice", "event": "connected"})
	for {
		if _, _, err = ws.ReadMessage(); err != nil {
			return nil, nil
		}
	}
}

func (c *noticeController) MyUnread(ctx context.Context, req *system.NoticeMyUnreadReq) (res *system.NoticeMyUnreadRes, err error) {
	userID := service.Context().GetUserId(ctx)
	count, err := g.DB().Model("notice_user").
		Where("user_id", userID).
		Where("read_status", 0).
		Where("deleted_at IS NULL").
		Count()
	if err != nil {
		return nil, err
	}
	return &system.NoticeMyUnreadRes{Count: count}, nil
}

func (c *noticeController) MyList(ctx context.Context, req *system.NoticeMyListReq) (res *system.NoticeMyListRes, err error) {
	res = &system.NoticeMyListRes{List: []*system.NoticeMyItem{}}
	userID := service.Context().GetUserId(ctx)
	model := g.DB().Model("notice_user nu").
		LeftJoin("notice_message nm", "nm.id = nu.notice_id").
		Where("nu.user_id", userID).
		Where("nu.deleted_at IS NULL").
		Where("nm.status", 1)
	if strings.TrimSpace(req.ReadStatus) != "" {
		model = model.Where("nu.read_status", gconv.Int(req.ReadStatus))
	}
	total, err := model.Count()
	if err != nil {
		return nil, err
	}
	pageNum := req.PageNum
	pageSize := req.PageSize
	if pageNum <= 0 {
		pageNum = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	rows := make([]*myNoticeRow, 0)
	err = model.Fields("nu.id,nu.notice_id,nm.title,nm.content,nm.notice_type,nm.link_url,CAST(nm.payload_json AS CHAR) AS payload_json,nu.read_status,nu.read_at,nu.created_at").
		OrderDesc("nu.created_at").
		Page(pageNum, pageSize).
		Scan(&rows)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		res.List = append(res.List, &system.NoticeMyItem{
			Id:          row.Id,
			NoticeId:    row.NoticeId,
			Title:       row.Title,
			Content:     row.Content,
			NoticeType:  row.NoticeType,
			LinkUrl:     row.LinkUrl,
			PayloadJson: row.PayloadJson,
			ReadStatus:  row.ReadStatus,
			ReadAt:      formatSystemTime(row.ReadAt),
			CreatedAt:   formatSystemTime(row.CreatedAt),
		})
	}
	res.Total = total
	res.CurrentPage = pageNum
	return
}

func (c *noticeController) MyRead(ctx context.Context, req *system.NoticeMyReadReq) (res *system.NoticeMyReadRes, err error) {
	userID := service.Context().GetUserId(ctx)
	if len(req.Ids) > 0 {
		_, err = g.DB().Model("notice_user").
			Where("user_id", userID).
			WhereIn("id", req.Ids).
			Where("read_status", 0).
			Where("deleted_at IS NULL").
			Update(g.Map{"read_status": 1, "read_at": gtime.Now()})
		if err != nil {
			return nil, err
		}
	}
	count, err := unreadNoticeCount(userID)
	if err != nil {
		return nil, err
	}
	return &system.NoticeMyReadRes{Count: count}, nil
}

func (c *noticeController) MyAllRead(ctx context.Context, req *system.NoticeMyAllReadReq) (res *system.NoticeMyAllReadRes, err error) {
	userID := service.Context().GetUserId(ctx)
	_, err = g.DB().Model("notice_user").
		Where("user_id", userID).
		Where("read_status", 0).
		Where("deleted_at IS NULL").
		Update(g.Map{"read_status": 1, "read_at": gtime.Now()})
	if err != nil {
		return nil, err
	}
	return &system.NoticeMyAllReadRes{Count: 0}, nil
}

func toNoticeMessage(row *noticeMessageRow) *system.NoticeMessage {
	if row == nil {
		return nil
	}
	return &system.NoticeMessage{
		Id:          row.Id,
		Title:       row.Title,
		Content:     row.Content,
		NoticeType:  row.NoticeType,
		TargetType:  row.TargetType,
		TargetValue: row.TargetValue,
		LinkUrl:     row.LinkUrl,
		PayloadJson: row.PayloadJson,
		Status:      row.Status,
		CreatedAt:   formatSystemTime(row.CreatedAt),
	}
}

func activeUserIds(ctx context.Context) ([]uint64, error) {
	rows := make([]struct {
		Id uint64 `orm:"id"`
	}, 0)
	err := g.DB().Model("sys_user").Fields("id").Where("deleted_at IS NULL").Where("user_status", 1).Scan(&rows)
	if err != nil {
		return nil, err
	}
	ids := make([]uint64, 0, len(rows))
	for _, row := range rows {
		if row.Id > 0 {
			ids = append(ids, row.Id)
		}
	}
	return ids, nil
}

func uniqueUint64(values []uint64) []uint64 {
	seen := make(map[uint64]struct{}, len(values))
	out := make([]uint64, 0, len(values))
	for _, value := range values {
		if value == 0 {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func targetValue(targetType string, ids []uint64) string {
	if targetType == "all" {
		return ""
	}
	parts := make([]string, 0, len(ids))
	for _, id := range uniqueUint64(ids) {
		parts = append(parts, gconv.String(id))
	}
	return strings.Join(parts, ",")
}

func randomTableID(ctx context.Context, tableName string) (uint64, error) {
	for i := 0; i < 20; i++ {
		id, err := random12DigitID()
		if err != nil {
			return 0, err
		}
		count, err := g.DB().Model(tableName).Where("id", id).Count()
		if err != nil {
			return 0, err
		}
		if count == 0 {
			return id, nil
		}
	}
	return 0, gerror.New("生成ID失败，请重试")
}

func random12DigitID() (uint64, error) {
	first, err := rand.Int(rand.Reader, big.NewInt(9))
	if err != nil {
		return 0, err
	}
	rest, err := rand.Int(rand.Reader, big.NewInt(100000000000))
	if err != nil {
		return 0, err
	}
	return gconv.Uint64(fmt.Sprintf("%d%011d", first.Int64()+1, rest.Int64())), nil
}

func unreadNoticeCount(userID uint64) (int, error) {
	return g.DB().Model("notice_user").
		Where("user_id", userID).
		Where("read_status", 0).
		Where("deleted_at IS NULL").
		Count()
}

func formatSystemTime(t *gtime.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("Y-m-d H:i:s")
}
