from django.core.management.base import BaseCommand
from django.db.models import Q
from home.models import 论文, 古籍, 书库
from home.signals import _generate_pdf_thumbnail_task


class Command(BaseCommand):
    help = 'Retry missing PDF covers in bounded batches; does not replace manual covers.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=100)
        parser.add_argument('--model', choices=('论文', '古籍', '书库'),
                            help='Only repair the selected section; defaults to all three sections.')

    def handle(self, *args, **options):
        remaining = max(1, min(options['limit'], 1000))
        success = 0
        models = (论文, 古籍, 书库)
        if options.get('model'):
            models = tuple(model for model in models if model.__name__ == options['model'])
        for model in models:
            candidates = model.objects.filter(Q(图片__in=['', 'null', 'None']) | Q(图片__isnull=True),
                                              文档__iendswith='.pdf').order_by('pk')
            for pk, document_name in candidates.values_list('pk', '文档')[:remaining]:
                success += bool(_generate_pdf_thumbnail_task(model, pk, document_name))
                remaining -= 1
            if remaining == 0:
                break
        self.stdout.write(f'Generated {success} covers; failed candidates remain available for retry.')
