#import <Foundation/Foundation.h>
#import <Vision/Vision.h>
#import <AppKit/AppKit.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        if (argc != 2) {
            NSLog(@"用法: ./ocr_test_with_position <图片路径>");
            return 1;
        }
        
        NSString *imagePath = [NSString stringWithUTF8String:argv[1]];
        NSImage *image = [[NSImage alloc] initWithContentsOfFile:imagePath];
        
        if (!image) {
            NSLog(@"错误: 无法加载图片 %@", imagePath);
            return 1;
        }
        
        // 获取图片尺寸
        NSSize imageSize = image.size;
        NSLog(@"图片尺寸: %.0f x %.0f", imageSize.width, imageSize.height);
        
        // 转换为 CGImage 以便 Vision 框架使用
        CGImageRef cgImage = [image CGImageForProposedRect:nil context:nil hints:nil];
        if (!cgImage) {
            NSLog(@"错误: 无法转换为 CGImage");
            return 1;
        }
        
        // 创建处理请求
        __block NSMutableArray *recognizedItems = [NSMutableArray array];
        VNRecognizeTextRequest *textRequest = [[VNRecognizeTextRequest alloc] initWithCompletionHandler:
            ^(VNRequest * _Nonnull request, NSError * _Nullable error) {
                if (error) {
                    NSLog(@"OCR 错误: %@", error.localizedDescription);
                    return;
                }
                
                // 收集结果
                for (VNRecognizedTextObservation *observation in request.results) {
                    // 获取高置信度文本
                    VNRecognizedText *topCandidate = [[observation topCandidates:1] firstObject];
                    if (topCandidate) {
                        // 获取边界框信息 (Vision框架中的坐标是归一化的，0-1)
                        CGRect boundingBox = observation.boundingBox;
                        
                        // 转换为图片坐标系 (左上角为原点，单位是像素)
                        // 注意: Vision的坐标系原点在左下角，而我们想要的是左上角为原点
                        CGFloat x = boundingBox.origin.x * imageSize.width;
                        // 翻转Y坐标，因为Vision的坐标系Y轴与图片坐标系相反
                        CGFloat y = (1 - boundingBox.origin.y - boundingBox.size.height) * imageSize.height;
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
            return 1;
        }
        
        // 等待异步处理完成
        [[NSRunLoop currentRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:2.0]];
        
        if (recognizedItems.count > 0) {
            NSLog(@"OCR 识别结果 (共 %lu 项):", (unsigned long)recognizedItems.count);
            
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
            
            // 输出识别结果
            for (NSDictionary *item in recognizedItems) {
                NSDictionary *box = item[@"boundingBox"];
                NSLog(@"文本: %@", item[@"text"]);
                NSLog(@"  位置: X=%.0f, Y=%.0f, 宽=%.0f, 高=%.0f", 
                      [box[@"x"] floatValue], 
                      [box[@"y"] floatValue], 
                      [box[@"width"] floatValue], 
                      [box[@"height"] floatValue]);
                NSLog(@"  置信度: %.2f", [item[@"confidence"] floatValue]);
            }
            
            // 将结果输出为JSON格式
            NSError *jsonError = nil;
            NSData *jsonData = [NSJSONSerialization dataWithJSONObject:recognizedItems options:NSJSONWritingPrettyPrinted error:&jsonError];
            if (jsonError) {
                NSLog(@"JSON序列化错误: %@", jsonError.localizedDescription);
            } else {
                NSString *jsonResult = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
                NSString *outputPath = [NSString stringWithFormat:@"%@.json", [imagePath stringByDeletingPathExtension]];
                [jsonResult writeToFile:outputPath atomically:YES encoding:NSUTF8StringEncoding error:nil];
                NSLog(@"结果已保存到: %@", outputPath);
            }
        } else {
            NSLog(@"未能识别任何文本");
        }
        
        NSLog(@"测试完成");
    }
    return 0;
} 