from django.apps import AppConfig


class InteractionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'interactions'
    verbose_name = '用户互动'

    def ready(self):
        """注册信号处理器"""
        import interactions.signals  # noqa