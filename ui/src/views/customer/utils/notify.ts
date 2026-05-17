import { ElMessage } from 'element-plus';

let audioContext: AudioContext | undefined;
let titleTimer: number | undefined;
let originalTitle = document.title;

export function unlockMessageSound() {
	try {
		const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctx) return;
		if (!audioContext) audioContext = new Ctx();
		if (audioContext.state === 'suspended') void audioContext.resume();
	} catch {
		// 声音提醒是增强体验，浏览器不允许时不影响聊天主流程。
	}
}

export function playMessageSound() {
	try {
		unlockMessageSound();
		if (!audioContext) return;
		const oscillator = audioContext.createOscillator();
		const gain = audioContext.createGain();
		oscillator.type = 'sine';
		oscillator.frequency.value = 880;
		gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28);
		oscillator.connect(gain);
		gain.connect(audioContext.destination);
		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.3);
	} catch {
		// 忽略播放失败，常见原因是浏览器自动播放策略。
	}
}

export function flashTitle(text = '收到新消息') {
	if (titleTimer) window.clearInterval(titleTimer);
	originalTitle = document.title || originalTitle;
	let visible = false;
	titleTimer = window.setInterval(() => {
		visible = !visible;
		document.title = visible ? text : originalTitle;
	}, 1000);
}

export function stopTitleFlash() {
	if (titleTimer) {
		window.clearInterval(titleTimer);
		titleTimer = undefined;
	}
	document.title = originalTitle;
}

export function notifyNewMessage(title: string, body: string, options?: { sound?: boolean; browser?: boolean }) {
	if (options?.sound !== false) playMessageSound();
	ElMessage.info(body);
	if (document.hidden) flashTitle(title);
	if (options?.browser === false || !('Notification' in window)) return;
	if (Notification.permission === 'granted') {
		new Notification(title, { body });
		return;
	}
	if (Notification.permission === 'default') {
		Notification.requestPermission().then((permission) => {
			if (permission === 'granted') new Notification(title, { body });
		});
	}
}
