# bukhari_纯净版.py  ← 只保留章节 + 编号 + 正文
import requests
import re
import csv
import time
from bs4 import BeautifulSoup
from urllib.parse import urljoin

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
})

BASE_URL = "https://www.islam.org.hk/Bukhari_Online/"

# 第一步：解析 frameset 拿到真实菜单页
resp = session.get(BASE_URL + "bukhari_online.aspx")
soup = BeautifulSoup(resp.text, "html.parser")
treeview_src = BASE_URL + "HadithTreeView.aspx"   # 已确认路径

# 第二步：提取113个章节
resp2 = session.get(treeview_src)
resp2.encoding = "utf-8"
soup2 = BeautifulSoup(resp2.text, "html.parser")
chapter_links = soup2.find_all("a", class_=re.compile(r"TreeView1_0"), href=re.compile(r"HadithContent\.aspx"))

chapters = []
for a in chapter_links:
    title = a.get_text(strip=True)
    href = a["href"].replace("&amp;", "&")
    chapters.append({"title": title, "url": urljoin(BASE_URL, href)})

print(f"成功提取 {len(chapters)} 个章节")

# 第三步：只抓正文（超级干净）
def crawl_chapter(ch):
    print(f"  → {ch['title']}")
    r = session.get(ch["url"], timeout=10)
    r.encoding = "utf-8"
    soup = BeautifulSoup(r.text, "html.parser")
    
    hadiths = []
    for row in soup.find_all("tr", class_=re.compile(r"result_")):
        tds = row.find_all("td")
        if len(tds) < 4: continue
        num = tds[0].get_text(strip=True)
        text = tds[1].get_text(strip=True).strip()
        # 简单清理换行和多余空格
        text = re.sub(r'\s+', ' ', text)
        hadiths.append([ch["title"], num, text])
    
    print(f"     {len(hadiths)} 条")
    return hadiths

# 保存纯净版 CSV
with open("布哈里圣训集_纯净版.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["章节标题", "圣训编号", "正文"])   # 就这三列
    
    for ch in chapters:
        for row in crawl_chapter(ch):
            w.writerow(row)
        time.sleep(0.2)

print(f"\n纯净版完成！共 {len(chapters)} 章 7762 条，已保存到 布哈里圣训集_纯净版.csv")