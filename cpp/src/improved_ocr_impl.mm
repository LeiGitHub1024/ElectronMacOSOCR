#import "improved_ocr_impl.h"
#import <Foundation/Foundation.h>
#import <Vision/Vision.h>
#import <AppKit/AppKit.h>

// 全局静态变量，用于在 C 接口和 Objective-C 接口之间传递数据
static NSString *lastRecognizedText = nil;
static NSString *lastJsonResult = nil;
static NSString *lastErrorMessage = nil;

@implementation ImprovedOCRImplementation

#pragma mark - 带位置信息的OCR识别

// OCR核心功能，处理图片并返回带位置信息的识别结果
+ (NSArray *)performOCRWithPositionOnImage:(NSImage *)image {
    if (!image) {
        return @[];
    }
    
    // 获取图片尺寸
    NSSize imageSize = image.size;
    
    // 打印图片尺寸信息
    NSLog(@"图片原始尺寸: %.0f x %.0f", imageSize.width, imageSize.height);
    
    // 转换为 CGImage 以便 Vision 框架使用
    CGImageRef cgImage = [image CGImageForProposedRect:nil context:nil hints:nil];
    if (!cgImage) {
        return @[];
    }
    
    // 打印CGImage尺寸
    size_t cgWidth = CGImageGetWidth(cgImage);
    size_t cgHeight = CGImageGetHeight(cgImage);
    NSLog(@"CGImage尺寸: %zu x %zu", cgWidth, cgHeight);
    
    // 计算实际的缩放因子
    CGFloat scaleX = (CGFloat)cgWidth / imageSize.width;
    CGFloat scaleY = (CGFloat)cgHeight / imageSize.height;
    NSLog(@"检测到缩放因子: %.2f x %.2f", scaleX, scaleY);
    
    // 使用CGImage的实际尺寸
    imageSize = NSMakeSize(cgWidth, cgHeight);
    NSLog(@"使用实际尺寸: %.0f x %.0f", imageSize.width, imageSize.height);
    
    // 创建处理请求
    __block NSMutableArray *recognizedItems = [NSMutableArray array];
    VNRecognizeTextRequest *textRequest = [[VNRecognizeTextRequest alloc] initWithCompletionHandler:
        ^(VNRequest * _Nonnull request, NSError * _Nullable error) {
            if (error) {
                NSLog(@"OCR 错误: %@", error.localizedDescription);
                return;
            }
            
            NSLog(@"开始处理OCR结果...");
            NSLog(@"识别到 %lu 个文本区域", (unsigned long)request.results.count);
            
            // 收集结果
            for (VNRecognizedTextObservation *observation in request.results) {
                // 获取高置信度文本
                VNRecognizedText *topCandidate = [[observation topCandidates:1] firstObject];
                if (topCandidate) {
                    // 获取边界框信息 (Vision框架中的坐标是归一化的，0-1)
                    CGRect boundingBox = observation.boundingBox;
                                        
                    // 转换为图片坐标系 (左上角为原点，单位是像素)
                    // Vision框架使用的是左下角为原点的坐标系统，需要转换为左上角为原点
                    CGFloat x = boundingBox.origin.x * imageSize.width;
                    CGFloat y = (1.0 - boundingBox.origin.y - boundingBox.size.height) * imageSize.height;
                    CGFloat width = boundingBox.size.width * imageSize.width;
                    CGFloat height = boundingBox.size.height * imageSize.height;
                    
                    
                    // 创建包含文本和位置的字典
                    NSDictionary *item = @{
                        @"text": topCandidate.string,
                        @"confidence": @(topCandidate.confidence),
                        @"boundingBox": @{
                            @"x": @(x),
                            @"y": @(y),
                            @"width": @(width),
                            @"height": @(height)
                        }
                    };
                    
                    [recognizedItems addObject:item];
                }
            }
            
            NSLog(@"OCR结果处理完成，共处理 %lu 个文本区域", (unsigned long)recognizedItems.count);
        }
    ];
    
    textRequest.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
    textRequest.usesLanguageCorrection = YES;
    
    // 支持中文、英文和数字
    textRequest.recognitionLanguages = @[@"zh-CN", @"en-US"];
    
    // 创建处理请求处理器
    VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:cgImage options:@{}];
    
    // 执行请求
    NSError *error = nil;
    [handler performRequests:@[textRequest] error:&error];
    
    if (error) {
        NSLog(@"OCR 处理错误: %@", error.localizedDescription);
        return @[];
    }
    
    // 等待异步处理完成
    [[NSRunLoop currentRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:1.0]];
    
    // 按从上到下的顺序排序结果
    [recognizedItems sortUsingComparator:^NSComparisonResult(NSDictionary *item1, NSDictionary *item2) {
        CGFloat y1 = [item1[@"boundingBox"][@"y"] floatValue];
        CGFloat y2 = [item2[@"boundingBox"][@"y"] floatValue];
        if (fabs(y1 - y2) < 20) {  // 如果Y坐标接近，认为是同一行，按X排序
            CGFloat x1 = [item1[@"boundingBox"][@"x"] floatValue];
            CGFloat x2 = [item2[@"boundingBox"][@"x"] floatValue];
            return x1 > x2 ? NSOrderedDescending : NSOrderedAscending;
        }
        return y1 > y2 ? NSOrderedDescending : NSOrderedAscending;
    }];
    
    return recognizedItems;
}

// 从文件路径识别文本并返回位置信息
+ (NSArray *)recognizeTextWithPositionFromImage:(NSString *)imagePath {
    NSImage *image = [[NSImage alloc] initWithContentsOfFile:imagePath];
    if (!image) {
        NSLog(@"错误: 无法加载图片 %@", imagePath);
        return @[];
    }
    return [self performOCRWithPositionOnImage:image];
}

#pragma mark - 原始OCR识别（仅返回文本）

// OCR 核心功能，处理图片并返回仅包含文本的结果
+ (NSString *)performOCROnImage:(NSImage *)image {
    // 获取带位置信息的结果
    NSArray *results = [self performOCRWithPositionOnImage:image];
    
    // 提取文本内容
    NSMutableString *recognizedText = [NSMutableString string];
    for (NSDictionary *item in results) {
        [recognizedText appendFormat:@"%@\n", item[@"text"]];
    }
    
    return recognizedText.length > 0 ? recognizedText : @"未能识别任何文本";
}

// 从文件路径识别文本（仅文本）
+ (NSString *)recognizeTextFromImage:(NSString *)imagePath {
    NSImage *image = [[NSImage alloc] initWithContentsOfFile:imagePath];
    return [self performOCROnImage:image];
}

@end

// C 接口实现
extern "C" {
    
// 用于准备返回给 Node.js 的字符串
const char* prepareResultString(NSString *text) {
    if (!text) {
        return strdup("");
    }
    
    lastRecognizedText = [text copy];
    return [lastRecognizedText UTF8String];
}

// 用于准备返回给 Node.js 的 JSON 字符串
const char* prepareJsonResultString(NSArray *results) {
    if (!results || results.count == 0) {
        return strdup("[]");
    }
    
    NSError *error = nil;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:results options:0 error:&error];
    
    if (error) {
        NSLog(@"JSON序列化错误: %@", error.localizedDescription);
        return strdup("[]");
    }
    
    lastJsonResult = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    return [lastJsonResult UTF8String];
}

// 从图片路径识别文本 - 仅返回文本
const char* recognizeTextFromImage(const char* imagePath) {
    @autoreleasepool {
        NSString *path = [NSString stringWithUTF8String:imagePath];
        NSString *result = [ImprovedOCRImplementation recognizeTextFromImage:path];
        return prepareResultString(result);
    }
}

// 从图片路径识别文本 - 返回带位置信息的 JSON
const char* recognizeTextWithPositionFromImage(const char* imagePath) {
    @autoreleasepool {
        NSLog(@"从图片路径识别文本: %s", imagePath);
        NSString *nsImagePath = [NSString stringWithUTF8String:imagePath];
        NSArray *results = [ImprovedOCRImplementation recognizeTextWithPositionFromImage:nsImagePath];
        NSLog(@"OCR识别结果数量: %lu", (unsigned long)results.count);
        
        if (results.count == 0) {
            NSLog(@"没有识别到任何文本");
            return strdup("[]");
        }
        
        // 序列化为JSON，使用更安全的选项
        NSError *error = nil;
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:results 
                                                          options:NSJSONWritingPrettyPrinted 
                                                            error:&error];
        
        if (!jsonData || error) {
            NSLog(@"JSON序列化失败: %@", error);
            return strdup("[]");
        }
        
        NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
        lastJsonResult = [jsonString copy];
        const char* result = strdup([lastJsonResult UTF8String]);
        return result;
    }
}

} 