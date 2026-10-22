"""Small display helpers shared by content, moderation and hadith lists."""
from django.utils.html import format_html
from django.utils.text import Truncator


def admin_text_preview(value, limit=100):
    return format_html('<span class="admin-library-text-preview">{}</span>',
                       Truncator(value or '').chars(limit))


def admin_badge(label, tone='draft'):
    return format_html('<span class="admin-library-badge admin-library-badge-{}">{}</span>', tone, label)
