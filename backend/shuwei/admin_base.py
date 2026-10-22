"""Shared defaults for the project's registered Unfold model admins."""
from unfold.admin import ModelAdmin


class LibraryModelAdmin(ModelAdmin):
    list_per_page = 25
    show_full_result_count = False
    list_filter_sheet = True
    change_list_template = 'admin/library/change_list.html'
