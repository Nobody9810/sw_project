"""Comments belong to their article: deleting the article deletes its comments and replies."""
from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import Comment


@receiver(post_delete, dispatch_uid='comment.delete_article_comments')
def delete_article_comments(sender, instance, using, **kwargs):
    from home.signals import ARTICLE_MODELS
    if sender not in ARTICLE_MODELS:
        return
    content_type = ContentType.objects.db_manager(using).get_for_model(sender)
    # Replies cascade through parent; Telegram review records cascade with each comment.
    Comment.objects.using(using).filter(content_type=content_type, object_id=instance.pk).delete()
