import request from '/@/utils/request';

export function getNoticeList(query: object) {
	return request({
		url: '/api/v1/system/notice/list',
		method: 'get',
		params: query,
	});
}

export function sendNotice(data: object) {
	return request({
		url: '/api/v1/system/notice/send',
		method: 'post',
		data,
	});
}

export function deleteNotice(ids: Array<number | string>) {
	return request({
		url: '/api/v1/system/notice/delete',
		method: 'delete',
		data: { ids },
	});
}

export function getNoticeUserList(query: object) {
	return request({
		url: '/api/v1/system/notice/user-list',
		method: 'get',
		params: query,
	});
}

export function getMyNoticeList(query: object) {
	return request({
		url: '/api/v1/system/notice/my-list',
		method: 'get',
		params: query,
	});
}

export function getMyNoticeUnread() {
	return request({
		url: '/api/v1/system/notice/my-unread',
		method: 'get',
	});
}

export function readMyNotice(ids: Array<number | string>) {
	return request({
		url: '/api/v1/system/notice/my-read',
		method: 'post',
		data: { ids },
	});
}

export function readAllMyNotice() {
	return request({
		url: '/api/v1/system/notice/my-all-read',
		method: 'post',
	});
}
