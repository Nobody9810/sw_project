"""Allauth configuration, imported by shuwei/settings.py."""
import os
from urllib.parse import urlparse
from django.core.exceptions import ImproperlyConfigured

PUBLIC_SITE_URL = os.getenv('PUBLIC_SITE_URL', 'http://localhost:3000').rstrip('/')
_public = urlparse(PUBLIC_SITE_URL)
if _public.scheme not in {'http', 'https'} or not _public.netloc or _public.path or _public.query or _public.fragment:
    raise ImproperlyConfigured('PUBLIC_SITE_URL 必须是网站来源地址，不包含路径')
if os.getenv('DJANGO_ENV', 'development').lower() == 'production' and _public.scheme != 'https':
    raise ImproperlyConfigured('生产环境 PUBLIC_SITE_URL 必须使用 https')

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]
ACCOUNT_ADAPTER = 'users.auth_adapters.AccountAdapter'
HEADLESS_ADAPTER = 'users.auth_adapters.HeadlessAdapter'
SOCIALACCOUNT_ADAPTER = 'users.auth_adapters.SocialAccountAdapter'
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*']
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
ACCOUNT_EMAIL_VERIFICATION_BY_CODE_ENABLED = True
ACCOUNT_EMAIL_VERIFICATION_BY_CODE_MAX_ATTEMPTS = 5
ACCOUNT_EMAIL_VERIFICATION_BY_CODE_TIMEOUT = 600
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = True
ACCOUNT_LOGIN_BY_CODE_ENABLED = True
ACCOUNT_LOGIN_BY_CODE_MAX_ATTEMPTS = 5
ACCOUNT_LOGIN_BY_CODE_TIMEOUT = 600
ACCOUNT_LOGIN_BY_CODE_SUPPORTS_RESEND = True
ACCOUNT_EMAIL_VERIFICATION_SUPPORTS_RESEND = True
ACCOUNT_PREVENT_ENUMERATION = 'strict'
ACCOUNT_SESSION_REMEMBER = False
# Subjects already name the site; the default prefix would use the Site record.
ACCOUNT_EMAIL_SUBJECT_PREFIX = ''
ACCOUNT_RATE_LIMITS = {
    'request_login_code': '10/m/ip,1/m/key',
    'signup': '10/m/ip',
    'login': '30/m/ip',
}
HEADLESS_ONLY = True
HEADLESS_CLIENTS = ('browser',)
HEADLESS_FRONTEND_URLS = {
    'account_signup': PUBLIC_SITE_URL + '/登录/',
    'account_confirm_email': PUBLIC_SITE_URL + '/登录/',
    'account_reset_password': PUBLIC_SITE_URL + '/登录/',
    'account_reset_password_from_key': PUBLIC_SITE_URL + '/登录/',
    'socialaccount_login_error': PUBLIC_SITE_URL + '/登录/?auth_error=google',
}
LOGIN_URL = '/登录/'
LOGIN_REDIRECT_URL = '/登录/'
ACCOUNT_LOGOUT_REDIRECT_URL = '/'
SOCIALACCOUNT_AUTO_SIGNUP = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True
SOCIALACCOUNT_STORE_TOKENS = False
SOCIALACCOUNT_LOGIN_ON_GET = False
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {'client_id': os.getenv('GOOGLE_CLIENT_ID', ''), 'secret': os.getenv('GOOGLE_CLIENT_SECRET', ''), 'key': ''},
        'SCOPE': ['openid', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
        'OAUTH_PKCE_ENABLED': True,
        'EMAIL_AUTHENTICATION': True,
        'FETCH_USERINFO': False,
    },
}
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_NAME = 'sw_reader_sessionid'
ADMIN_SESSION_COOKIE_NAME = 'sw_admin_sessionid'
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
# Next's proxy overwrites x-forwarded-host with the original host. Keep Django
# private behind this proxy and retain an exact production ALLOWED_HOSTS list.
USE_X_FORWARDED_HOST = True
