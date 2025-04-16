#!/usr/bin/env node

/**
 * 测试改进版 macOS OCR 模块
 */

const path = require('path');
const fs = require('fs');
const improvedOcr = require('./improved_ocr_module');

// 检查命令行参数
if (process.argv.length < 3) {
  console.log(`
使用方法: node test_node_module.js <图片路径> [选项]

选项:
  --text-only    仅输出文本内容，不包含位置信息
  --save <文件>  将结果保存到指定文件
  
示例:
  node test_node_module.js test.png
  node test_node_module.js test.png --text-only
  node test_node_module.js test.png --save result.json
  `);
  process.exit(1);
}

// 解析命令行参数
const imagePath = process.argv[2];
const textOnly = process.argv.includes('--text-only');
const saveIndex = process.argv.indexOf('--save');
const saveFile = saveIndex > -1 ? process.argv[saveIndex + 1] : null;

// 检查文件是否存在
if (!fs.existsSync(imagePath)) {
  console.error(`错误: 文件不存在 "${imagePath}"`);
  process.exit(1);
}

console.log(`处理图片: ${imagePath}`);

// 执行OCR识别
try {
  if (textOnly) {
    // 仅获取文本内容
    console.log('\n=== 文本识别结果 ===');
    const text = improvedOcr.recognizeTextFromImage(imagePath);
    console.log(text);
  } else {
    // 获取带位置信息的结果
    console.log('\n=== 带位置信息的识别结果 ===');
    const results = improvedOcr.recognizeTextWithPositionFromImage(imagePath);
    
    // 输出结果
    console.log(`共识别 ${results.length} 个文本项:`);
    results.forEach((item, index) => {
      console.log(`[${index + 1}] 文本: ${item.text}`);
      const box = item.boundingBox;
      console.log(`    位置: X=${Math.round(box.x)}, Y=${Math.round(box.y)}, 宽=${Math.round(box.width)}, 高=${Math.round(box.height)}`);
      console.log(`    置信度: ${(item.confidence * 100).toFixed(1)}%`);
    });
    
    // 保存结果
    if (saveFile) {
      fs.writeFileSync(saveFile, JSON.stringify(results, null, 2), 'utf8');
      console.log(`\n结果已保存到: ${saveFile}`);
    }
  }
  
  console.log('\nOCR 完成');
} catch (error) {
  console.error('识别失败:', error.message);
  process.exit(1);
} 