#include <nan.h>
#include "improved_ocr_impl.h"

using namespace v8;

// 从文件路径识别文本 - 仅返回文本内容
NAN_METHOD(RecognizeTextFromImage) {
    if (info.Length() < 1 || !info[0]->IsString()) {
        Nan::ThrowTypeError("参数错误: 需要一个字符串路径参数");
        return;
    }
    
    Nan::Utf8String pathValue(info[0]);
    const char* imagePath = *pathValue;
    
    const char* result = recognizeTextFromImage(imagePath);
    info.GetReturnValue().Set(Nan::New<String>(result).ToLocalChecked());
}

// 从文件路径识别文本 - 返回带位置信息的JSON
NAN_METHOD(RecognizeTextWithPositionFromImage) {
    if (info.Length() < 1 || !info[0]->IsString()) {
        Nan::ThrowTypeError("参数错误: 需要一个字符串路径参数");
        return;
    }
    
    Nan::Utf8String pathValue(info[0]);
    const char* imagePath = *pathValue;
    
    const char* jsonResult = recognizeTextWithPositionFromImage(imagePath);
    info.GetReturnValue().Set(Nan::New<String>(jsonResult).ToLocalChecked());
}

// 初始化模块
NAN_MODULE_INIT(Init) {
    // 原始文本识别方法
    Nan::Set(target, 
             Nan::New<String>("recognizeTextFromImage").ToLocalChecked(),
             Nan::GetFunction(Nan::New<FunctionTemplate>(RecognizeTextFromImage)).ToLocalChecked());
    
    // 带位置信息的文本识别方法
    Nan::Set(target, 
             Nan::New<String>("recognizeTextWithPositionFromImage").ToLocalChecked(),
             Nan::GetFunction(Nan::New<FunctionTemplate>(RecognizeTextWithPositionFromImage)).ToLocalChecked());
}

NODE_MODULE(improved_ocr, Init) 