const path = require('path');
const fs = require('fs');

// 可能的OCR模块位置
const possibleModulePaths = [
  path.resolve(__dirname, '../cpp/build/Release/improved_ocr.node'),
];

// 查找并加载OCR模块
let ocrModule = null;
for (const modulePath of possibleModulePaths) {
  if (fs.existsSync(modulePath)) {
    try {
      ocrModule = require(modulePath);
      console.log(`成功加载OCR模块: ${modulePath}`);
      break;
    } catch (error) {
      console.error(`尝试加载模块 ${modulePath} 失败:`, error);
    }
  } else {
    console.log(`模块路径不存在: ${modulePath}`);
  }
}

if (!ocrModule) {
  throw new Error('无法找到或加载OCR模块。请确保已编译C++代码。');
}

// 包装OCR函数以处理错误和JSON解析
module.exports = {
  // 带位置信息的OCR函数
  recognizeTextWithPositionFromImage: (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string') {
      throw new Error('图片路径无效');
    }

    const jsonResult = ocrModule.recognizeTextWithPositionFromImage(imagePath);
    console.log(`原生模块返回的JSON字符串长度: ${jsonResult ? jsonResult.length : 0}`);
    
    if (!jsonResult) {
      console.error('OCR识别失败: 返回空结果');
      return [];
    }

    try {
      // 检查JSON字符串是否为空或仅包含空格
      if (!jsonResult.trim()) {
        console.error('OCR识别返回空JSON字符串');
        return [];
      }
      
      // 检查结果是否以'['开头和']'结尾，确保是有效的JSON数组
      if (!(jsonResult.trim().startsWith('[') && jsonResult.trim().endsWith(']'))) {
        console.error('OCR识别返回的不是有效的JSON数组');
        console.error('返回字符串的前50个字符:', jsonResult.substring(0, 50));
        console.error('返回字符串的最后50个字符:', jsonResult.substring(jsonResult.length - 50));
        return [];
      }
      
      return JSON.parse(jsonResult);
    } catch (error) {
      console.error('JSON解析错误:', error.message);
      console.error('原始JSON字符串长度:', jsonResult.length);
      console.error('原始JSON字符串的前100个字符:', jsonResult.substring(0, 100));
      console.error('原始JSON字符串的最后100个字符:', jsonResult.substring(Math.max(0, jsonResult.length - 100)));
      
      // 尝试使用更安全的方式解析
      try {
        return JSON.parse(jsonResult.trim());
      } catch (e) {
        console.error('第二次JSON解析尝试也失败:', e.message);
        return [];
      }
    }
  },

  // 仅返回文本的简单OCR函数
  recognizeTextFromImage: (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string') {
      throw new Error('图片路径无效');
    }
    return ocrModule.recognizeTextFromImage(imagePath);
  }
}; 