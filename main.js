const inputEl = document.getElementById('sub-input');
const btnEl = document.getElementById('generate-btn');
const resultArea = document.getElementById('result-area');
const toast = document.getElementById('toast');

// ========== 模板系统 ==========
let currentTemplate = 'text';

// 特殊字符转义（WiFi 格式）
function escapeWifi(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\')
              .replace(/;/g, '\\;')
              .replace(/,/g, '\\,')
              .replace(/:/g, '\\:');
}

// 模板数据生成器
const templateGenerators = {
    wifi: () => {
        const ssid = document.getElementById('wifi-ssid').value.trim();
        const password = document.getElementById('wifi-password').value;
        const encryption = document.getElementById('wifi-encryption').value;

        if (!ssid) return null;

        if (encryption === 'nopass') {
            return `WIFI:T:nopass;S:${escapeWifi(ssid)};;`;
        }
        return `WIFI:T:${encryption};S:${escapeWifi(ssid)};P:${escapeWifi(password)};;`;
    },

    email: () => {
        const to = document.getElementById('email-to').value.trim();
        const subject = document.getElementById('email-subject').value.trim();
        const body = document.getElementById('email-body').value.trim();

        if (!to) return null;

        let mailto = `mailto:${to}`;
        const params = [];
        if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
        if (body) params.push(`body=${encodeURIComponent(body)}`);
        if (params.length) mailto += '?' + params.join('&');

        return mailto;
    },

    sms: () => {
        const number = document.getElementById('sms-number').value.trim();
        const message = document.getElementById('sms-message').value.trim();

        if (!number) return null;

        return `smsto:${number}:${message}`;
    },

    text: () => {
        return inputEl.value.trim();
    }
};

// 标签页切换
const formsContainer = document.querySelector('.template-forms');

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const newTemplate = btn.dataset.template;
        if (newTemplate === currentTemplate) return;

        // 更新按钮激活状态
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        // 获取当前高度并固定
        const currentHeight = formsContainer.offsetHeight;
        formsContainer.style.height = currentHeight + 'px';

        // 隐藏当前表单
        document.querySelectorAll('.template-form').forEach(form => {
            form.classList.remove('active');
        });

        // 显示新表单
        const newForm = document.getElementById(`form-${newTemplate}`);
        newForm.classList.add('active');

        // 动画过渡到新高度
        const newHeight = newForm.offsetHeight;
        formsContainer.style.height = newHeight + 'px';

        // 过渡结束后恢复 auto
        setTimeout(() => {
            formsContainer.style.height = 'auto';
        }, 300);

        currentTemplate = newTemplate;
    });
});

// 密码显示/隐藏切换
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        const isPassword = input.type === 'password';

        input.type = isPassword ? 'text' : 'password';
        btn.setAttribute('aria-label', isPassword ? '隐藏密码' : '显示密码');

        // 切换图标
        btn.innerHTML = isPassword
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
               </svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
               </svg>`;
    });
});

// 清空当前表单
function clearCurrentForm() {
    switch (currentTemplate) {
        case 'wifi':
            document.getElementById('wifi-ssid').value = '';
            document.getElementById('wifi-password').value = '';
            document.getElementById('wifi-encryption').value = 'WPA';
            break;
        case 'email':
            document.getElementById('email-to').value = '';
            document.getElementById('email-subject').value = '';
            document.getElementById('email-body').value = '';
            break;
        case 'sms':
            document.getElementById('sms-number').value = '';
            document.getElementById('sms-message').value = '';
            break;
        case 'text':
            inputEl.value = '';
            break;
    }
}
// ========== 模板系统结束 ==========

// Toast 防抖处理：防止快速连续调用时的问题
let toastTimer = null;
function showToast(message) {
    // 清除之前的定时器，避免 Toast 被提前隐藏
    if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
    }
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        toastTimer = null;
    }, 2000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制到剪贴板');
    }).catch(() => {
        showToast('复制失败');
    });
}

// ========== Lightbox 灯罩效果 ==========
const lightbox = document.getElementById('qr-lightbox');
const lightboxCanvas = document.getElementById('lightbox-canvas');
const lightboxImg = document.getElementById('lightbox-image');
const lightboxHint = document.querySelector('.qr-lightbox-hint');
let lightboxUrl = null;

// 打开灯罩
function openLightbox(sourceCanvas) {
    if (!sourceCanvas) return;

    lightbox.classList.remove('img-mode');

    // 复制 canvas 到 lightbox
    const ctx = lightboxCanvas.getContext('2d');
    lightboxCanvas.width = sourceCanvas.width;
    lightboxCanvas.height = sourceCanvas.height;
    ctx.drawImage(sourceCanvas, 0, 0);

    lightboxHint.textContent = '点击空白处关闭';

    // 显示 lightbox
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 打开大图（iOS 长按保存用）
function openLightboxImage(url) {
    lightboxUrl = url;
    lightboxImg.src = url;
    lightbox.classList.add('img-mode');
    lightboxHint.textContent = '长按图片保存';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 关闭灯罩
function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    if (lightboxUrl) {
        URL.revokeObjectURL(lightboxUrl);
        lightboxUrl = null;
        lightboxImg.removeAttribute('src');
    }
}

// 点击背景关闭
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        closeLightbox();
    }
});

// ESC 键关闭
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
    }
});
// ========== Lightbox 结束 ==========

function createQRItem(text, templateType = 'text') {
    const item = document.createElement('div');
    item.className = 'qr-item';

    // 截断显示的内容
    const displayUrl = text.length > 35 ? text.substring(0, 35) + '...' : text;

    // 使用安全的 DOM 操作，避免 XSS
    const linkSpan = document.createElement('span');
    linkSpan.className = 'qr-link';
    linkSpan.setAttribute('title', text);
    linkSpan.setAttribute('role', 'button');
    linkSpan.setAttribute('tabindex', '0');
    linkSpan.setAttribute('aria-label', '点击复制内容');
    linkSpan.textContent = displayUrl;

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.setAttribute('aria-label', '下载二维码图片');
    downloadBtn.setAttribute('title', '下载二维码');
    downloadBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
    `;

    // 二维码下方操作区：复制链接 + 下载图片
    const actions = document.createElement('div');
    actions.className = 'qr-actions';
    actions.appendChild(linkSpan);
    actions.appendChild(downloadBtn);

    const wrapper = document.createElement('div');
    wrapper.className = 'qr-wrapper';
    wrapper.setAttribute('aria-label', '二维码图片');

    item.appendChild(wrapper);
    item.appendChild(actions);

    try {
        // 使用 qrcode-generator 库，支持超长内容
        // typeNumber: 0 表示自动选择合适的版本
        // errorCorrectionLevel: 'L' 低纠错级别，容纳更多数据
        // 'Byte' 模式：支持 UTF-8 编码，正确处理中文等多字节字符
        const qr = qrcode(0, 'L');

        // 将文本转换为 UTF-8 字节数组，确保中文正确编码
        // 使用 TextEncoder API（现代浏览器均支持）
        const utf8Encoder = new TextEncoder();
        const utf8Bytes = utf8Encoder.encode(text);

        // 将字节数组转换为字符串形式传递给二维码库
        // 使用数组 + join 代替字符串拼接，避免移动端内存问题
        const byteChars = new Array(utf8Bytes.length);
        for (let i = 0; i < utf8Bytes.length; i++) {
            byteChars[i] = String.fromCharCode(utf8Bytes[i]);
        }
        const byteString = byteChars.join('');

        qr.addData(byteString, 'Byte');
        qr.make();

        // 创建 canvas 绘制二维码
        const moduleCount = qr.getModuleCount();
        // 移动端优化：提高最小单元格大小，确保二维码清晰可扫描
        const MAX_SIZE = 300;
        const MIN_CELL_SIZE = 3;
        const cellSize = Math.max(MIN_CELL_SIZE, Math.floor(MAX_SIZE / moduleCount));
        const size = moduleCount * cellSize;

        // Canvas 尺寸保护，防止移动端内存溢出
        if (size > 4096) {
            throw new Error('二维码尺寸超出限制，内容可能过长');
        }

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // 绘制白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // 绘制二维码模块
        ctx.fillStyle = '#09090b';
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }
            }
        }

        wrapper.appendChild(canvas);

        // 点击二维码打开灯罩效果
        canvas.addEventListener('click', () => openLightbox(canvas));
    } catch (err) {
        // 安全创建错误消息
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = '二维码生成失败';

        const errorSmall = document.createElement('small');
        errorSmall.textContent = err.message || '内容过长或包含不支持的字符';

        errorDiv.appendChild(errorSmall);
        wrapper.appendChild(errorDiv);
        console.error('QRCode generation error:', err);
    }

    // 下载按钮事件（移动端优先系统分享；iOS 不支持下载属性时打开图片长按保存）
    downloadBtn.addEventListener('click', () => {
        const canvas = wrapper.querySelector('canvas');
        if (!canvas) return;
        canvas.toBlob((blob) => {
            if (!blob) {
                showToast('图片生成失败');
                return;
            }
            const filename = `qrcode-${templateType}.png`;
            const file = new File([blob], filename, { type: 'image/png' });

            // 支持文件分享（iOS 15+ / Android）：走系统分享，可直接存照片或文件
            let canShareFile = false;
            try {
                canShareFile = !!(navigator.canShare && navigator.canShare({ files: [file] }));
            } catch (e) {}
            if (canShareFile) {
                navigator.share({ files: [file], title: filename }).catch(() => {});
                return;
            }

            const url = URL.createObjectURL(blob);
            const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
                          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            if (isIOS) {
                // iOS 无分享能力：页面内显示大图，长按保存
                openLightboxImage(url);
                showToast('长按图片保存');
                return;
            }

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showToast('图片已下载');
        }, 'image/png');
    });

    // 点击链接也可复制
    linkSpan.addEventListener('click', () => copyToClipboard(text));
    // 键盘支持：Enter 键复制
    linkSpan.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            copyToClipboard(text);
        }
    });

    return item;
}

function generateQR() {
    // 使用模板生成器获取内容
    const generator = templateGenerators[currentTemplate];
    const content = generator ? generator() : null;

    if (!content) {
        const errorMsg = {
            wifi: '请输入网络名称',
            email: '请输入收件邮箱',
            sms: '请输入收件号码',
            text: '请输入文本内容'
        };
        showToast(errorMsg[currentTemplate] || '请填写必要信息');
        return;
    }

    // 清空结果区域
    resultArea.innerHTML = '';
    resultArea.classList.add('active');

    const qrItem = createQRItem(content, currentTemplate);
    resultArea.appendChild(qrItem);
}

btnEl.addEventListener('click', generateQR);

// 清空按钮
const clearBtnEl = document.getElementById('clear-btn');
clearBtnEl.addEventListener('click', () => {
    clearCurrentForm();
    resultArea.innerHTML = '';
    resultArea.classList.remove('active');

    // 聚焦到当前表单的第一个输入框
    const currentForm = document.getElementById(`form-${currentTemplate}`);
    const firstInput = currentForm.querySelector('input, textarea');
    if (firstInput) firstInput.focus();
});

// 支持 Ctrl+Enter 提交
inputEl.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        generateQR();
    }
});

// 粘贴按钮功能
const pasteBtn = document.getElementById('paste-btn');
pasteBtn.addEventListener('click', async () => {
    try {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
            const trimmedClip = clipText.trim();
            if (!trimmedClip) {
                showToast('剪贴板内容为空');
                return;
            }
            // 如果输入框已有内容，智能追加
            const currentValue = inputEl.value;
            if (currentValue.trim()) {
                // 检查末尾是否已有换行
                const endsWithNewline = currentValue.endsWith('\n');
                inputEl.value = endsWithNewline
                    ? currentValue + trimmedClip
                    : currentValue + '\n' + trimmedClip;
            } else {
                inputEl.value = trimmedClip;
            }
            showToast('已从剪贴板粘贴');
            inputEl.focus();
        } else {
            showToast('剪贴板为空');
        }
    } catch (err) {
        // 权限被拒绝或不支持
        showToast('无法访问剪贴板，请手动粘贴');
    }
});

// ========== 主题切换 ==========
const themeBtn = document.getElementById('theme-toggle');
const themeMq = window.matchMedia('(prefers-color-scheme: light)');
const THEME_KEY = 'matrixqr-theme';
let currentTheme = localStorage.getItem(THEME_KEY) || 'system';

function applyTheme(theme) {
    currentTheme = theme;
    const light = theme === 'light' || (theme === 'system' && themeMq.matches);
    document.documentElement.classList.toggle('light', light);
    if (themeBtn) themeBtn.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        const next = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
        applyTheme(next);
    });
}
themeMq.addEventListener('change', () => {
    if (currentTheme === 'system') applyTheme('system');
});
applyTheme(currentTheme);
