#!/usr/bin/env node

/**
 * macOS OCR 测试运行脚本
 * 此脚本用于运行不同类型的OCR测试
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 显示帮助信息
function showHelp() {
  console.log(`
macOS OCR 测试工具

用法:
  node run_tests.js [命令] [选项]

命令:
  improved    测试改进版OCR（带位置信息）
  help        显示帮助信息

选项:
  --path      指定图片路径 (用于improved命令)
  --text-only 仅输出文本内容 (用于improved命令)
  --save      保存结果到文件 (用于improved命令)

示例:
  node run_tests.js improved --path ./temp/test.png  # 测试改进版OCR
  node run_tests.js improved --path ./temp/test.png --text-only  # 仅输出文本
`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help' || command === '--help') {
    showHelp();
    return;
  }
  
  // 确保在tests目录下
  const testsDir = __dirname;
  const rootDir = path.dirname(testsDir);
  
  switch (command) {
    case 'improved':
      // 测试改进版OCR（带位置信息）
      const imagePath = args.indexOf('--path') > -1 ? args[args.indexOf('--path') + 1] : null;
      const textOnly = args.includes('--text-only') ? '--text-only' : '';
      const saveIndex = args.indexOf('--save');
      const saveOption = saveIndex > -1 ? `--save ${args[saveIndex + 1]}` : '';
      
      if (!imagePath) {
        console.error('错误: 未指定图片路径');
        console.log('用法: node run_tests.js improved --path <图片路径>');
        return;
      }
      
      console.log(`测试改进版OCR: ${imagePath}`);
      try {
        execSync(`node ${path.join(testsDir, 'test_node_module.js')} "${imagePath}" ${textOnly} ${saveOption}`, { stdio: 'inherit' });
      } catch (error) {
        console.error('测试失败:', error.message);
      }
      break;
      
    default:
      console.error(`未知命令: ${command}`);
      showHelp();
      break;
  }
}

// 运行主函数
main().catch(error => {
  console.error('运行时错误:', error);
  process.exit(1);
}); 