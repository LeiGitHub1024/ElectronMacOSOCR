const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露API
contextBridge.exposeInMainWorld('electronAPI', {
  // 从文件中识别文字
  recognizeFromFile: (filePath) => ipcRenderer.invoke('recognize-from-file', filePath),
  
  // 从剪贴板识别文字
  recognizeFromClipboard: () => ipcRenderer.invoke('recognize-from-clipboard'),
  
  // 打开文件选择对话框
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  
  // 剪贴板操作
  getClipboardImage: () => ipcRenderer.invoke('get-clipboard-image'),
  
  // 状态更新
  onStatusUpdate: (callback) => ipcRenderer.on('status-update', (_, status) => callback(status)),
  onError: (callback) => ipcRenderer.on('error', (_, error) => callback(error))
}); 