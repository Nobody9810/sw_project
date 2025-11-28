from faker import Faker
import hashlib

fake = Faker()


def generate_avatar(username):
    # 这里使用简单的哈希方法为用户名生成一个Gravatar URL
    avatar_hash = hashlib.md5(username.encode()).hexdigest()
    return f"https://www.gravatar.com/avatar/{avatar_hash}?d=identicon"
