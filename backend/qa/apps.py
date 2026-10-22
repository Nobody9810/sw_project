from django.apps import AppConfig


class QaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'qa'
    verbose_name = '问答管理'

    def ready(self):
        """注册信号处理器"""
        import qa.signals  # noqa

