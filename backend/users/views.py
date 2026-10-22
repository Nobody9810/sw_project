"""Same-origin session endpoints; authentication itself stays in django-allauth."""
import json
from django.conf import settings
from django.contrib.auth import logout
from django.http import JsonResponse, HttpResponseRedirect
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from django.db import transaction
from shuwei.submissions import allow_submission, rate_limit_response
from .avatars import PRESETS, AvatarError, avatar_data, process_upload
from .models import UserProfile


def user_data(user):
    if not user.is_authenticated:
        return None
    return {'id': user.pk, 'nickname': user.first_name or '', 'avatar': avatar_data(user)}


@never_cache
@require_GET
def session_status(request):
    return JsonResponse({'user': user_data(request.user)})


@never_cache
@require_POST
def logout_session(request):
    logout(request)
    return JsonResponse({'user': None})


def account_data(user):
    """The owner's own account page; the per-page session check stays without email."""
    from allauth.account.models import EmailAddress
    from allauth.socialaccount.models import SocialAccount
    address = EmailAddress.objects.filter(user=user).order_by('-primary', '-verified').first()
    return {'nickname': user.first_name or '', 'avatar': avatar_data(user),
            'email': address.email if address else user.email,
            'email_verified': bool(address and address.verified),
            'google': SocialAccount.objects.filter(user=user, provider='google').exists(),
            'joined': user.date_joined.date().isoformat()}


@never_cache
@require_http_methods(['GET', 'POST'])
def update_profile(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': '请先登录'}, status=401)
    if request.method == 'GET':
        return JsonResponse({'account': account_data(request.user)})
    if not allow_submission(request, 'profile', limit=20, window=3600):
        return rate_limit_response()
    try:
        if len(request.body) > 4096:
            raise ValueError()
        data = json.loads(request.body)
        nickname = data.get('nickname') if isinstance(data, dict) else None
        if not isinstance(nickname, str) or len(nickname.strip()) > 50:
            raise ValueError()
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'error': '昵称格式不正确，最多50个字符'}, status=400)
    request.user.first_name = nickname.strip()
    request.user.save(update_fields=['first_name'])
    return JsonResponse({'user': user_data(request.user)})


def discard_file(name):
    if name:
        from django.core.files.storage import default_storage
        transaction.on_commit(lambda: default_storage.delete(name))


@never_cache
@require_http_methods(['POST', 'DELETE'])
def update_avatar(request):
    """POST multipart `file` uploads, POST JSON `preset` picks a preset, DELETE reverts to the initial."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': '请先登录'}, status=401)
    if not allow_submission(request, 'avatar', limit=20, window=3600):
        return rate_limit_response()
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    previous = profile.avatar.name
    if request.method == 'DELETE':
        profile.avatar, profile.avatar_preset = '', ''
    elif 'file' in request.FILES:
        try:
            content = process_upload(request.FILES['file'])
        except AvatarError as error:
            return JsonResponse({'error': str(error)}, status=400)
        profile.avatar.save(content.name, content, save=False)
        profile.avatar_preset = ''
    else:
        try:
            if len(request.body) > 1024:
                raise ValueError()
            preset = json.loads(request.body).get('preset')
        except (ValueError, AttributeError, UnicodeDecodeError):
            preset = None
        if preset not in PRESETS:
            return JsonResponse({'error': '请选择列表中的头像'}, status=400)
        profile.avatar, profile.avatar_preset = '', preset
    with transaction.atomic():
        profile.save()
        if previous != profile.avatar.name:
            discard_file(previous)
    request.user.profile = profile
    return JsonResponse({'user': user_data(request.user)})


@never_cache
@require_http_methods(['GET', 'POST'])
def google_entry(request):
    provider = getattr(settings, 'SOCIALACCOUNT_PROVIDERS', {}).get('google', {}).get('APP', {})
    if not provider.get('client_id') or not provider.get('secret'):
        return HttpResponseRedirect('/登录/?auth_error=google_unavailable')
    if request.method == 'GET':
        from django.shortcuts import render
        return render(request, 'socialaccount/login.html')
    from allauth.socialaccount.adapter import get_adapter
    from allauth.socialaccount.providers.base import AuthProcess
    google = get_adapter(request).get_provider(request, 'google')
    options = google.get_redirect_from_request_kwargs(request)
    options['process'] = AuthProcess.LOGIN
    return google.redirect(request, **options)
