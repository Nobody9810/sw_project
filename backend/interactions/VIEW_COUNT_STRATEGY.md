# 浏览量统计策略说明

## 防刷策略

为了防止用户通过刷新页面来刷浏览量，我们实现了基于 **Session + 时间窗口** 的策略。

### 策略详情

1. **时间窗口**：30分钟
   - 同一用户（Session）在30分钟内访问同一内容，只计算一次浏览量
   - 30分钟后再次访问，会重新计算浏览量

2. **记录方式**：
   - 使用 `ViewRecord` 模型记录每次访问
   - 记录用户Session、访问时间、IP地址等信息
   - 不限制访问记录数量，允许历史追踪

3. **判断逻辑**：
   - 检查该用户最近一次访问该内容的时间
   - 如果距离现在超过30分钟，则计算浏览量
   - 如果在30分钟内，则不计算，但返回当前浏览量数据

### 优势

- ✅ **防止刷量**：同一用户短时间内刷新不会重复计算
- ✅ **合理统计**：30分钟后再次访问会重新计算，符合真实浏览行为
- ✅ **数据完整**：保留所有访问记录，可用于分析
- ✅ **性能优化**：使用数据库索引优化查询性能

### 使用示例

```python
# 前端调用
POST /interactions/api/view/home/通讯/123/

# 响应（30分钟内已访问过）
{
    "success": true,
    "counted": false,
    "message": "短时间内已访问过，不重复计算",
    "total_views": 100,
    "today_views": 10
}

# 响应（首次访问或超过30分钟）
{
    "success": true,
    "counted": true,
    "total_views": 101,
    "today_views": 11
}
```

### 调整时间窗口

如果需要调整时间窗口（比如改为1小时），可以修改：

```python
# backend/interactions/views.py
should_count = ViewRecord.should_count_view(
    user_session=user_session,
    content_type=content_type,
    object_id=item_id,
    time_window_minutes=60  # 改为60分钟
)
```

### 数据清理

`ViewRecord` 表会随着时间增长而变大，建议定期清理旧数据：

```python
# 清理30天前的访问记录
from django.utils import timezone
from datetime import timedelta
from interactions.models import ViewRecord

cutoff_date = timezone.now() - timedelta(days=30)
ViewRecord.objects.filter(viewed_at__lt=cutoff_date).delete()
```

## 点赞功能

点赞功能已完全连接到前端，使用独立的 `interactions` app 处理。

### API 端点

- `POST /interactions/api/like/<app_label>/<model_name>/<item_id>/` - 点赞
- `POST /interactions/api/dislike/<app_label>/<model_name>/<item_id>/` - 点踩

### 前端组件

`LikeDislike` 组件已更新为使用新的 API 端点，自动处理点赞/点踩状态。

