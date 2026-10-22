"""Allow review cleanup only as part of an authorized target deletion."""


class ReviewCascadeDeleteMixin:
    def get_deleted_objects(self, objs, request):
        deleted, counts, missing, protected = super().get_deleted_objects(objs, request)
        from .models import TelegramReview

        # Reviews cannot be deleted independently in their read-only admin. Their
        # CASCADE relation is owned by the comment/question being deleted; Django
        # still checks target permissions and all other related/protected models.
        missing = missing - {TelegramReview._meta.verbose_name}
        return deleted, counts, missing, protected
