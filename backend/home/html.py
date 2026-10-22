"""Whitelist rich text at both the write and public response boundaries."""
import re
from copy import deepcopy
from html import unescape
from urllib.parse import unquote, urlparse
import nh3

HTML_FIELDS = ('内容', '作者简介', '目录', '前言', '内容简介')
TAGS = set(nh3.ALLOWED_TAGS) | {'figure', 'figcaption', 'span', 'div', 'iframe', 'hr'}
ATTRIBUTES = deepcopy(nh3.ALLOWED_ATTRIBUTES)
ATTRIBUTES['*'] = {'style', 'dir', 'lang'}
ATTRIBUTES['a'] = {'href', 'title', 'target'}
ATTRIBUTES['img'] = {'src', 'alt', 'title', 'width', 'height'}
ATTRIBUTES['iframe'] = {'src', 'title', 'width', 'height', 'allowfullscreen'}
for values in ATTRIBUTES.values():
    values.discard('class')
IMAGE_ALIGNMENT_CLASSES = {'image-style-align-left', 'image-style-align-center',
                           'image-style-align-right'}
CLASSES = {
    'figure': {'image', 'table', 'media', 'image_resized', 'image-style-side',
               'image-style-block-align-left', 'image-style-block-align-right'} | IMAGE_ALIGNMENT_CLASSES,
    'img': {'image-inline', 'image_resized'} | IMAGE_ALIGNMENT_CLASSES,
    'mark': {'marker-yellow', 'marker-green', 'marker-pink', 'marker-blue', 'pen-red', 'pen-green'},
    'span': {'marker-yellow', 'marker-green', 'marker-pink', 'marker-blue',
             'pen-red', 'pen-green', 'image-inline'} | IMAGE_ALIGNMENT_CLASSES,
    'div': {'raw-html-embed'},
    # Click-to-load video placeholder written by public_html (see video_link).
    'a': {'video-embed'},
}



# Presentation-only markers survive the final sanitizer, never add arbitrary classes.
for _tag in TAGS:
    CLASSES.setdefault(_tag, set()).update({'richtext-theme-color', 'richtext-theme-background', 'richtext-theme-border'})


def _neutral_color(value):
    value = re.sub(r'\s*!\s*important\s*$', '', value.strip().lower())
    if value in {'black', 'white', 'gray', 'grey', 'silver', 'dimgray', 'dimgrey',
                 'darkgray', 'darkgrey', 'lightgray', 'lightgrey', 'gainsboro', 'whitesmoke'}:
        return True
    if re.fullmatch(r'#[0-9a-f]{3}(?:[0-9a-f])?', value):
        channels = [int(char * 2, 16) for char in value[1:4]]
        if len(value) == 5 and value[-1] == '0':
            return False
    elif re.fullmatch(r'#[0-9a-f]{6}(?:[0-9a-f]{2})?', value):
        channels = [int(value[index:index + 2], 16) for index in (1, 3, 5)]
        if len(value) == 9 and value[-2:] == '00':
            return False
    elif re.fullmatch(r'rgba?\([\d.,% /]+\)', value):
        parts = re.findall(r'\d+(?:\.\d+)?%?', value)
        if len(parts) not in (3, 4) or (len(parts) == 4 and float(parts[3].rstrip('%')) == 0):
            return False
        channels = [float(part.rstrip('%')) * (2.55 if part.endswith('%') else 1) for part in parts[:3]]
    elif re.fullmatch(r'hsla?\([\d.,% /-]+\)', value):
        parts = re.findall(r'-?\d+(?:\.\d+)?', value)
        return len(parts) in (3, 4) and float(parts[1]) <= 5 and (len(parts) == 3 or float(parts[3]) > 0)
    else:
        return False
    return max(channels) - min(channels) <= 12


def _theme_classes(style):
    classes = []
    declarations = [part.partition(':') for part in style.split(';')]
    # Black/white ink on an intentional colored fill must retain its contrast.
    accent_fill = any(name.strip().lower() == 'background-color'
                      and value.strip().lower() != 'transparent'
                      and not re.fullmatch(r'(?:rgba|hsla)\([^)]*[,/]\s*0(?:\.0+)?%?\s*\)', value.strip().lower())
                      and not _neutral_color(value)
                      for name, _, value in declarations)
    for declaration in style.split(';'):
        name, _, value = declaration.partition(':')
        name = name.strip().lower()
        value = re.sub(r'\s*!\s*important\s*$', '', value, flags=re.I)
        if name == 'color' and accent_fill:
            continue
        if name in ('color', 'background-color') and _neutral_color(value):
            classes.append('richtext-theme-color' if name == 'color' else 'richtext-theme-background')
        elif name in ('border', 'border-color'):
            match = re.search(r'(#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?)\([^)]*\)|black|white|gray|grey|silver)\s*$', value.strip())
            if match and _neutral_color(match.group()):
                classes.append('richtext-theme-border')
    return classes


def filter_attribute(tag, attribute, value):
    if tag == 'iframe' and attribute == 'src':
        url = urlparse(value)
        if url.scheme != 'https' or url.hostname not in {
            'www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com',
        }:
            return None
    if tag == 'iframe' and attribute == 'style':
        return 'width:100%;height:360px;border:0'
    if tag == 'div' and attribute == 'style':
        # CKEditor wraps embeds in a zero-height positioned box. The public
        # renderer uses normal document flow, so retain the visible frame height.
        return ';'.join(part for part in value.split(';')
                        if part.split(':', 1)[0].strip().lower() not in {
                            'height', 'position', 'padding-top', 'padding-bottom',
                        })
    if attribute == 'target' and value not in ('_blank', '_self'):
        return None
    return value


def safe_html(value):
    if not value:
        return value
    return nh3.clean(str(value), tags=TAGS, attributes=ATTRIBUTES,
                     attribute_filter=filter_attribute, allowed_classes=CLASSES,
                     url_schemes={'http', 'https', 'mailto', 'tel'},
                     filter_style_properties={
                         'color', 'background-color', 'text-align', 'font-size',
                         'font-weight', 'font-style', 'font-family', 'text-decoration',
                         'width', 'height', 'border', 'border-color', 'border-style',
                         'border-width', 'padding', 'margin-left', 'margin-right',
                     })


# Public rendering must not initiate blocked platform requests. Keep the stored
# editor HTML intact so removing an embed from the reader does not delete data.
BLOCKED_RESOURCE_DOMAINS = (
    'google.com', 'googleapis.com', 'gstatic.com', 'googleusercontent.com',
    'googletagmanager.com', 'google-analytics.com', 'recaptcha.net',
    'youtube.com', 'youtube-nocookie.com', 'youtu.be', 'ytimg.com',
    'facebook.com', 'facebook.net', 'fbcdn.net', 'instagram.com',
    'twitter.com', 'x.com', 'twimg.com', 'whatsapp.com', 'wa.me',
    'baidu.com', 'bdstatic.com', 'bdimg.com', 'qq.com', 'qpic.cn',
    'gtimg.com', 'weixin.com', 'weibo.com', 'sina.com.cn', 'sinajs.cn',
)


def blocked_resource_url(value):
    try:
        host = unquote(urlparse((value or '').replace('\\', '/')).hostname or '').lower().rstrip('.')
    except ValueError:
        return True
    return any(host == domain or host.endswith('.' + domain) for domain in BLOCKED_RESOURCE_DOMAINS)


VIDEO_ID = re.compile(r'[A-Za-z0-9_-]{6,20}')


def video_link(source):
    """A recognised player becomes `a.video-embed` pointing at the provider's own page.

    The reader's frontend turns it into a placeholder that loads the player only on click;
    without JavaScript it stays an ordinary external link. Nothing is fetched on page load.
    """
    try:
        url = urlparse(source)
    except ValueError:
        return None
    path = url.path.rstrip('/').split('/')
    if url.scheme == 'https' and url.hostname in {'www.youtube.com', 'www.youtube-nocookie.com'} \
            and len(path) == 3 and path[1] == 'embed' and VIDEO_ID.fullmatch(path[2]):
        start = re.search(r'(?:^|&)start=(\d{1,6})(?:&|$)', url.query)
        query = f'v={path[2]}' + (f'&t={start.group(1)}s' if start else '')
        return 'https://www.youtube.com/watch?' + query, '在 YouTube 观看视频（外部网站）'
    if url.scheme == 'https' and url.hostname == 'player.vimeo.com' \
            and len(path) == 3 and path[1] == 'video' and path[2].isdigit():
        return 'https://vimeo.com/' + path[2], '在 Vimeo 观看视频（外部网站）'
    return None


CONTENT_IMAGE = re.compile(r"""<img\b[^>]*?\ssrc\s*=\s*(?:"([^"]+)"|'([^']+)')""", re.I)


def first_content_image(value):
    """The first image in stored rich text that a reader's browser may load, or None.

    List cards use it when an article has no uploaded cover; images on blocked
    platforms are skipped exactly as public_html would hide them.
    """
    for match in CONTENT_IMAGE.finditer(str(value or '')):
        source = unescape(match.group(1) or match.group(2)).strip()
        if source.startswith('//') or blocked_resource_url(source):
            continue
        if source.startswith('/') or urlparse(source).scheme in {'http', 'https'}:
            return source
    return None


def public_html(value):
    from html import escape
    from html.parser import HTMLParser

    if not value:
        return value

    class PublicResourceParser(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=False)
            self.parts = []
            self.in_frame = False
            self.figures = []
            self.tables = []

        def handle_starttag(self, tag, attrs):
            if self.in_frame:
                return
            attributes = dict(attrs)
            if tag == 'iframe':
                self.in_frame = True
                source = attributes.get('src')
                video = video_link(source) if source else None
                if video:
                    self.parts.append('<a class="video-embed" href="' + escape(video[0], quote=True)
                                      + '" target="_blank">' + video[1] + '</a>')
                elif source:
                    self.parts.append('<a href="' + escape(source, quote=True)
                                      + '" target="_blank">查看视频（外部网站）</a>')
                return
            if tag == 'img' and blocked_resource_url(attributes.get('src')):
                self.parts.append('<span>' + escape(attributes.get('alt') or '图片暂不可用') + '</span>')
                return
            if tag == 'figure':
                self.figures.append('table' in attributes.get('class', '').split())
            if tag == 'table':
                wrap = not any(self.figures) and not self.tables
                self.tables.append(wrap)
                if wrap:
                    self.parts.append('<figure class="table">')
            markers = _theme_classes(attributes.get('style', ''))
            if markers:
                # Inline !important otherwise beats even the reader's theme rules.
                # Strip it only from neutral declarations in the public copy.
                attributes['style'] = ';'.join(re.sub(r'\s*!\s*important\s*$', '', part, flags=re.I)
                                               if _theme_classes(part) else part
                                               for part in attributes.get('style', '').split(';'))
                attributes['class'] = ' '.join(dict.fromkeys(attributes.get('class', '').split() + markers))
                attrs = list(attributes.items())
            self.parts.append('<' + tag + ''.join(' ' + name + '="' + escape(val or '', quote=True)
                                                  + '"' for name, val in attrs) + '>')

        def handle_endtag(self, tag):
            if tag == 'iframe':
                self.in_frame = False
            elif not self.in_frame:
                self.parts.append('</' + tag + '>')
                if tag == 'table' and self.tables and self.tables.pop():
                    self.parts.append('</figure>')
                if tag == 'figure' and self.figures:
                    self.figures.pop()

        def handle_startendtag(self, tag, attrs):
            self.handle_starttag(tag, attrs)
            if tag == 'iframe':
                self.handle_endtag(tag)

        def handle_data(self, data):
            if not self.in_frame:
                self.parts.append(data)

        def handle_entityref(self, name):
            if not self.in_frame:
                self.parts.append('&' + name + ';')

        def handle_charref(self, name):
            if not self.in_frame:
                self.parts.append('&#' + name + ';')

    parser = PublicResourceParser()
    parser.feed(safe_html(value))
    parser.close()
    return safe_html(''.join(parser.parts))
