from django.contrib import admin
from shuwei.admin_base import LibraryModelAdmin
from .models import OutboundMessage, TelegramReview


@admin.register(OutboundMessage)
class OutboundMessageAdmin(LibraryModelAdmin):
    # Content (codes, recipients) is never shown; this view is for delivery health only.
    list_display = ('id', 'channel', 'status', 'attempts', 'last_error', 'created_at', 'available_at', 'expires_at')
    list_filter = ('channel', 'status')
    fields = ('channel', 'status', 'attempts', 'last_error', 'created_at', 'available_at', 'expires_at')
    readonly_fields = fields
    ordering = ('-created_at', '-pk')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(TelegramReview)
class TelegramReviewAdmin(LibraryModelAdmin):
    list_display = ('comment_id', 'question_id', 'status', 'processed_by', 'processed_at', 'expires_at')
    list_display_links = None
    list_filter = ('status',)
    fields = ('comment_id', 'question_id', 'status', 'processed_by', 'processed_at', 'expires_at')
    readonly_fields = fields
    ordering = ('-expires_at',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
