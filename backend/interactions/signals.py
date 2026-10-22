"""Remove polymorphic interactions in the same transaction as article deletion."""
from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import UserReaction, ViewCount, ViewRecord
from .services import CONTENT_MODELS


@receiver(post_delete, dispatch_uid='interactions.delete_article_statistics')
def delete_article_statistics(sender, instance, using, **kwargs):
    if sender not in CONTENT_MODELS:
        return
    content_type = ContentType.objects.db_manager(using).get_for_model(sender)
    for model in (ViewCount, ViewRecord, UserReaction):
        model.objects.using(using).filter(content_type=content_type, object_id=instance.pk).delete()
