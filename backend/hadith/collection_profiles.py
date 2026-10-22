"""Current collection metadata; migration 0004 keeps its frozen defaults."""
from .collection_introductions import COLLECTION_INTRODUCTIONS
from .collection_profiles_legacy import COLLECTION_PROFILES_V1


PROFILE_FIELDS = {'author', 'introduction', 'history', 'history_source', 'source_version',
                  'translator', 'publisher', 'publication_date', 'isbn'}
COLLECTION_PROFILES_CURRENT = {
    name: {field: value for field, value in profile.items() if field in PROFILE_FIELDS}
    for name, profile in COLLECTION_PROFILES_V1.items()
}
COLLECTION_PROFILES_CURRENT['Bukhari'] = {
    'author': '布哈里', 'translator': '祁学义', 'publisher': '宗教文化出版社',
    'publication_date': '2008年12月', 'isbn': '9787802540439',
    'source_version': '《布哈里圣训实录全集》祁学义译，四卷合订扫描本（chiness_sahih_bukhari.pdf）',
    'introduction': '《布哈里圣训实录全集》按启示、信仰、知识、功修、社会生活与品德等主题编排。本次收录采用祁学义中译四卷扫描本，按原书97章组织阅读。当前为尚未逐字校对的OCR整理稿。',
    'history': '本地译本前言介绍，本书由布哈里辑录，编者通过访学搜集传述，核对传述者与传述来源，并按不同主题分类编排。其整理工作历时多年，重视传述链的连续性和传述者的可靠性。以上说明据本地PDF第11页前言整理。',
}


COLLECTION_PROFILES_CURRENT['Nasai'] = {
    'author': '奈萨仪（艾哈迈德·本·舒艾布）',
    'source_version': '本站本地《奈萨仪圣训集》中文PDF，20篇，文件末条原书编号1946',
    'introduction': '本地文件按清洁、水、经血和病血、大净和土净、拜功、宣礼、清真寺、聚礼、旅行拜、日月蚀拜、夜间与白天的副功及殡礼等主题编排，共20篇。点击篇章可按小节阅读正文及注释。',
    'history': '奈萨仪通过访学搜集和研习圣训，其圣训集按主题编排，保存同一主题的不同传述，是六大圣训集之一。本介绍用于说明著作背景；本站收录范围以当前20篇中文文件为准。',
    'history_source': 'https://sunnah.com/nasai/about',
}


COLLECTION_PROFILES_CURRENT['IbnMajah'] = {
    'author': '伊本·马哲', 'translator': '穆萨·余崇仁', 'publisher': '宗教文化出版社',
    'publication_date': '2013年4月', 'isbn': '9787802546707',
    'source_version': '《伊本·马哲圣训集》穆萨·余崇仁中译扫描本，39篇',
    'introduction': '本书按逊奈、清洁、土净、拜功、殡礼、斋戒、天课、婚姻、交易、朝觐、医药、礼仪、杜阿、圆梦、菲特奈和淡泊等主题编排。本站依据本地扫描本分为39篇，原书编号在每篇内重新开始。',
    'history': '本书由伊本·马哲辑录，是六大圣训集之一。编者通过访学搜集传述，并按照主题组织材料，便于对照相关圣训。历史背景参考链接所述，不替代本站中译版版权信息。',
    'history_source': 'https://sunnah.com/ibnmajah/about',
}


# Historical migration defaults above stay frozen. New imports share the same
# editorial copy as the explicit update command for existing collections.
for _short_name, _introduction in COLLECTION_INTRODUCTIONS.items():
    COLLECTION_PROFILES_CURRENT[_short_name].update(_introduction)


def collection_profile(short_name):
    return dict(COLLECTION_PROFILES_CURRENT.get(short_name, {}))


def fill_collection_profiles(Collection, alias='default'):
    changed = 0
    fields = {field.name for field in Collection._meta.fields}
    for collection in Collection.objects.using(alias).filter(short_name__in=COLLECTION_PROFILES_V1):
        updated = False
        for name, value in COLLECTION_PROFILES_V1[collection.short_name].items():
            if name in fields and not getattr(collection, name):
                # Preserve even an admin edit made after this row was read.
                updated = bool(Collection.objects.using(alias).filter(
                    pk=collection.pk, **{name: ''}).update(**{name: value})) or updated
        if updated:
            changed += 1
    return changed
