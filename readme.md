

# 🧪【技术调研】Electron 调用 macOS 系统 OCR 文字提取接口

## 一、背景

最近在做Electron应用的 OCR 文字提取功能，最开始的方案是调用云端接口。这种做法吧，确实简单，丢个图就能返回结果。但云端 OCR 有两个天然痛点：

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


#### 🧩 2.3 那怎么在 Electron 里用？

写好原生模块之后，咱们得把它变成 Electron 能用的样子。思路是：**把源码用 `binding.gyp` 配好，通过 `node-gyp` 编译成一个 `.node` 文件（这是 Node.js 原生模块的二进制格式），然后 Electron 项目里就能愉快地 `require()` 它了。**

具体流程如下：

1. **配置 `binding.gyp`**  
   这是整个构建流程的“说明书”，告诉 `node-gyp` 哪些文件需要编译，用什么编译器，链接哪些系统库等。

2. **编译生成 `.node` 文件**  
   用 `node-gyp configure && node-gyp build`，就能把 `.mm` 源码变成平台相关的 `.node` 二进制文件。

3. **Electron 中使用**  
   在你的 Electron 主进程或渲染进程中，直接用：
   ```js
   const nativeOcr = require('./build/Release/improved_ocr.node');
   ```
   然后就能像调用 JS 模块一样使用里面导出的方法啦！

---

###¥ 🤔2.4 那 `binding.gyp` 到底是个啥？

简单来说，`binding.gyp` 就像是 C++ 世界里的 `package.json` + `webpack.config.js` ——  
它告诉 `node-gyp`：

- 我有哪些源码文件要编译（比如 `.cpp`、`.mm`）？
- 要链接哪些系统库（比如 macOS 的 Vision 框架）？
- 编译结果叫什么名字？
- 针对不同平台（macOS、Windows、Linux）要不要设置不同参数？

一个最小可用的 `binding.gyp` 看起来像这样：

```json
{
  "targets": [
    {
      "target_name": "improved_ocr",
      "sources": [
        "improved_ocr_impl.mm",
        "improved_node_binding.mm"
      ],
      "xcode_settings": {
        "OTHER_LDFLAGS": ["-framework", "Vision", "-framework", "Foundation"]
      }
    }
  ]
}
```

---

#### 📦 2.5 Electron 中怎么集成？

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

## 三、评估

### 1.macOS OCR API 功能特性

- 首次引入版本：macOS Monterey（12.0）
- 主要支持版本：macOS Monterey（12.x）、macOS Ventura（13.x）、macOS Sonoma（14.x）
- 支持的图片格式：JPEG、PNG、TIFF、WEBP 等常见格式；PDF（扫描版）在 macOS Ventura 起支持
- 支持的语言：英语、中文（简/繁）、法语、德语、意大利语、日语、韩语、葡萄牙语、西班牙语、乌克兰语、俄语等。

### 2. 性能和效果粗略评估

准确性：macOS Vision 框架的 OCR 准确率较高，对英文、中文、复杂背景、倾斜文本和特殊字体适应性好，但不支持竖排文本。参考[stackoverflow](https://stackoverflow.com/questions/78644854/japanese-vertical-text-recognition-with-vnrecognizetextrequest-not-working#:~:text=I%27m%20using%20the%20Apple%20OCR,encountering%20issues%20with%20vertical%20text)

资源占用：OCR 运行时 CPU/GPU 使用率高，单次识别大约消耗 20~30MB 内存. 参考[stackoverflow](https://stackoverflow.com/questions/75792122/working-with-vision-text-recognition-swift-on-ios-15-6-and-memory-grows-25mb#:~:text=I%20need%20to%20do%20text,Any%20suggestions)

兼容性与鲁棒性：可良好处理不同分辨率、字体、字号和中英文混排，图像质量越高识别效果越佳，对极端情况（如非常模糊的图像）识别准确率会下降。


### 3. 实测效果

为了验证 macOS 自带 OCR 的可用性，用不同尺寸、大小、文本密度的图片跑了一轮测试，看看它在真实场景下的表现到底怎么样。使用的是打包后的 Node 二进制文件（大小约 64KB），调用系统能力进行图像文字识别。

尺寸（px） | 大小（KB） | 识别字符数 | 处理时间（秒）
8199 x 8192 | 19109.00 | 987 | 3.234
3840 x 2160 | 1891.40 | 2051 | 2.258
3840 x 2160 | 9287.49 | 0 | 1.192
9999 x 9992 | 39208.45 | 1138 | 2.573
640 x 487 | 119.56 | 236 | 1.207
1242 x 1242 | 154.88 | 0 | 1.133
3840 x 2160 | 2984.63 | 134 | 1.241
756 x 748 | 39.86 | 118 | 1.117

🎯 小结：
平均处理时间 在 1.2 秒左右；
超大图片（近 40M） 处理时间也稳定在 3 秒内，表现非常稳；
识别结果质量与图片内容密度强相关，并非完全由尺寸或大小决定；
有的高分辨率图片识别字符数为 0，说明图中可能是图形/复杂背景/乱码，OCR 本身对内容可读性要求较高。

---

## ✅ 总结一句话

初步确认可以用macOS自带的 OCR 能力替代云端 OCR 服务。

代码详见：
https://github.com/LeiGitHub1024/ElectronMacOSOCR
---