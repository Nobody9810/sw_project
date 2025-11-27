#!/bin/bash
# SQL 导入脚本 - 处理表已存在的情况

DB_USER="root"
DB_PASSWORD="112233"
DB_NAME="shuwei"
SQL_FILE="latest_sap.sql"

echo "开始导入 SQL 文件..."

# 方法1: 删除现有数据库并重新创建（会丢失所有数据）
read -p "是否要删除现有数据库并重新创建？这将删除所有现有数据！(y/N): " confirm
if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
    echo "正在删除现有数据库..."
    mysql -u $DB_USER -p$DB_PASSWORD -e "DROP DATABASE IF EXISTS $DB_NAME;"
    echo "正在创建新数据库..."
    mysql -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
    echo "正在导入 SQL 文件..."
    mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < $SQL_FILE
    echo "导入完成！"
else
    echo "取消操作。"
    exit 1
fi
