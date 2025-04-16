'use strict';

/**
 * 改进版 macOS OCR 文字识别模块
 * 支持获取文本的位置信息
 */

const path = require('path');
const fs = require('fs');

// 如果编译成功，加载原生模块，否则使用本地测试实现
let nativeBinding;
try {

    const cppModulePath = path.join(__dirname, '..', 'build','Release', 'improved_ocr.node');
    console.log('尝试加载cpp目录中的原生模块:', cppModulePath);
    nativeBinding = require(cppModulePath);
    console.log('cpp目录中的原生模块加载成功');

} catch (e) {
  console.warn('无法加载原生模块，使用本地测试实现');
  console.warn(e.message);
  
}

/**
 * 改进版 macOS OCR 文字识别模块
 * @module improved_ocr
 */
module.exports = {
  /**
   * 从图片文件识别文字（仅返回文本内容）
   * @param {string} imagePath - 图片文件路径
   * @returns {string} 识别结果文本
   */
  recognizeTextFromImage: (imagePath) => {
    if (typeof imagePath !== 'string') {
      throw new TypeError('图片路径必须是字符串');
    }
    return nativeBinding.recognizeTextFromImage(imagePath);
  },
  
  /**
   * 从图片文件识别文字（返回带位置信息的结果）
   * @param {string} imagePath - 图片文件路径
   * @returns {Array} 识别结果，包含文本内容和位置信息
   */
  recognizeTextWithPositionFromImage: (imagePath) => {
    if (typeof imagePath !== 'string') {
      throw new TypeError('图片路径必须是字符串');
    }
    const jsonResult = nativeBinding.recognizeTextWithPositionFromImage(imagePath);
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
    } catch (e) {
      console.error('JSON解析错误:', e.message);
      console.error('原始JSON字符串长度:', jsonResult.length);
      console.error('原始JSON字符串的前100个字符:', jsonResult.substring(0, 100));
      console.error('原始JSON字符串的最后100个字符:', jsonResult.substring(Math.max(0, jsonResult.length - 100)));
      
      // 尝试使用更安全的方式解析
      try {
        return JSON.parse(jsonResult.trim());
      } catch (error) {
        console.error('第二次JSON解析尝试也失败:', error.message);
        return [];
      }
    }
  }
}; 