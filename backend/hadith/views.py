from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import Hadith, HadithCollection
from .serializers import HadithSerializer, HadithCollectionSerializer

# quran/views.py  （新建也行，放哪都行）
from django.http import JsonResponse
import requests
import logging

logger = logging.getLogger(__name__)

# 古兰经章节中文名称映射（前114章）
QURAN_CHAPTER_NAMES_ZH = {
    1: "开端章（法谛海）",
    2: "黄牛章（百格勒）",
    3: "仪姆兰的家属章（阿黎仪姆兰）",
    4: "妇女章（尼萨仪）",
    5: "筵席章（马以代）",
    6: "牲畜章（艾奈阿姆）",
    7: "高处章（艾耳拉弗）",
    8: "战利品章（安法勒）",
    9: "忏悔章（讨白）",
    10: "优努斯章",
    11: "呼德章",
    12: "优素福章",
    13: "雷霆章（赖尔得）",
    14: "易卜拉欣章",
    15: "石谷章（希只尔）",
    16: "蜜蜂章（奈哈勒）",
    17: "夜行章（伊斯拉）",
    18: "山洞章（凯海弗）",
    19: "麦尔彦章",
    20: "塔哈章",
    21: "众先知章（安比雅）",
    22: "朝觐章（罕志）",
    23: "信士章（慕米农）",
    24: "光明章（努尔）",
    25: "准则章（弗尔干）",
    26: "众诗人章（舒尔拉）",
    27: "蚂蚁章（奈木勒）",
    28: "故事章（改赛素）",
    29: "蜘蛛章（安凯鲁特）",
    30: "罗马人章（鲁姆）",
    31: "鲁格曼章",
    32: "叩头章（赛直德）",
    33: "同盟军章（艾哈萨布）",
    34: "赛伯邑章",
    35: "创造者章（法颓尔）",
    36: "雅辛章",
    37: "列班者章（萨法特）",
    38: "萨德章",
    39: "队伍章（助迈尔）",
    40: "赦宥者章（阿斐尔）",
    41: "奉绥来特章",
    42: "协商章（舒拉）",
    43: "金饰章（助赫鲁弗）",
    44: "烟雾章（睹罕）",
    45: "屈膝章（查西叶）",
    46: "沙丘章（艾哈戛弗）",
    47: "穆罕默德章",
    48: "胜利章（费特哈）",
    49: "寝室章（侯主拉特）",
    50: "戛弗章",
    51: "播种者章（查里雅特）",
    52: "山岳章（突尔）",
    53: "星宿章（奈智姆）",
    54: "月亮章（改买尔）",
    55: "至仁主章（安赖哈曼）",
    56: "大事章（瓦格阿）",
    57: "铁章（哈迪德）",
    58: "辩诉者章（慕查底赖）",
    59: "放逐章（哈什尔）",
    60: "受考验的妇人章（慕姆太哈奈）",
    61: "列阵章（算夫）",
    62: "聚礼章（主麻）",
    63: "伪信者章（木那斐恭）",
    64: "相欺章（太昂卜尼）",
    65: "离婚章（特拉格）",
    66: "禁戒章（台哈列姆）",
    67: "国权章（姆勒克）",
    68: "笔章（努奈）",
    69: "真灾章（哈盖）",
    70: "天梯章（买阿列支）",
    71: "努哈章",
    72: "精灵章（精尼）",
    73: "披衣的人章（木赞密鲁）",
    74: "盖被的人章（木淡密鲁）",
    75: "复活章（格雅迈）",
    76: "人章（印萨尼）",
    77: "天使章（姆尔赛拉特）",
    78: "消息章（奈白易）",
    79: "急掣的章（纳即阿特）",
    80: "皱眉章（阿百塞）",
    81: "黯黮章（太克威尔）",
    82: "破裂章（印斐塔尔）",
    83: "称量不公章（太特斐弗）",
    84: "绽裂章（印史卡格）",
    85: "十二宫章（补鲁智）",
    86: "启明星章（塔里格）",
    87: "至尊章（艾尔拉）",
    88: "大灾章（阿史叶）",
    89: "黎明章（斐智尔）",
    90: "地方章（白赖德）",
    91: "太阳章（晒姆斯）",
    92: "黑夜章（赖以里）",
    93: "上午章（堵哈）",
    94: "开拓章（晒尔哈）",
    95: "无花果章（梯尼）",
    96: "血块章（阿赖格）",
    97: "高贵章（盖德尔）",
    98: "明证章（半以奈）",
    99: "地震章（齐勒萨里）",
    100: "奔驰的马队章（阿底雅特）",
    101: "大难章（戛里尔）",
    102: "竞赛富庶章（太卡素尔）",
    103: "时光章（阿素尔）",
    104: "诽谤者章（胡买宰）",
    105: "象章（斐里）",
    106: "古来氏章（古来氏）",
    107: "什物章（马欧尼）",
    108: "多福章（考赛尔）",
    109: "不信道的人们章（卡斐伦）",
    110: "援助章（奈斯尔）",
    111: "火焰章（赖海卜）",
    112: "忠诚章（以赫拉斯）",
    113: "曙光章（法赖格）",
    114: "世人章（拿斯）",
}

class HadithPagination(PageNumberPagination):
    """圣训分页配置"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class HadithViewSet(viewsets.ReadOnlyModelViewSet):
    """
    圣训只读视图集
    支持搜索、过滤和排序
    """
    queryset = Hadith.objects.all()
    serializer_class = HadithSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = HadithPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['text', 'chapter', 'collection_number']
    ordering_fields = ['collection_number', 'chapter', 'id']
    ordering = ['collection', 'collection_number']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        collection_id = self.request.query_params.get('collection')
        chapter = self.request.query_params.get('chapter')
        
        if collection_id:
            queryset = queryset.filter(collection_id=collection_id)
        if chapter:
            queryset = queryset.filter(chapter=chapter)
        
        # 返回 QuerySet，保持分页功能
        # 注意：排序将在 list() 方法中进行，以确保正确的数字排序
        return queryset.select_related('collection')
    
    def list(self, request, *args, **kwargs):
        """
        重写 list 方法，在获取数据后进行 Python 排序
        这样可以确保正确的数字排序，同时保持分页功能
        """
        # 先获取 queryset（已经应用了过滤）
        queryset = self.filter_queryset(self.get_queryset())
        
        # 先对所有过滤后的数据进行排序（确保整体排序正确）
        # 注意：这里只对当前查询的结果集排序，不会加载所有数据
        sorted_list = sorted(
            list(queryset),
            key=lambda x: (
                x.collection.name,
                x.chapter,
                int(''.join(filter(str.isdigit, x.collection_number)) or 0)
            )
        )
        
        # 手动处理分页
        paginator_class = self.pagination_class
        if paginator_class:
            paginator = paginator_class()
            paginator.request = request
            page_size = paginator.get_page_size(request)
            page_number = request.query_params.get(paginator.page_query_param, 1)
            try:
                page_number = int(page_number)
            except (TypeError, ValueError):
                page_number = 1
            
            total_count = len(sorted_list)
            start = (page_number - 1) * page_size
            end = start + page_size
            page_data = sorted_list[start:end]
            
            serializer = self.get_serializer(page_data, many=True)
            
            # 手动构建分页响应
            from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
            
            # 创建一个虚拟的page对象用于计算next和previous
            paginator_obj = Paginator(sorted_list, page_size)
            try:
                page_obj = paginator_obj.page(page_number)
            except (PageNotAnInteger, EmptyPage):
                page_obj = paginator_obj.page(1)
            
            # 设置分页器的page对象以便get_next_link等方法能正常工作
            paginator.page = page_obj
            
            # 构建分页响应
            response_data = {
                'count': total_count,
                'next': paginator.get_next_link() if page_obj.has_next() else None,
                'previous': paginator.get_previous_link() if page_obj.has_previous() else None,
                'results': serializer.data
            }
            
            return Response(response_data)
        
        # 如果没有分页，返回标准格式以保持前端兼容性
        serializer = self.get_serializer(sorted_list, many=True)
        return Response({
            'count': len(sorted_list),
            'next': None,
            'previous': None,
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def daily(self, request):
        """
        获取每日圣训（随机一条）
        """
        import random
        hadith = Hadith.objects.order_by('?').first()
        if hadith:
            serializer = self.get_serializer(hadith)
            return Response(serializer.data)
        return Response({'detail': '暂无圣训数据'}, status=404)


class HadithCollectionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    圣训集只读视图集
    """
    queryset = HadithCollection.objects.all()
    serializer_class = HadithCollectionSerializer
    permission_classes = [permissions.AllowAny]







def quran_proxy(request, edition, path=""):
    if not path:
        return JsonResponse({'error': '请指定章节号，例如：/api/hadith/quran/quran-uthmani/1/'}, status=400)
    
    # 移除末尾斜杠并确保路径格式正确
    clean_path = path.rstrip('/').strip()
    chapter = clean_path.split('/')[0]
    
    try:
        if edition == 'zho-majian':
            data = fetch_chinese_translation(chapter)
        else:  # 阿拉伯文
            data = fetch_arabic_text(chapter, edition)
        
        return JsonResponse(data, json_dumps_params={'ensure_ascii': False})
    
    except Exception as e:
        return JsonResponse({'error': f'无法获取古兰经数据: {str(e)}'}, status=502)
def fetch_arabic_text(chapter, edition):
    """获取阿拉伯原文，使用alquran.cloud作为主要数据源"""
    url = f"https://api.alquran.cloud/v1/surah/{chapter}/quran-uthmani"
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    
    data = response.json()
    if data.get('code') != 200 or not data.get('data'):
        raise ValueError('alquran.cloud API返回数据格式不正确')
    
    surah_data = data['data']
    # 优先从API响应中获取章节名称，如果没有则使用映射表作为备选
    chapter_name_zh = (
        surah_data.get('englishNameTranslation') or 
        surah_data.get('name') or 
        QURAN_CHAPTER_NAMES_ZH.get(int(chapter)) or 
        f'第 {chapter} 章'
    )
    formatted_data = {
        'chapter': int(chapter),
        'chapter_name_ar': surah_data.get('name', ''),
        'chapter_name': chapter_name_zh,
        'verses': [
            {
                'verse': verse.get('numberInSurah'),
                'text': verse.get('text', '')
            }
            for verse in surah_data.get('ayahs', [])
        ]
    }
    return formatted_data

def fetch_chinese_translation(chapter):
    """获取中文翻译，优先使用quran-api"""
    # 首先尝试quran-api的CDN版本
    primary_url = f"https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/zho-majian/{chapter}.json"
    
    try:
        response = requests.get(primary_url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # 处理quran-api的响应格式
        # quran-api 可能返回的格式：
        # 1. 直接是数组: [{verse: 1, text: "..."}, ...]
        # 2. 对象包含 verses: {verses: [...]}
        # 3. 对象包含 chapter.verses: {chapter: {verses: [...]}}
        verses = []
        if isinstance(data, list):
            # 如果直接是数组
            verses = data
        elif isinstance(data, dict):
            # 尝试不同的键
            if 'verses' in data:
                verses = data['verses']
            elif 'chapter' in data and isinstance(data['chapter'], dict) and 'verses' in data['chapter']:
                verses = data['chapter']['verses']
            # 尝试其他可能的键名
            elif 'ayahs' in data:
                verses = data['ayahs']
            elif 'data' in data and isinstance(data['data'], list):
                verses = data['data']
            elif 'data' in data and isinstance(data['data'], dict) and 'ayahs' in data['data']:
                verses = data['data']['ayahs']
        
        # 确保 verses 是列表
        if not isinstance(verses, list):
            logger.debug(f'quran-api返回的数据格式 (章节 {chapter}): 类型={type(data)}, 键={list(data.keys()) if isinstance(data, dict) else "N/A"}, 数据样本={str(data)[:200] if isinstance(data, dict) else str(data)[:200]}')
            raise ValueError(f'quran-api返回的数据格式不正确: verses不是列表')
        
        # 如果 verses 列表为空，尝试从原始数据中查找
        if len(verses) == 0 and isinstance(data, dict):
            logger.debug(f'quran-api返回的数据 (章节 {chapter}): 字典键={list(data.keys())}, 数据样本={str(data)[:500]}')
            # 尝试递归查找数组
            def find_list_in_dict(obj, depth=0):
                if depth > 3:  # 限制递归深度
                    return None
                if isinstance(obj, list) and len(obj) > 0:
                    return obj
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        if isinstance(value, list) and len(value) > 0:
                            # 检查是否是经文数组（包含字典元素）
                            if value and isinstance(value[0], dict):
                                return value
                        result = find_list_in_dict(value, depth + 1)
                        if result:
                            return result
                return None
            
            found_list = find_list_in_dict(data)
            if found_list:
                verses = found_list
                logger.debug(f'quran-api: 通过递归查找找到 {len(verses)} 个元素')
        
        # 解析经文数据，尝试多种可能的键名
        parsed_verses = []
        for i, verse in enumerate(verses):
            if not isinstance(verse, dict):
                continue
            
            # 尝试多种可能的键名组合
            verse_number = (
                verse.get('verse') or 
                verse.get('number') or 
                verse.get('numberInSurah') or 
                verse.get('verse_number') or
                verse.get('ayah') or
                verse.get('id') or
                (i + 1)
            )
            
            verse_text = (
                verse.get('text') or 
                verse.get('translation') or 
                verse.get('translated_text') or
                verse.get('translatedText') or
                verse.get('translation_text') or
                ''
            )
            
            # 只有当文本不为空时才添加
            if verse_text:
                parsed_verses.append({
                    'verse': verse_number,
                    'text': verse_text
                })
        
        # 尝试从API数据中提取章节名称
        chapter_name_zh = None
        if isinstance(data, dict):
            # 尝试从不同位置获取章节名称
            chapter_name_zh = (
                data.get('name') or
                data.get('chapter_name') or
                data.get('englishNameTranslation') or
                data.get('title') or
                (data.get('chapter', {}) if isinstance(data.get('chapter'), dict) else {}).get('name') or
                (data.get('chapter', {}) if isinstance(data.get('chapter'), dict) else {}).get('title')
            )
        
        # 如果API没有返回，使用映射表作为备选
        if not chapter_name_zh:
            chapter_name_zh = QURAN_CHAPTER_NAMES_ZH.get(int(chapter), f'第 {chapter} 章')
        
        formatted_data = {
            'chapter': int(chapter),
            'chapter_name': chapter_name_zh,
            'chapter_name_ar': '',
            'verses': parsed_verses
        }
        
        # 验证是否有数据
        if not formatted_data['verses']:
            # 记录详细的调试信息以便排查
            if verses and len(verses) > 0:
                logger.debug(f'quran-api返回的数据结构 (章节 {chapter}): verses列表长度={len(verses)}, '
                            f'第一个元素类型={type(verses[0])}, 第一个元素键={list(verses[0].keys()) if isinstance(verses[0], dict) else "N/A"}, '
                            f'第一个元素内容={str(verses[0])[:300] if isinstance(verses[0], dict) else verses[0]}')
            else:
                logger.debug(f'quran-api返回的数据结构 (章节 {chapter}): 数据类型={type(data)}, '
                            f'数据键={list(data.keys()) if isinstance(data, dict) else "N/A"}, '
                            f'数据样本={str(data)[:500]}')
            raise ValueError(f'quran-api返回的数据中没有有效的经文 (找到 {len(verses)} 个元素，但无法解析)')
        
        return formatted_data
        
    except (requests.exceptions.RequestException, ValueError, KeyError, TypeError) as e:
        # 如果quran-api不可用或数据格式错误，使用alquran.cloud的中文版本作为备选
        logger.warning(f'quran-api获取中文翻译失败 (章节 {chapter}): {str(e)}，尝试使用alquran.cloud')
        
        try:
            url = f"https://api.alquran.cloud/v1/surah/{chapter}/zh-majian"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('code') == 200 and data.get('data'):
                surah_data = data['data']
                # 优先从API获取中文章节名称，如果没有则使用映射表作为备选
                chapter_name_zh = (
                    surah_data.get('englishNameTranslation') or 
                    surah_data.get('name') or 
                    QURAN_CHAPTER_NAMES_ZH.get(int(chapter)) or 
                    f'第 {chapter} 章'
                )
                return {
                    'chapter': int(chapter),
                    'chapter_name': chapter_name_zh,
                    'chapter_name_ar': surah_data.get('name', ''),
                    'verses': [
                        {
                            'verse': verse.get('numberInSurah'),
                            'text': verse.get('text', '')
                        }
                        for verse in surah_data.get('ayahs', [])
                    ]
                }
            raise ValueError('alquran.cloud API返回数据格式不正确')
        except Exception as fallback_error:
            logger.error(f'所有数据源均无法获取中文翻译 (章节 {chapter}): 主源错误: {str(e)}, 备选源错误: {str(fallback_error)}')
            raise ValueError(f'无法获取中文翻译: {str(fallback_error)}')