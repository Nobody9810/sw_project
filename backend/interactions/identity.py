"""Server-owned identities; never claim historical guest activity for an account."""

def reaction_key(user_id, session_key):
    return f'user:{user_id}' if user_id is not None else f'session:{session_key}'


def request_identity(request, *, create_session=True):
    if create_session and not request.session.session_key:
        request.session.create()
    session = request.session.session_key
    user_id = request.user.pk if request.user.is_authenticated else None
    key = reaction_key(user_id, session) if user_id is not None or session else None
    return key, user_id, session
