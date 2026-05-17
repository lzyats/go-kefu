import Cookies from 'js-cookie';

const getTokenKey = () => {
	const envKey = import.meta.env.VITE_TOKEN_KEY;
	if (envKey) return envKey;
	const port = window.location.port || 'default';
	return `token_${port}`;
};

/**
 * window.localStorage 浏览器永久缓存
 * @method set 设置永久缓存
 * @method get 获取永久缓存
 * @method remove 移除永久缓存
 * @method clear 移除全部永久缓存
 */
export const Local = {
	// 设置永久缓存
	set(key: string, val: any) {
		window.localStorage.setItem(key, JSON.stringify(val));
	},
	// 获取永久缓存
	get(key: string) {
		let json: any = window.localStorage.getItem(key);
		return JSON.parse(json);
	},
	// 移除永久缓存
	remove(key: string) {
		window.localStorage.removeItem(key);
	},
	// 移除全部永久缓存
	clear() {
		window.localStorage.clear();
	},
};

/**
 * window.sessionStorage 浏览器临时缓存
 * @method set 设置临时缓存
 * @method get 获取临时缓存
 * @method remove 移除临时缓存
 * @method clear 移除全部临时缓存
 */
export const Session = {
	// 设置临时缓存
	set(key: string, val: any) {
		if (key === 'token') return Cookies.set(getTokenKey(), val);
		window.sessionStorage.setItem(key, JSON.stringify(val));
	},
	// 获取临时缓存
	get(key: string) {
		if (key === 'token') return Cookies.get(getTokenKey());
		let json: any = window.sessionStorage.getItem(key);
		return JSON.parse(json);
	},
	// 移除临时缓存
	remove(key: string) {
		if (key === 'token') {
			Cookies.remove(getTokenKey());
			return Cookies.remove('token');
		}
		window.sessionStorage.removeItem(key);
	},
	// 移除全部临时缓存
	clear() {
		Cookies.remove(getTokenKey());
		Cookies.remove('token');
		window.sessionStorage.clear();
	},
};
