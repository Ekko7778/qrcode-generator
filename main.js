const inputEl = document.getElementById('sub-input');
const btnEl = document.getElementById('generate-btn');
const resultArea = document.getElementById('result-area');
const qrResult = document.getElementById('qr-result');
const stylePicker = document.getElementById('qr-style-picker');
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

// ========== 二维码样式 ==========
const QR_STYLES = {
    classic: { label: '经典方块', color: '#09090b', shape: 'square' },
    dot: { label: '圆点', color: '#09090b', shape: 'dot' },
    rounded: { label: '圆角方块', color: '#09090b', shape: 'rounded' },
    gradient: { label: '品牌渐变', color: ['#22d3ee', '#a78bfa'], shape: 'square' }
};
let currentQRStyle = 'classic';
let lastQRContent = null;
let lastQRTemplate = 'text';

function buildStylePicker() {
    const select = document.getElementById('qr-style-select');
    Object.entries(QR_STYLES).forEach(([key, style]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = style.label;
        select.appendChild(opt);
    });
    select.value = currentQRStyle;
    select.addEventListener('change', () => selectStyle(select.value));
}

function selectStyle(key) {
    currentQRStyle = key;
    const select = document.getElementById('qr-style-select');
    if (select) select.value = key;
    if (lastQRContent !== null) renderResult();
}

function drawQRModules(ctx, qr, cellSize, size, pad = 0) {
    const style = QR_STYLES[currentQRStyle] || QR_STYLES.classic;
    const moduleCount = qr.getModuleCount();
    if (Array.isArray(style.color)) {
        const g = ctx.createLinearGradient(0, 0, size, size);
        g.addColorStop(0, style.color[0]);
        g.addColorStop(1, style.color[1]);
        ctx.fillStyle = g;
    } else {
        ctx.fillStyle = style.color;
    }
    const roundRect = typeof ctx.roundRect === 'function';
    for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
            if (!qr.isDark(row, col)) continue;
            const x = pad + col * cellSize;
            const y = pad + row * cellSize;
            if (style.shape === 'dot') {
                ctx.beginPath();
                ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.45, 0, Math.PI * 2);
                ctx.fill();
            } else if (style.shape === 'rounded' && roundRect) {
                ctx.beginPath();
                ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.25);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
    }
}

function createQRItem(text, templateType = 'text') {
    const item = document.createElement('div');
    item.className = 'qr-item';

    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'qr-download-btn';
    downloadBtn.setAttribute('aria-label', '下载二维码图片');
    downloadBtn.setAttribute('title', '下载二维码');
    downloadBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>下载</span>
    `;

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'copy-btn';
    copyBtn.setAttribute('aria-label', '复制内容');
    copyBtn.setAttribute('title', '复制内容');
    copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    `;

    // 二维码下方操作区：下载图片 + 复制内容
    const actions = document.createElement('div');
    actions.className = 'qr-actions';
    actions.appendChild(downloadBtn);
    actions.appendChild(copyBtn);

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

        // 画布包含白色圆角容器，显示与下载一致
        const PAD = 24;
        const containerSize = size + PAD * 2;
        const canvas = document.createElement('canvas');
        canvas.width = containerSize;
        canvas.height = containerSize;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(0, 0, containerSize, containerSize, 18);
            ctx.fill();
        } else {
            ctx.fillRect(0, 0, containerSize, containerSize);
        }

        // 绘制二维码模块（按所选样式）
        drawQRModules(ctx, qr, cellSize, size, PAD);

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

            // 移动端优先系统分享；桌面端直接下载，不弹系统分享窗口
            const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent) ||
                             (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            let canShareFile = false;
            if (isMobile) {
                try {
                    canShareFile = !!(navigator.canShare && navigator.canShare({ files: [file] }));
                } catch (e) {}
                if (canShareFile) {
                    navigator.share({ files: [file], title: filename }).catch(() => {});
                    return;
                }
            }

            const url = URL.createObjectURL(blob);
            if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
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

    // 复制内容
    copyBtn.addEventListener('click', () => copyToClipboard(text));

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

    // 记录本次内容，样式切换时可按原内容重绘
    lastQRContent = content;
    lastQRTemplate = currentTemplate;

    // 显示结果区域与样式选择器
    resultArea.classList.add('active');
    stylePicker.hidden = false;
    renderResult();
}

function renderResult() {
    qrResult.innerHTML = '';
    if (lastQRContent === null) return;
    qrResult.appendChild(createQRItem(lastQRContent, lastQRTemplate));
}

btnEl.addEventListener('click', generateQR);

// 清空按钮
const clearBtnEl = document.getElementById('clear-btn');
clearBtnEl.addEventListener('click', () => {
    clearCurrentForm();
    lastQRContent = null;
    qrResult.innerHTML = '';
    resultArea.classList.remove('active');
    stylePicker.hidden = true;

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

// 构建二维码样式选择器
buildStylePicker();
