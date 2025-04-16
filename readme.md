

# 🧪【技术调研】Electron 调用 macOS 系统 OCR 文字提取接口

## 一、背景

最近在做大象的 OCR 文字提取功能，最开始的方案是调用云端接口。这种做法吧，确实简单，丢个图就能返回结果。但云端 OCR 有两个天然痛点：

- 每次都得等网络响应，用户体验不够丝滑。
- 调用多了要花钱，咱也不想服务器账单爆炸。

后来无意间发现——嘿，微信桌面版已经能做到**本地 OCR 提取**了，再一查，macOS 从 **10.15** 开始就内置了 `Vision` 框架，支持本地 OCR，而且识别效果还不错。

于是思路一转：**能不能在 Electron 里，直接调 macOS 的原生 OCR 接口，把识别这事儿全搞本地化？**

就有了这篇技术探索记录。

---

## 二、技术方案

### 1. 整体架构

项目采用 **Electron + Native Module** 的架构，主要分为三个部分：

- **Electron 主进程**：负责应用的生命周期管理和 IPC 通信  
- **Electron 渲染进程**：负责 UI 展示和用户交互  
- **Native Module**：负责调用 macOS 系统 OCR 接口  

---

### 2. 技术实现细节

#### 🧱 2.1 系统架构图

```
+--------------------+
| Electron 渲染进程  |
| UI 展示 + 用户交互 |
+--------------------+
          |
          | IPC 通信
          ↓
+--------------------+
| Electron 主进程    |
| 生命周期 + 调用接口 |
+--------------------+
          |
          | N-API 调用
          ↓
+--------------------+
| Native Module      |
| macOS OCR 接口调用 |
+--------------------+
```

简而言之：

- 渲染进程管 UI 和用户交互  
- 主进程负责协调和发请求  
- 真正干活的是原生模块，它和 macOS 的 OCR API 打交道  

---

#### 🧠 2.2 原生模块怎么写的？

原生模块是用 **Node.js 的 N-API + node-gyp** 搭出来的，C++ 和 Objective-C++ 混编。

主要文件结构如下：

- `improved_ocr_impl.mm`：跟 macOS 的 Vision 框架交互，负责真正的 OCR 操作  
- `improved_node_binding.mm`：N-API 的胶水层，桥接 JS 和 C++  
- `binding.gyp`：构建配置文件  

#### 🧠 2.3 写好后如何给Electron用？

用bingding.gyp打包成二进制node文件，然后就可以在Electron中使用啦。
bingding.gyp是啥呢，



---

#### 📦 2.3 Electron 中怎么集成？

原生模块搞好了，就轮到 Electron 登场。

写了一个封装模块 `ocr_module.js`，可以在 JavaScript 里用起来也很顺手：

**使用示例：**

```js
const path = require('path');
const modulePath = path.resolve(__dirname, '../cpp/build/Release/improved_ocr.node');
const ocrModule = require(modulePath);
const result = await ocrModule.recognizeText('/path/to/image.png');
console.log(result);
```

---

## 三、性能和效果评估（待补）


### 1. 性能和效果指标
这里放一张表格，记录了不同图片尺寸下，单次识别的耗时。

### 2. 实测效果



---

## ✅ 总结一句话

macOS 自带的 OCR 能力 + Electron 的跨平台能力，能让我们**不依赖云端服务，就实现 OCR 文字识别**，体验好，响应快，还省钱。
代码详见：

---