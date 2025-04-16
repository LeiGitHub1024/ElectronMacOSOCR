const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 导入OCR模块
const ocrModule = require('./ocr_module');

let mainWindow;

// 创建窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载HTML页面
  mainWindow.loadFile('index.html');
  
  // 开发环境打开DevTools
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 处理OCR请求
ipcMain.handle('recognize-from-file', async (_, filePath) => {
  try {
    const results = await ocrModule.recognizeTextWithPositionFromImage(filePath);
    return {
      success: true,
      data: results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 处理打开文件对话框请求
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
    ]
  });
  
  if (result.canceled) {
    return { canceled: true };
  }
  
  return {
    canceled: false,
    filePath: result.filePaths[0]
  };
});

// 处理剪贴板OCR请求
ipcMain.handle('ocr:recognize-text-with-position', async (event, imagePath) => {
    try {
        const results = await ocrModule.recognizeTextWithPositionFromImage(imagePath);
        return results;
    } catch (error) {
        console.error('OCR识别失败:', error);
        return [];
    }
}); 