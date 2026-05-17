/*
* @desc:xxxx功能描述
* @company:云南奇讯科技有限公司
* @Author: yixiaohu<yxh669@qq.com>
* @Date:   2022/11/3 9:55
 */

package personal

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/util/gconv"
	"github.com/gogf/gf/v2/util/grand"
	"github.com/tiger1103/gfast/v3/api/v1/system"
	"github.com/tiger1103/gfast/v3/internal/app/system/dao"
	"github.com/tiger1103/gfast/v3/internal/app/system/model"
	"github.com/tiger1103/gfast/v3/internal/app/system/model/do"
	"github.com/tiger1103/gfast/v3/internal/app/system/model/entity"
	service "github.com/tiger1103/gfast/v3/internal/app/system/service"
	"github.com/tiger1103/gfast/v3/library/libUtils"
	"github.com/tiger1103/gfast/v3/library/liberr"
)

func init() {
	service.RegisterPersonal(New())
}

type sPersonal struct {
}

func New() *sPersonal {
	return &sPersonal{}
}

func (s *sPersonal) GetPersonalInfo(ctx context.Context, req *system.PersonalInfoReq) (res *system.PersonalInfoRes, err error) {
	res = new(system.PersonalInfoRes)
	userId := currentUserID(ctx)
	if userId == 0 {
		return nil, gerror.New("登录状态已失效，请重新登录")
	}

	res.User, err = service.SysUser().GetUserInfoById(ctx, userId)
	if err != nil {
		return
	}
	if res.User == nil {
		return nil, gerror.New("当前登录用户不存在")
	}

	var dept *entity.SysDept
	dept, err = service.SysDept().GetByDeptId(ctx, res.User.DeptId)
	if err != nil {
		return
	}
	if dept != nil {
		res.DeptName = dept.DeptName
	}

	allRoles, err := service.SysRole().GetRoleList(ctx)
	if err != nil {
		return
	}
	roles, err := service.SysUser().GetAdminRole(ctx, userId, allRoles)
	if err != nil {
		return
	}
	name := make([]string, len(roles))
	for k, v := range roles {
		name[k] = v.Name
	}
	res.Roles = name
	return
}

func (s *sPersonal) EditPersonal(ctx context.Context, req *system.PersonalEditReq) (user *model.LoginUserRes, err error) {
	userId := currentUserID(ctx)
	err = service.SysUser().UserNameOrMobileExists(ctx, "", req.Mobile, int64(userId))
	if err != nil {
		return
	}
	err = g.DB().Transaction(ctx, func(ctx context.Context, tx gdb.TX) error {
		err = g.Try(ctx, func(ctx context.Context) {
			_, err = dao.SysUser.Ctx(ctx).TX(tx).WherePri(userId).Update(do.SysUser{
				Mobile:       req.Mobile,
				UserNickname: req.Nickname,
				Remark:       req.Remark,
				Sex:          req.Sex,
				UserEmail:    req.UserEmail,
				Describe:     req.Describe,
				Avatar:       req.Avatar,
			})
			liberr.ErrIsNil(ctx, err, "修改用户信息失败")
			user, err = service.SysUser().GetUserById(ctx, userId)
			liberr.ErrIsNil(ctx, err)
		})
		return err
	})
	return
}

func (s *sPersonal) ResetPwdPersonal(ctx context.Context, req *system.PersonalResetPwdReq) (res *system.PersonalResetPwdRes, err error) {
	userId := currentUserID(ctx)
	salt := grand.S(10)
	password := libUtils.EncryptPassword(req.Password, salt)
	err = g.Try(ctx, func(ctx context.Context) {
		_, err = dao.SysUser.Ctx(ctx).WherePri(userId).Update(g.Map{
			dao.SysUser.Columns().UserSalt:     salt,
			dao.SysUser.Columns().UserPassword: password,
		})
		liberr.ErrIsNil(ctx, err, "重置用户密码失败")
	})
	return
}

func (s *sPersonal) GenerateGoogleAuth(ctx context.Context, req *system.PersonalGoogleGenerateReq) (res *system.PersonalGoogleGenerateRes, err error) {
	userId := currentUserID(ctx)
	user, err := service.SysUser().GetUserById(ctx, userId)
	if err != nil {
		return nil, err
	}
	secret, err := libUtils.GenerateTOTPSecret()
	if err != nil {
		return nil, err
	}
	return &system.PersonalGoogleGenerateRes{
		Secret: secret,
		QrUrl:  libUtils.BuildTOTPURL("GFast", user.UserName, secret),
	}, nil
}

func (s *sPersonal) BindGoogleAuth(ctx context.Context, req *system.PersonalGoogleBindReq) (res *system.PersonalGoogleBindRes, err error) {
	if !libUtils.VerifyTOTP(req.Secret, req.Code) {
		return nil, gerror.New("Google验证码错误")
	}
	userId := currentUserID(ctx)
	_, err = dao.SysUser.Ctx(ctx).WherePri(userId).Update(do.SysUser{
		GoogleSecret: req.Secret,
		GoogleStatus: 1,
	})
	if err != nil {
		return nil, err
	}
	return &system.PersonalGoogleBindRes{}, nil
}

func (s *sPersonal) UnbindGoogleAuth(ctx context.Context, req *system.PersonalGoogleUnbindReq) (res *system.PersonalGoogleUnbindRes, err error) {
	userId := currentUserID(ctx)
	user, err := service.SysUser().GetUserById(ctx, userId)
	if err != nil {
		return nil, err
	}
	if user.GoogleStatus == 1 && !libUtils.VerifyTOTP(user.GoogleSecret, req.Code) {
		return nil, gerror.New("Google验证码错误")
	}
	_, err = dao.SysUser.Ctx(ctx).WherePri(userId).Update(do.SysUser{
		GoogleSecret: "",
		GoogleStatus: 0,
	})
	if err != nil {
		return nil, err
	}
	return &system.PersonalGoogleUnbindRes{}, nil
}

func currentUserID(ctx context.Context) uint64 {
	userID := service.Context().GetUserId(ctx)
	if userID > 0 {
		return userID
	}
	r := g.RequestFromCtx(ctx)
	if r == nil {
		return 0
	}
	token := service.GfToken().GetRequestToken(r)
	if strings.TrimSpace(token) == "" {
		return 0
	}
	_, key, err := service.GfToken().GetTokenData(ctx, token)
	if err != nil {
		return 0
	}
	return gconv.Uint64(strings.Split(key, "-")[0])
}
