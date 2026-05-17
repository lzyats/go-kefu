package system

import "github.com/gogf/gf/v2/frame/g"

type UploadSingleImgReq struct {
	g.Meta `path:"/upload/singleImg" tags:"系统上传" method:"post" summary:"单图片上传"`
}

type UploadSingleImgRes struct {
	g.Meta `mime:"application/json"`
	Path   string `json:"path"`
	Url    string `json:"url"`
	Name   string `json:"name"`
}
