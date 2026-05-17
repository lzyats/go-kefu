package router

import (
	"context"

	"github.com/gogf/gf/v2/net/ghttp"
	systemApi "github.com/tiger1103/gfast/v3/api/v1/system"
	"github.com/tiger1103/gfast/v3/internal/app/system/controller"
	"github.com/tiger1103/gfast/v3/internal/app/system/service"
	"github.com/tiger1103/gfast/v3/library/libRouter"
)

var R = new(Router)

type Router struct{}

func (router *Router) BindController(ctx context.Context, group *ghttp.RouterGroup) {
	group.Group("/system", func(group *ghttp.RouterGroup) {
		group.Bind(
			controller.Login,
		)
		group.GET("/notice/ws", func(r *ghttp.Request) {
			_, _ = controller.Notice.Ws(r.Context(), &systemApi.NoticeWsReq{Token: r.Get("token").String()})
		})

		group.Middleware(service.Middleware().Ctx)
		service.GfToken().Middleware(group)
		group.Middleware(service.Middleware().Auth)
		group.Hook("/*", ghttp.HookAfterOutput, service.OperateLog().OperationLog)
		group.Bind(
			controller.User,
			controller.Menu,
			controller.Role,
			controller.Dept,
			controller.Post,
			controller.DictType,
			controller.DictData,
			controller.Config,
			controller.Upload,
			controller.Notice,
			controller.Monitor,
			controller.LoginLog,
			controller.OperLog,
			controller.Personal,
			controller.UserOnline,
			controller.Cache,
		)
		if err := libRouter.RouterAutoBind(ctx, router, group); err != nil {
			panic(err)
		}
	})
}
