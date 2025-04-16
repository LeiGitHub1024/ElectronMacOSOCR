#import "improved_ocr_impl.h"
#import <Foundation/Foundation.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        if (argc != 2) {
            NSLog(@"用法: ./test_improved_ocr <图片路径>");
            return 1;
        }
        
        // 获取图片路径
        const char* imagePath = argv[1];
        NSLog(@"处理图片: %s", imagePath);
        
        // 测试原始文本识别功能
        NSLog(@"=== 测试原始文本识别功能 ===");
        const char* textResult = recognizeTextFromImage(imagePath);
        NSLog(@"识别结果:\n%s", textResult);
        
        // 测试带位置信息的文本识别功能
        NSLog(@"\n=== 测试带位置信息的文本识别功能 ===");
        const char* jsonResult = recognizeTextWithPositionFromImage(imagePath);
        NSLog(@"原始JSON结果长度: %lu", strlen(jsonResult));
        
        if (strlen(jsonResult) <= 2) { // 只有 [] 或空
            NSLog(@"错误: 没有识别到任何文本或JSON结果为空");
            return 1;
        }
        
        // 将JSON格式化输出
        NSData *jsonData = [NSData dataWithBytes:jsonResult length:strlen(jsonResult)];
        NSLog(@"JSON数据长度: %lu", (unsigned long)jsonData.length);
        
        NSError *jsonError = nil;
        id jsonObj = [NSJSONSerialization JSONObjectWithData:jsonData options:0 error:&jsonError];
        
        if (jsonError || !jsonObj) {
            NSLog(@"JSON解析错误: %@", jsonError);
            NSLog(@"原始JSON字符串: %s", jsonResult);
            return 1;
        }
        
        NSError *prettyError = nil;
        NSData *prettyJsonData = [NSJSONSerialization dataWithJSONObject:jsonObj options:NSJSONWritingPrettyPrinted error:&prettyError];
        
        if (prettyError || !prettyJsonData) {
            NSLog(@"JSON格式化错误: %@", prettyError);
            return 1;
        }
        
        NSString *prettyJsonString = [[NSString alloc] initWithData:prettyJsonData encoding:NSUTF8StringEncoding];
        
        NSLog(@"JSON 结果 (前100个字符):\n%@", [prettyJsonString substringToIndex:MIN(100, prettyJsonString.length)]);
        
        // 保存JSON结果到文件
        NSString *outputPath = [NSString stringWithFormat:@"%s.improved.json", imagePath];
        NSError *writeError = nil;
        [prettyJsonString writeToFile:outputPath atomically:YES encoding:NSUTF8StringEncoding error:&writeError];
        
        if (writeError) {
            NSLog(@"写入文件错误: %@", writeError);
            return 1;
        }
        
        NSLog(@"结果已保存到: %@", outputPath);
        NSLog(@"测试完成");
    }
    return 0;
} 