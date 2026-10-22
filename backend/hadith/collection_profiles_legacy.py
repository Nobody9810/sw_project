"""Frozen defaults for migration 0004; not the current metadata contract."""
COLLECTION_PROFILES_V1 = {
    'Muslim': {
        'author': '穆斯林·本·哈查吉·奈萨布里',
        'introduction': '《穆斯林圣训实录》围绕信仰、功修、社会生活与品德修养编排，重视同一主题下不同传述的对照阅读。',
        'source_version': '本站《穆斯林圣训实录全集》中文 PDF／TXT 对照整理本',
        'source_note': '当前 PDF 从目录开始，未包含扉页或版权页，不能据此确认本文件的译者、出版社及具体版次。',
        'history': '本书由奈萨布里的圣训学家穆斯林辑录，与《布哈里圣训实录》并称“两大真本”。编者重视传述链和传述文字的核对，保留不同传述之间的细微差异，是研究圣训传承的重要著作。',
        'history_source': 'https://sunnah.com/muslim/about',
    },
    'AbuDawud': {
        'author': '艾布·达乌德', 'translator': '余崇仁',
        'publisher': '宗教文化出版社', 'publication_date': '2013年5月', 'isbn': '9787802546721',
        'introduction': '《艾布·达乌德圣训集》按具体问题编排圣训，涵盖清洁、拜功、婚姻、交易与礼仪等内容，尤其重视与教法律例相关的传述。',
        'source_version': '余崇仁中译本，本站依据中文 EPUB 整理',
        'source_note': '出版信息依据 EPUB 的书名页与“基本信息”。该文件以日期标注“版次”，未明确第几版或责任编辑，相关字段暂留空。补充材料单独编排。',
        'history': '本书由艾布·达乌德辑录，是逊尼派六大圣训集之一。编者按教法问题组织材料，重视传述的真实性、不同措辞与传述渠道，使本书成为研习教法与圣训的重要文献。',
        'history_source': 'https://sunnah.com/abudawud/about',
    },
    'Tirmidhi': {
        'author': '提尔米兹', 'translator': '穆萨·余崇仁',
        'publisher': '宗教文化出版社', 'edition': '2013年4月第1版；2013年11月第2次印刷',
        'publication_date': '2013年4月', 'isbn': '9787802546714',
        'editors': '责任编辑：赛勤；特约审稿：中国伊斯兰教协会',
        'introduction': '《提尔米兹圣训集》按信仰、功修、交往与品德等主题编排，兼顾圣训传述及其评价，为读者了解圣训与法学讨论提供参考。',
        'source_version': '穆萨·余崇仁中译本，宗教文化出版社2013年第1版扫描本',
        'source_note': '版本、译者及出版人员依据本站扫描本扉页和版权页核对（PDF文件第2、578页）。正文与注释来自该扫描本，文字层存在识别错误，待核对内容保留提示。',
        'history': '提尔米兹在圣训访学与传授的基础上辑成本书，是逊尼派六大圣训集之一。其特色是在传述之外关注圣训的评价、传述者与法学见解，为后世研习圣训及不同法学意见提供了重要材料。',
        'history_source': 'https://sunnah.com/tirmidhi/about',
    },
}

