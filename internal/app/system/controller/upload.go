package controller

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/net/ghttp"
	"github.com/gogf/gf/v2/os/gfile"
	"github.com/gogf/gf/v2/text/gstr"
	"github.com/tiger1103/gfast/v3/api/v1/system"
	"github.com/tiger1103/gfast/v3/internal/app/common/consts"
)

var Upload = new(uploadController)

type uploadController struct{}

type uploadResult struct {
	Path string
	Url  string
	Name string
}

func (c *uploadController) SingleImg(ctx context.Context, req *system.UploadSingleImgReq) (res *system.UploadSingleImgRes, err error) {
	r := g.RequestFromCtx(ctx)
	if r == nil {
		return nil, gerror.New("request not found")
	}

	file := r.GetUploadFile("file")
	if file == nil {
		return nil, gerror.New("请选择要上传的文件")
	}

	result, err := c.saveByDriver(ctx, file)
	if err != nil {
		return nil, err
	}

	return &system.UploadSingleImgRes{
		Path: result.Path,
		Url:  result.Url,
		Name: result.Name,
	}, nil
}

func (c *uploadController) saveByDriver(ctx context.Context, file *ghttp.UploadFile) (*uploadResult, error) {
	switch g.Cfg().MustGet(ctx, "upload.default").Int() {
	case 1:
		return c.saveToCOS(ctx, file)
	case 2:
		return c.saveToOSS(ctx, file)
	case 3:
		return c.saveToS3(ctx, file)
	default:
		return c.saveToLocal(ctx, file)
	}
}

func (c *uploadController) saveToLocal(ctx context.Context, file *ghttp.UploadFile) (*uploadResult, error) {
	nowDir := time.Now().Format("2006-01-02")
	saveDir := gfile.Join(g.Cfg().MustGet(ctx, "server.serverRoot").String(), consts.UploadPath, nowDir)
	if err := gfile.Mkdir(saveDir); err != nil {
		return nil, err
	}

	savedName, err := file.Save(saveDir, true)
	if err != nil {
		return nil, err
	}

	relativePath := "/" + gstr.TrimLeft(strings.ReplaceAll(filepath.ToSlash(gfile.Join(consts.UploadPath, nowDir, savedName)), "\\", "/"), "/")
	return &uploadResult{
		Path: relativePath,
		Url:  relativePath,
		Name: savedName,
	}, nil
}

func (c *uploadController) saveToCOS(ctx context.Context, file *ghttp.UploadFile) (*uploadResult, error) {
	publicBaseURL := strings.TrimRight(g.Cfg().MustGet(ctx, "upload.cos.baseUrl").String(), "/")
	secretID := g.Cfg().MustGet(ctx, "upload.cos.secretId").String()
	secretKey := g.Cfg().MustGet(ctx, "upload.cos.secretKey").String()
	bucket := g.Cfg().MustGet(ctx, "upload.cos.bucket").String()
	region := g.Cfg().MustGet(ctx, "upload.cos.region").String()

	if secretID == "" || secretKey == "" || bucket == "" || region == "" {
		return nil, gerror.New("COS 配置不完整，请检查 secretId、secretKey、bucket、region")
	}

	uploadBaseURL := fmt.Sprintf("https://%s.cos.%s.myqcloud.com", bucket, region)
	if publicBaseURL == "" {
		publicBaseURL = uploadBaseURL
	}

	objectPath := "/" + gstr.TrimLeft(path.Join(consts.UploadPath, time.Now().Format("2006-01-02"), sanitizeUploadName(file.Filename)), "/")
	encodedObjectPath := encodeCOSURI(objectPath)
	targetURL := uploadBaseURL + encodedObjectPath

	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return nil, err
	}

	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, targetURL, src)
	if err != nil {
		return nil, err
	}
	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Authorization", buildCOSAuthorization(secretID, secretKey, parsedURL.Host, objectPath))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return nil, gerror.Newf("COS 上传失败，状态码 %d：%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	return &uploadResult{
		Path: objectPath,
		Url:  publicBaseURL + encodedObjectPath,
		Name: path.Base(objectPath),
	}, nil
}

func (c *uploadController) saveToOSS(ctx context.Context, file *ghttp.UploadFile) (*uploadResult, error) {
	endpoint := strings.TrimRight(g.Cfg().MustGet(ctx, "upload.oss.endpoint").String(), "/")
	bucket := g.Cfg().MustGet(ctx, "upload.oss.bucket").String()
	accessKeyID := g.Cfg().MustGet(ctx, "upload.oss.accessKeyId").String()
	accessKeySecret := g.Cfg().MustGet(ctx, "upload.oss.accessKeySecret").String()
	baseURL := strings.TrimRight(g.Cfg().MustGet(ctx, "upload.oss.baseUrl").String(), "/")

	if endpoint == "" || bucket == "" || accessKeyID == "" || accessKeySecret == "" {
		return nil, gerror.New("OSS 配置不完整，请检查 endpoint、bucket、accessKeyId、accessKeySecret")
	}

	host, err := buildOSSHost(endpoint, bucket)
	if err != nil {
		return nil, err
	}
	if baseURL == "" {
		baseURL = "https://" + host
	}

	objectPath := "/" + gstr.TrimLeft(path.Join(consts.UploadPath, time.Now().Format("2006-01-02"), sanitizeUploadName(file.Filename)), "/")
	requestURL := "https://" + host + objectPath
	publicURL := strings.TrimRight(baseURL, "/") + objectPath

	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, requestURL, src)
	if err != nil {
		return nil, err
	}
	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	dateValue := time.Now().UTC().Format(http.TimeFormat)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Date", dateValue)
	req.Header.Set("Host", host)
	req.Host = host
	req.Header.Set("Authorization", buildOSSAuthorization(accessKeyID, accessKeySecret, contentType, dateValue, objectPath))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return nil, gerror.Newf("OSS 上传失败，状态码 %d：%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	return &uploadResult{
		Path: publicURL,
		Url:  publicURL,
		Name: path.Base(objectPath),
	}, nil
}

func (c *uploadController) saveToS3(ctx context.Context, file *ghttp.UploadFile) (*uploadResult, error) {
	endpoint := strings.TrimRight(g.Cfg().MustGet(ctx, "upload.s3.endpoint").String(), "/")
	region := g.Cfg().MustGet(ctx, "upload.s3.region").String()
	bucket := g.Cfg().MustGet(ctx, "upload.s3.bucket").String()
	accessKeyID := g.Cfg().MustGet(ctx, "upload.s3.accessKeyId").String()
	secretAccessKey := g.Cfg().MustGet(ctx, "upload.s3.secretAccessKey").String()
	baseURL := strings.TrimRight(g.Cfg().MustGet(ctx, "upload.s3.baseUrl").String(), "/")
	forcePathStyle := g.Cfg().MustGet(ctx, "upload.s3.forcePathStyle").Bool()

	if endpoint == "" || region == "" || bucket == "" || accessKeyID == "" || secretAccessKey == "" {
		return nil, gerror.New("S3 配置不完整，请检查 endpoint、region、bucket、accessKeyId、secretAccessKey")
	}

	endpointURL, err := url.Parse(endpoint)
	if err != nil {
		return nil, err
	}
	if endpointURL.Scheme == "" {
		endpointURL.Scheme = "https"
	}

	objectPath := "/" + gstr.TrimLeft(path.Join(consts.UploadPath, time.Now().Format("2006-01-02"), sanitizeUploadName(file.Filename)), "/")

	host := endpointURL.Host
	requestPath := objectPath
	if forcePathStyle {
		requestPath = "/" + gstr.TrimLeft(path.Join(bucket, strings.TrimPrefix(objectPath, "/")), "/")
	} else {
		host = bucket + "." + endpointURL.Host
	}

	requestURL := endpointURL.Scheme + "://" + host + requestPath
	publicURL := requestURL
	if baseURL != "" {
		publicURL = buildPublicFileURL(baseURL, objectPath)
	}

	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	payload, err := io.ReadAll(src)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, requestURL, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}

	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Host", host)
	req.Host = host

	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	shortDate := now.Format("20060102")
	payloadHash := sha256HexBytes(payload)
	req.Header.Set("X-Amz-Content-Sha256", payloadHash)
	req.Header.Set("X-Amz-Date", amzDate)
	req.Header.Set("Authorization", buildS3Authorization(accessKeyID, secretAccessKey, region, shortDate, amzDate, host, requestPath, payloadHash))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return nil, gerror.Newf("S3 上传失败，状态码 %d：%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	return &uploadResult{
		Path: publicURL,
		Url:  publicURL,
		Name: path.Base(objectPath),
	}, nil
}

func sanitizeUploadName(name string) string {
	fileName := path.Base(strings.ReplaceAll(name, "\\", "/"))
	ext := strings.ToLower(path.Ext(fileName))
	if ext == "" {
		ext = ".bin"
	}
	randomSuffix, err := randomHexString(12)
	if err != nil {
		return fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	}
	return fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), randomSuffix, ext)
}

func randomHexString(n int) (string, error) {
	const chars = "0123456789abcdef"
	out := make([]byte, n)
	for i := range out {
		idx, err := randomInt(len(chars))
		if err != nil {
			return "", err
		}
		out[i] = chars[idx]
	}
	return string(out), nil
}

func randomInt(max int) (int, error) {
	v, err := rand.Int(rand.Reader, big.NewInt(int64(max)))
	if err != nil {
		return 0, err
	}
	return int(v.Int64()), nil
}

func buildCOSAuthorization(secretID, secretKey, host, objectPath string) string {
	start := time.Now().Unix() - 60
	end := time.Now().Unix() + 3600
	signTime := fmt.Sprintf("%d;%d", start, end)

	signKey := hmacSHA1Hex(secretKey, signTime)
	httpString := strings.Join([]string{
		strings.ToLower(http.MethodPut),
		encodeCOSURI(objectPath),
		"",
		fmt.Sprintf("host=%s\n", strings.ToLower(host)),
	}, "\n")
	stringToSign := strings.Join([]string{
		"sha1",
		signTime,
		sha1Hex(httpString),
		"",
	}, "\n")
	signature := hmacSHA1Hex(signKey, stringToSign)

	return fmt.Sprintf(
		"q-sign-algorithm=sha1&q-ak=%s&q-sign-time=%s&q-key-time=%s&q-header-list=host&q-url-param-list=&q-signature=%s",
		secretID,
		signTime,
		signTime,
		signature,
	)
}

func buildOSSHost(endpoint, bucket string) (string, error) {
	if endpoint == "" {
		return "", gerror.New("OSS endpoint 不能为空")
	}
	if strings.HasPrefix(endpoint, "http://") || strings.HasPrefix(endpoint, "https://") {
		parsed, err := url.Parse(endpoint)
		if err != nil {
			return "", err
		}
		return bucket + "." + parsed.Host, nil
	}
	return bucket + "." + endpoint, nil
}

func buildOSSAuthorization(accessKeyID, accessKeySecret, contentType, dateValue, objectPath string) string {
	stringToSign := strings.Join([]string{
		http.MethodPut,
		"",
		contentType,
		dateValue,
		objectPath,
	}, "\n")
	signature := hmacSHA1Base64(accessKeySecret, stringToSign)
	return fmt.Sprintf("OSS %s:%s", accessKeyID, signature)
}

func buildS3Authorization(accessKeyID, secretAccessKey, region, shortDate, amzDate, host, requestPath, payloadHash string) string {
	canonicalHeaders := strings.Join([]string{
		"host:" + strings.ToLower(host),
		"x-amz-content-sha256:" + payloadHash,
		"x-amz-date:" + amzDate,
		"",
	}, "\n")
	signedHeaders := "host;x-amz-content-sha256;x-amz-date"
	canonicalRequest := strings.Join([]string{
		http.MethodPut,
		encodeS3Path(requestPath),
		"",
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	}, "\n")
	credentialScope := strings.Join([]string{shortDate, region, "s3", "aws4_request"}, "/")
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		credentialScope,
		sha256Hex(canonicalRequest),
	}, "\n")

	signingKey := buildAWS4SigningKey(secretAccessKey, shortDate, region, "s3")
	signature := hmacSHA256Hex(signingKey, stringToSign)

	return fmt.Sprintf(
		"AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		accessKeyID,
		credentialScope,
		signedHeaders,
		signature,
	)
}

func encodeCOSURI(objectPath string) string {
	segments := strings.Split(objectPath, "/")
	for i, segment := range segments {
		if segment == "" {
			continue
		}
		segments[i] = url.PathEscape(segment)
	}
	encoded := strings.Join(segments, "/")
	if !strings.HasPrefix(encoded, "/") {
		encoded = "/" + encoded
	}
	return encoded
}

func encodeS3Path(objectPath string) string {
	segments := strings.Split(objectPath, "/")
	for i, segment := range segments {
		if segment == "" {
			continue
		}
		escaped := url.PathEscape(segment)
		escaped = strings.ReplaceAll(escaped, "+", "%20")
		segments[i] = escaped
	}
	encoded := strings.Join(segments, "/")
	if !strings.HasPrefix(encoded, "/") {
		encoded = "/" + encoded
	}
	return encoded
}

func buildPublicFileURL(baseURL, objectPath string) string {
	baseURL = strings.TrimRight(baseURL, "/")
	if baseURL == "" {
		return objectPath
	}
	return baseURL + encodeS3Path(objectPath)
}

func sha1Hex(value string) string {
	sum := sha1.Sum([]byte(value))
	return hex.EncodeToString(sum[:])
}

func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func sha256HexBytes(value []byte) string {
	sum := sha256.Sum256(value)
	return hex.EncodeToString(sum[:])
}

func hmacSHA1Hex(secret, value string) string {
	mac := hmac.New(sha1.New, []byte(secret))
	_, _ = mac.Write([]byte(value))
	return hex.EncodeToString(mac.Sum(nil))
}

func hmacSHA1Base64(secret, value string) string {
	mac := hmac.New(sha1.New, []byte(secret))
	_, _ = mac.Write([]byte(value))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func hmacSHA256(secret []byte, value string) []byte {
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(value))
	return mac.Sum(nil)
}

func hmacSHA256Hex(secret []byte, value string) string {
	return hex.EncodeToString(hmacSHA256(secret, value))
}

func buildAWS4SigningKey(secretAccessKey, shortDate, region, service string) []byte {
	kDate := hmacSHA256([]byte("AWS4"+secretAccessKey), shortDate)
	kRegion := hmacSHA256(kDate, region)
	kService := hmacSHA256(kRegion, service)
	return hmacSHA256(kService, "aws4_request")
}
