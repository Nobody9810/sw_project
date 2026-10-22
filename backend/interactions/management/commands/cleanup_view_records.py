from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from interactions.models import ViewRecord


class Command(BaseCommand):
    help = 'Preview or remove expired view details; never changes aggregate counts or reactions.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=30, help='Retain at least this many days (minimum 1).')
        parser.add_argument('--limit', type=int, default=10000, help='Maximum records per run (1–100000).')
        parser.add_argument('--execute', action='store_true', help='Delete expired details; otherwise preview only.')

    def handle(self, *args, **options):
        days, limit = options['days'], options['limit']
        if days < 1 or not 1 <= limit <= 100000:
            raise CommandError('--days must be at least 1; --limit must be between 1 and 100000.')
        cutoff = timezone.now() - timedelta(days=days)
        # A fixed cutoff cannot remove the current 30-minute deduplication window.
        candidates = ViewRecord.objects.filter(viewed_at__lt=cutoff).order_by('viewed_at', 'pk')
        ids = list(candidates.values_list('pk', flat=True)[:limit])
        if not options['execute']:
            self.stdout.write(f'Preview: {len(ids)} expired details before {cutoff.isoformat()} (limit {limit}); nothing deleted. '
                              'Use --execute to delete them. Aggregate counts are preserved.')
            return
        removed = 0
        for offset in range(0, len(ids), 500):
            _, counts = ViewRecord.objects.filter(pk__in=ids[offset:offset + 500], viewed_at__lt=cutoff).delete()
            removed += counts.get(ViewRecord._meta.label, 0)
        self.stdout.write(f'Deleted {removed} expired view details; aggregate counts and reactions unchanged.')
