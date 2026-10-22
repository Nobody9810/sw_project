from django.core.checks import Error, Tags, register
from django.db import connections
from django.db.migrations.executor import MigrationExecutor


@register(Tags.database, deploy=True)
def check_pending_migrations(app_configs, **kwargs):
    errors = []
    for alias in kwargs.get('databases') or []:
        executor = MigrationExecutor(connections[alias])
        if executor.migration_plan(executor.loader.graph.leaf_nodes()):
            errors.append(Error(
                f'数据库 {alias} 存在未执行的迁移。',
                hint='发布前执行 python manage.py migrate，然后重跑 check --deploy --database default。',
                id='home.E001',
            ))
    return errors
