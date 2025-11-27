# Interactions App - 用户互动功能

这个 Django app 负责处理浏览量和点赞功能，已从 `home` app 中独立出来。

## 功能

1. **浏览量统计** (`ViewCount` 模型)
   - 总浏览量
   - 今日浏览量
   - 最后统计日期

2. **用户反应** (`UserReaction` 模型)
   - 点赞/点踩记录
   - 基于用户会话（session）的追踪

## API 端点

### 点赞/点踩
- `POST /interactions/api/like/<app_label>/<model_name>/<item_id>/` - 点赞
- `POST /interactions/api/dislike/<app_label>/<model_name>/<item_id>/` - 点踩

### 浏览量
- `POST /interactions/api/view/<app_label>/<model_name>/<item_id>/` - 更新浏览量
- `GET /interactions/api/view/<app_label>/<model_name>/<item_id>/get/` - 获取浏览量

## 数据迁移

在首次使用前，需要运行数据迁移命令将现有数据从 `home` app 迁移到 `interactions` app：

```bash
# 试运行（查看将要迁移的数据）
python manage.py migrate_interaction_data --dry-run

# 实际执行迁移
python manage.py migrate_interaction_data
```

这个命令会：
1. 将 `home.UserReaction` 的数据迁移到 `interactions.UserReaction`
2. 将各模型的浏览量数据迁移到 `interactions.ViewCount`

## 向后兼容性

为了保持向后兼容：
- `home` app 中的模型仍然保留 `likes`、`dislikes`、`总浏览量`、`今日浏览量` 字段
- 新的 `interactions` app 会同时更新这些字段，确保数据一致性
- 旧的 API 端点已移除，前端已更新为使用新的端点

## 模型说明

### ViewCount
使用 GenericForeignKey 可以关联到任何内容类型，独立存储浏览量数据。

### UserReaction
使用 GenericForeignKey 和用户会话 ID 来追踪用户的点赞/点踩行为。

## 使用示例

### 在视图中更新浏览量

```python
from interactions.models import ViewCount
from django.contrib.contenttypes.models import ContentType

content_type = ContentType.objects.get_for_model(MyModel)
view_count, created = ViewCount.objects.get_or_create(
    content_type=content_type,
    object_id=item.id
)
# 浏览量更新逻辑在 interactions.views.update_view_count 中
```

### 获取浏览量

```python
from interactions.models import ViewCount
from django.contrib.contenttypes.models import ContentType

content_type = ContentType.objects.get_for_model(MyModel)
view_count = ViewCount.objects.filter(
    content_type=content_type,
    object_id=item.id
).first()

if view_count:
    total_views = view_count.总浏览量
    today_views = view_count.今日浏览量
```

## 注意事项

1. 运行迁移前请备份数据库
2. 迁移后，旧的 `home.UserReaction` 数据仍然保留（如果需要可以手动删除）
3. 建议在生产环境部署前先在测试环境验证
