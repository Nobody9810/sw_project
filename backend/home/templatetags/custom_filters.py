from django import template
from django.utils.safestring import mark_safe

register = template.Library()

@register.filter
def highlight(value, keyword):
    highlighted = value.replace(keyword, f'<span class="highlight">{keyword}</span>')
    return mark_safe(highlighted)

@register.filter(name='find')
def find_filter(value, keyword):
    return value.find(keyword)