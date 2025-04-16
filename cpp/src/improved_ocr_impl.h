#ifndef IMPROVED_OCR_IMPL_H
#define IMPROVED_OCR_IMPL_H

#ifdef __OBJC__
#import <Foundation/Foundation.h>
#import <Vision/Vision.h>

@interface ImprovedOCRImplementation : NSObject

// 从图片路径进行 OCR 识别，返回包含位置信息的结果
+ (NSArray *)recognizeTextWithPositionFromImage:(NSString *)imagePath;

// 原来的文本识别方法（仅返回文本内容）
+ (NSString *)recognizeTextFromImage:(NSString *)imagePath;

@end
#endif // __OBJC__

// C/C++ 接口
#ifdef __cplusplus
extern "C" {
#endif

// 原始C接口函数 - 仅返回文本
const char* recognizeTextFromImage(const char* imagePath);

// 新增C接口函数 - 返回带位置信息的JSON字符串
const char* recognizeTextWithPositionFromImage(const char* imagePath);

#ifdef __cplusplus
}
#endif

#endif // IMPROVED_OCR_IMPL_H 