import request from '/@/utils/request';

export function getPersonalInfo() {
    return request({
        url: '/api/v1/system/personal/getPersonalInfo',
        method: 'get',
    })
}


export function editPersonal(data:object) {
    return request({
        url: '/api/v1/system/personal/edit',
        method: 'put',
        data:data
    })
}

//重置個人密碼
export function resetPwdPersonal(data:object) {
    return request({
        url: '/api/v1/system/personal/resetPwd',
        method: 'put',
        data:data
    })
}

export function generateGoogleAuth() {
    return request({
        url: '/api/v1/system/personal/google/generate',
        method: 'get',
    })
}

export function bindGoogleAuth(data:object) {
    return request({
        url: '/api/v1/system/personal/google/bind',
        method: 'put',
        data:data
    })
}

export function unbindGoogleAuth(data:object) {
    return request({
        url: '/api/v1/system/personal/google/unbind',
        method: 'put',
        data:data
    })
}
