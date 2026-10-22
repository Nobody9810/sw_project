"""Shared permission checks for custom navigation and dashboard queries."""


def viewable_model_admin(request, model):
    from django.contrib import admin
    if not request.user.is_active or not request.user.is_staff:
        return None
    model_admin = admin.site._registry.get(model)
    if model_admin is None or not model_admin.has_view_or_change_permission(request):
        return None
    return model_admin


def can_view_admin(request, *, model_label):
    from django.apps import apps
    return viewable_model_admin(request, apps.get_model(model_label)) is not None
