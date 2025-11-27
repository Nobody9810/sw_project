# 中文圣训集数据爬取指南

## 数据源选择

由于中文圣训集数据相对稀缺，以下是可用的数据源和获取方式：

### 1. 在线网站数据源

#### 伊斯兰之家 (islamhouse.com)
- **网址**: https://islamhouse.com/zh/books/
- **说明**: 提供部分中文伊斯兰书籍，可能包含圣训集
- **使用方法**: 
  ```bash
  python manage.py crawl_hadith --source islamhouse --url "具体页面URL" --collection "布哈里圣训集"
  ```

#### 其他可能的中文网站
- 中穆网
- 伊斯兰之光
- 各地方伊斯兰协会网站

### 2. 本地文件导入（推荐）

如果你已经有中文圣训集的文本文件或PDF，可以：

#### 方式A：从TXT文件导入
```bash
python manage.py crawl_hadith --source local_file --file path/to/hadith.txt --collection "布哈里圣训集"
```

**TXT文件格式示例**：
```
第一章：信仰的开始
这是第一章的内容...

第二章：清洁
这是第二章的内容...
```

#### 方式B：从JSON文件导入（推荐）
```bash
python manage.py crawl_hadith --source local_file --file path/to/hadith.json
```

**JSON文件格式**：
```json
{
  "collection": "布哈里圣训集",
  "chapters": [
    {
      "title": "第一章：信仰的开始",
      "content": "这是第一章的详细内容..."
    },
    {
      "title": "第二章：清洁",
      "content": "这是第二章的详细内容..."
    }
  ]
}
```

**多个圣训集的JSON格式**：
```json
[
  {
    "collection": "布哈里圣训集",
    "chapters": [...]
  },
  {
    "collection": "穆斯林圣训集",
    "chapters": [...]
  }
]
```

### 3. 手动整理数据

如果找不到现成的数据源，建议：

1. **从PDF提取**：
   - 使用PDF阅读器打开圣训集PDF
   - 复制文本内容
   - 整理成TXT或JSON格式
   - 使用本地文件导入

2. **从书籍录入**：
   - 手动输入或OCR识别
   - 整理成标准格式
   - 导入数据库

## 安装依赖

爬虫需要以下Python包（如果还没有安装）：

```bash
pip install beautifulsoup4 lxml
```

## 使用示例

### 1. 试运行（不保存数据）
```bash
python manage.py crawl_hadith --source local_file --file data/bukhari.json --dry-run
```

### 2. 从JSON文件导入
```bash
python manage.py crawl_hadith --source local_file --file data/bukhari.json
```

### 3. 从TXT文件导入
```bash
python manage.py crawl_hadith --source local_file --file data/bukhari.txt --collection "布哈里圣训集"
```

### 4. 从网站爬取（需要提供URL）
```bash
python manage.py crawl_hadith --source islamhouse --url "https://islamhouse.com/zh/books/xxx" --collection "布哈里圣训集" --delay 2
```

## 数据格式要求

### 章节标题格式
支持以下格式：
- `第一章：信仰的开始`
- `第1章：信仰的开始`
- `第一章 信仰的开始`
- `Chapter 1: 信仰的开始`

### 内容格式
- 支持多行文本
- 会自动去除多余空白
- 保留段落结构

## 注意事项

1. **版权问题**：确保你有权使用和存储这些数据
2. **数据准确性**：导入前请检查数据完整性
3. **编码问题**：确保文件使用UTF-8编码
4. **数据去重**：脚本会自动跳过已存在的章节

## 数据源推荐

### 获取中文圣训集的建议途径：

1. **购买正版书籍**：购买中文版圣训集，然后手动录入或OCR
2. **联系出版社**：联系相关出版社获取电子版授权
3. **学术资源**：查阅学术论文和研究中引用的圣训
4. **开源项目**：查找GitHub等平台上的开源圣训数据集

## 下一步

导入数据后，数据将存储在数据库中，设置为只读模式。然后可以：
1. 开发前端页面展示
2. 实现搜索功能
3. 添加阅读进度记录

