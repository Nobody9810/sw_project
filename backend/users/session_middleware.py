"""Independent admin and reader logins using Django's unchanged Session engine."""
from django.conf import settings
from django.contrib.sessions.middleware import SessionMiddleware


def is_admin_request(request):
    # CKEditor uploads are outside /admin/, but belong to the admin session.
    path = request.path_info
    return any(path == root or path.startswith(root + '/') for root in ('/admin', '/ckeditor5'))


class SiteSessionMiddleware(SessionMiddleware):
    def process_request(self, request):
        request._uses_admin_session = is_admin_request(request)
        if request._uses_admin_session:
            # Adapt the incoming name for Django's standard middleware; don't mutate settings
            # (which would mix identities across concurrent requests).
            request.COOKIES = request.COOKIES.copy()
            key = request.COOKIES.get(settings.ADMIN_SESSION_COOKIE_NAME)
            request.COOKIES.pop(settings.SESSION_COOKIE_NAME, None)
            if key is not None:
                request.COOKIES[settings.SESSION_COOKIE_NAME] = key
        super().process_request(request)

    def process_response(self, request, response):
        response = super().process_response(request, response)
        if getattr(request, '_uses_admin_session', False):
            # Preserve Django's expiry, deletion, domain, Secure, HttpOnly and SameSite logic.
            cookie = response.cookies.pop(settings.SESSION_COOKIE_NAME, None)
            if cookie is not None:
                response.set_cookie(settings.ADMIN_SESSION_COOKIE_NAME, cookie.value)
                for attribute, value in cookie.items():
                    response.cookies[settings.ADMIN_SESSION_COOKIE_NAME][attribute] = value
        return response
