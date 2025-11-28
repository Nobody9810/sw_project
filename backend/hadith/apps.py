from django.apps import AppConfig


class HadithConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'hadith'

    def ready(self):
        """注册信号处理器"""
        import hadith.signals  # noqa
