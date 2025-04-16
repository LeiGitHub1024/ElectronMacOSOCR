// DOM元素
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const imageContainer = document.getElementById('imageContainer');
const previewImage = document.getElementById('previewImage');
const status = document.getElementById('status');
const error = document.getElementById('error');
const tooltip = document.getElementById('tooltip');

// 检查必要的DOM元素是否存在
function checkDOMElements() {
    const elements = {
        dropZone,
        fileInput,
        imageContainer,
        previewImage,
        status,
        error,
        tooltip
    };

    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            throw new Error(`找不到必要的DOM元素: ${name}`);
        }
    }
}

// 当前显示的图片
let currentImage = null;

// 拖放处理
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
    }
});

// 点击选择文件
dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleImageFile(file);
    }
});

// 处理图片文件
async function handleImageFile(file) {
    try {
        setStatus('正在处理图片...');
        const imageUrl = file.path ? `file://${file.path}` : URL.createObjectURL(file);
        await displayImage(imageUrl);
        
        const result = await window.electronAPI.recognizeFromFile(file.path);
        if (result.success) {
            displayResults(result.data);
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError('处理失败: ' + error.message);
    }
}

// 显示图片
function displayImage(imageUrl) {
    return new Promise((resolve) => {
        clearResults();
        
        const img = new Image();
        img.onload = () => {
            currentImage = img;
            previewImage.src = imageUrl;
            previewImage.style.display = 'block';
            resolve();
        };
        img.src = imageUrl;
    });
}

// 显示OCR结果
function displayResults(results) {
    if (!results || !Array.isArray(results)) {
        showError('无效的OCR识别结果');
        return;
    }

    if (!imageContainer || !previewImage || !currentImage) {
        showError('页面元素未准备好');
        return;
    }

    // 打印原始结果
    console.log('OCR识别结果:', JSON.stringify(results, null, 2));

    // 获取图片实际显示尺寸和位置
    const displayWidth = previewImage.clientWidth;
    const displayHeight = previewImage.clientHeight;
    const imageRect = previewImage.getBoundingClientRect();
    const containerRect = imageContainer.getBoundingClientRect();
    
    // 获取图片原始尺寸
    const naturalWidth = currentImage.naturalWidth;
    const naturalHeight = currentImage.naturalHeight;
    
    // 打印尺寸信息
    console.log('图片信息:', {
        '显示尺寸': {
            width: displayWidth,
            height: displayHeight
        },
        '原始尺寸': {
            width: naturalWidth,
            height: naturalHeight
        },
        '容器位置': {
            left: containerRect.left,
            top: containerRect.top
        },
        '图片位置': {
            left: imageRect.left,
            top: imageRect.top
        }
    });
    
    // 计算缩放比例，保持图片原始比例
    const imageRatio = naturalWidth / naturalHeight;
    const containerRatio = displayWidth / displayHeight;
    
    let scale;
    if (imageRatio > containerRatio) {
        // 图片更宽，以宽度为基准
        scale = displayWidth / naturalWidth;
    } else {
        // 图片更高，以高度为基准
        scale = displayHeight / naturalHeight;
    }

    // 打印缩放信息
    console.log('缩放信息:', {
        imageRatio,
        containerRatio,
        scale
    });

    // 清除现有的文字框
    const existingBoxes = imageContainer.querySelectorAll('.text-box');
    existingBoxes.forEach(box => box.remove());

    // 创建文字框
    results.forEach((result, index) => {
        const { text, boundingBox } = result;
        const { x, y, width, height } = boundingBox;

        // 打印每个文本框的原始位置
        console.log(`文本框 #${index + 1}:`, {
            text,
            '原始位置': { x, y, width, height },
            '缩放后位置': {
                x: Math.round(x * scale),
                y: Math.round(y * scale),
                width: Math.round(width * scale),
                height: Math.round(height * scale)
            }
        });

        const box = document.createElement('div');
        box.className = 'text-box';

        // 计算实际位置（考虑边框宽度和缩放）
        const borderWidth = 2; // 与CSS中的border宽度对应
        const scaledX = Math.round(x * scale);
        const scaledY = Math.round(y * scale);
        const scaledWidth = Math.max(Math.round(width * scale), 10); // 确保最小宽度
        const scaledHeight = Math.max(Math.round(height * scale), 10); // 确保最小高度

        // 设置位置和大小
        box.style.left = `${scaledX}px`;
        box.style.top = `${scaledY}px`;
        box.style.width = `${scaledWidth}px`;
        box.style.height = `${scaledHeight}px`;
        
        // 添加点击复制功能
        box.addEventListener('click', () => {
            navigator.clipboard.writeText(text).then(() => {
                // 显示复制成功效果
                box.classList.add('copied');
                setTimeout(() => box.classList.remove('copied'), 500);
                
                // 显示提示
                showTooltip('已复制文字到剪贴板', box);
            });
        });

        // 添加悬停提示
        box.addEventListener('mouseenter', () => {
            showTooltip(text, box);
        });

        box.addEventListener('mouseleave', () => {
            hideTooltip();
        });

        imageContainer.appendChild(box);
    });
    
    setStatus(`识别完成，共找到 ${results.length} 个文本区域，点击框框可复制文字`);
}

// 显示提示框
function showTooltip(text, element) {
    if (!tooltip) return;
    const rect = element.getBoundingClientRect();
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    
    // 调整提示框位置，避免超出视窗
    const tooltipHeight = tooltip.offsetHeight;
    const windowHeight = window.innerHeight;
    const topSpace = rect.top;
    const bottomSpace = windowHeight - rect.bottom;
    
    // 根据可用空间决定显示在上方还是下方
    if (topSpace > tooltipHeight || topSpace > bottomSpace) {
        // 显示在上方
        tooltip.style.top = `${rect.top - tooltipHeight - 5}px`;
    } else {
        // 显示在下方
        tooltip.style.top = `${rect.bottom + 5}px`;
    }
    
    // 水平居中对齐
    const tooltipWidth = tooltip.offsetWidth;
    const left = rect.left + (rect.width - tooltipWidth) / 2;
    tooltip.style.left = `${Math.max(5, Math.min(window.innerWidth - tooltipWidth - 5, left))}px`;
}

// 隐藏提示框
function hideTooltip() {
    if (!tooltip) return;
    tooltip.style.display = 'none';
}

// 清除结果
function clearResults() {
    if (previewImage) {
        previewImage.style.display = 'none';
    }
    if (imageContainer) {
        const boxes = imageContainer.querySelectorAll('.text-box');
        boxes.forEach(box => box.remove());
    }
    hideTooltip();
    setStatus('');
    showError('');
}

// 更新状态
function setStatus(message) {
    if (status) {
        status.textContent = message;
    }
    if (error) {
        error.style.display = 'none';
    }
}

// 显示错误
function showError(message) {
    if (error) {
        error.textContent = message;
        error.style.display = message ? 'block' : 'none';
    }
    if (status) {
        status.textContent = '';
    }
}

// 初始化
try {
    checkDOMElements();
    clearResults();
} catch (err) {
    console.error('初始化失败:', err.message);
} 