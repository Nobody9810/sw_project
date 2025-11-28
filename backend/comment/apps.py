from django.apps import AppConfig


class CommentConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'comment'

    def ready(self):
        """注册信号处理器"""
        import comment.signals  # noqa
