# SQL 文件导入指南

本指南将帮助您导入 `latest_sap.sql` 文件到 MySQL 数据库。

## 前提条件

1. 确保 MySQL 服务正在运行
2. 确保数据库用户有足够的权限
3. 确认 `.env` 文件中的数据库配置正确

## 方法一：使用 MySQL 命令行导入（推荐）

### 在 WSL Ubuntu 中执行

```bash
# 1. 进入项目目录
cd /home/li/sw_project

# 2. 使用 mysql 命令导入（需要输入密码）
mysql -u root -p shuwei < latest_sap.sql

# 或者如果密码在环境变量中，可以直接使用：
mysql -u root -p112233 shuwei < latest_sap.sql
```

### 如果数据库不存在，先创建数据库

```bash
# 登录 MySQL
mysql -u root -p

# 在 MySQL 中执行
CREATE DATABASE IF NOT EXISTS shuwei CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
EXIT;

# 然后导入 SQL
mysql -u root -p shuwei < latest_sap.sql
```

## 方法二：在 MySQL 命令行中直接导入

```bash
# 登录 MySQL
mysql -u root -p

# 在 MySQL 中执行
USE shuwei;
SOURCE /home/li/sw_project/latest_sap.sql;
EXIT;
```

## 方法三：使用 Python 脚本导入（适用于自动化）

创建一个 Python 脚本来导入 SQL：

```python
import subprocess
import os
from pathlib import Path

# 从环境变量或设置中获取数据库配置
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '112233')
DB_NAME = os.getenv('DB_NAME', 'shuwei')
SQL_FILE = Path(__file__).parent / 'latest_sap.sql'

# 执行导入
cmd = f"mysql -u {DB_USER} -p{DB_PASSWORD} {DB_NAME} < {SQL_FILE}"
subprocess.run(cmd, shell=True)
```

## 方法四：使用 phpMyAdmin（如果有 Web 界面）

1. 打开 phpMyAdmin
2. 选择数据库 `shuwei`
3. 点击"导入"标签
4. 选择 `latest_sap.sql` 文件
5. 点击"执行"

## 注意事项

### 1. 备份现有数据

**重要：** 导入 SQL 文件会覆盖现有数据！如果数据库中有重要数据，请先备份：

```bash
# 备份现有数据库
mysqldump -u root -p shuwei > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 检查 SQL 文件大小

`latest_sap.sql` 文件很大（约 96,000 行），导入可能需要一些时间。请耐心等待。

### 3. 字符编码

确保 MySQL 使用 `utf8mb4` 字符集，SQL 文件已经设置了正确的字符集。

### 4. 权限问题

如果遇到权限错误，确保：
- MySQL 用户有创建数据库的权限（如果 SQL 文件包含 `CREATE DATABASE`）
- MySQL 用户有插入、更新、删除数据的权限

### 5. 导入后验证

导入完成后，验证数据：

```bash
# 登录 MySQL
mysql -u root -p

# 检查数据库
USE shuwei;
SHOW TABLES;
SELECT COUNT(*) FROM auth_user;  # 检查用户表
EXIT;
```

## 常见问题

### 问题 1: 找不到 mysql 命令

**解决方案：** 安装 MySQL 客户端

```bash
sudo apt update
sudo apt install mysql-client
```

### 问题 2: 导入时出现字符编码错误

**解决方案：** 确保使用 utf8mb4 字符集

```bash
mysql -u root -p --default-character-set=utf8mb4 shuwei < latest_sap.sql
```

### 问题 3: 导入时出现外键约束错误

**解决方案：** 临时禁用外键检查

```bash
mysql -u root -p shuwei << EOF
SET FOREIGN_KEY_CHECKS=0;
SOURCE /home/li/sw_project/latest_sap.sql;
SET FOREIGN_KEY_CHECKS=1;
EOF
```

### 问题 4: 导入后 Django 迁移状态不一致

**解决方案：** 导入 SQL 后，需要同步 Django 的迁移状态

```bash
cd backend
python manage.py migrate --fake
```

或者标记所有迁移为已应用：

```bash
python manage.py migrate --fake-initial
```

## 导入后的步骤

1. **验证数据库连接**
   ```bash
   cd backend
   python manage.py dbshell
   ```

2. **检查 Django 迁移状态**
   ```bash
   python manage.py showmigrations
   ```

3. **如果需要，创建超级用户**
   ```bash
   python manage.py createsuperuser
   ```

4. **运行服务器测试**
   ```bash
   python manage.py runserver
   ```

## 快速导入命令（一键执行）

如果您确定要导入并覆盖现有数据，可以使用以下命令：

```bash
cd /home/li/sw_project && \
mysql -u root -p112233 shuwei < latest_sap.sql && \
echo "SQL 导入完成！"
```

## 处理"表已存在"错误

如果导入时遇到 `ERROR 1050: Table 'xxx' already exists` 错误，说明数据库中已有表。有以下解决方案：

### 方案一：删除数据库并重新创建（推荐，会丢失所有现有数据）

```bash
# 1. 先备份现有数据（可选但强烈推荐）
mysqldump -u root -p112233 shuwei > backup_before_import_$(date +%Y%m%d_%H%M%S).sql

# 2. 删除现有数据库
mysql -u root -p112233 -e "DROP DATABASE IF EXISTS shuwei;"

# 3. 创建新数据库
mysql -u root -p112233 -e "CREATE DATABASE shuwei CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

# 4. 导入 SQL
mysql -u root -p112233 shuwei < latest_sap.sql
```

### 方案二：修改 SQL 文件，添加 DROP TABLE 语句

```bash
# 使用 sed 在 CREATE TABLE 前添加 DROP TABLE IF EXISTS
sed -i 's/^CREATE TABLE `/DROP TABLE IF EXISTS `/g; s/^CREATE TABLE `/CREATE TABLE `/g' latest_sap.sql

# 或者更精确的方式（推荐）
sed -i 's/^CREATE TABLE `\([^`]*\)`/DROP TABLE IF EXISTS `\1`;\nCREATE TABLE `\1`/g' latest_sap.sql

# 然后重新导入
mysql -u root -p112233 shuwei < latest_sap.sql
```

### 方案三：只导入数据，不创建表结构（如果表结构已存在）

如果表结构已经正确，只需要导入数据：

```bash
# 提取 INSERT 语句并执行
grep "^INSERT INTO" latest_sap.sql | mysql -u root -p112233 shuwei
```

### 方案四：使用 --force 选项忽略错误（不推荐）

```bash
mysql -u root -p112233 --force shuwei < latest_sap.sql
```

注意：这会跳过错误但可能导致数据不完整。

---

**提示：** 建议在生产环境导入前，先在开发环境测试导入过程。

