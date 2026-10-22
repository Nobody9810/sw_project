"""Site-specific allauth presentation and minimal provider data retention."""
from uuid import uuid4
from django.contrib.sites.shortcuts import get_current_site
from django.http import HttpResponseRedirect
from allauth.account.adapter import DefaultAccountAdapter
from allauth.core import context
from allauth.core.exceptions import ImmediateHttpResponse
from allauth.headless.adapter import DefaultHeadlessAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


class AccountAdapter(DefaultAccountAdapter):
    def populate_username(self, request, user):
        if not user.username:
            user.username = 'reader_' + uuid4().hex

    def send_mail(self, template_prefix, email, context_data):
        # Render now, deliver from the outbox worker: SMTP never delays or fails the request.
        from notifications.queue import enqueue_email
        request = context.request
        ctx = {'request': request, 'email': email, 'current_site': get_current_site(request), **context_data}
        enqueue_email(self.render_mail(template_prefix, email, ctx))


class HeadlessAdapter(DefaultHeadlessAdapter):
    def serialize_user(self, user):
        return {'id': user.pk, 'display': user.first_name or '读者', 'nickname': user.first_name or ''}


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        # A Google real name or avatar is not the site's public nickname.
        user.first_name = ''
        user.last_name = ''
        return user

    def pre_social_login(self, request, sociallogin):
        if sociallogin.account.provider == 'google':
            if not any(address.verified for address in sociallogin.email_addresses):
                raise ImmediateHttpResponse(HttpResponseRedirect('/登录/?auth_error=google'))
            sociallogin.account.extra_data = {
                key: value for key, value in sociallogin.account.extra_data.items()
                if key in {'sub', 'email', 'email_verified'}
            }

    def on_authentication_error(self, request, provider, error=None, exception=None, extra_context=None):
        raise ImmediateHttpResponse(HttpResponseRedirect('/登录/?auth_error=google'))
