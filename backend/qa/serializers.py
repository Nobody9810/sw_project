from rest_framework import serializers
from .models import Question, Answer
from django.contrib.auth import get_user_model
from collections.abc import Mapping

User = get_user_model()

class AnswerSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    def get_author_name(self, obj):
        return (obj.author.first_name.strip() or '读者') if obj.author else '管理员'

    def validate(self, attrs):
        question = attrs.get('question', getattr(self.instance, 'question', None))
        if question and question.status != 'published':
            raise serializers.ValidationError({'question': '问题通过审核后才能回答'})
        return attrs
    
    class Meta:
        model = Answer
        fields = ['id', 'question', 'content', 'author', 'author_name', 'created_at', 'is_accepted']
        read_only_fields = ['author', 'created_at']

class QuestionSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=50, write_only=True, required=False, trim_whitespace=True)
    is_guest = serializers.SerializerMethodField()
    content = serializers.CharField(max_length=3000, trim_whitespace=True, allow_blank=False)
    answers = AnswerSerializer(many=True, read_only=True)
    author_name = serializers.SerializerMethodField()

    def get_author_name(self, obj):
        return (obj.author.first_name.strip() or '读者') if obj.author else (obj.guest_name or '历史提问者')

    def get_is_guest(self, obj):
        return False if obj.author_id else (True if obj.guest_name else None)

    def to_internal_value(self, data):
        if self.context['request'].user.is_authenticated and isinstance(data, Mapping):
            data = data.copy()
            data.pop('name', None)
        return super().to_internal_value(data)

    def validate_name(self, value):
        if not isinstance(self.initial_data.get('name'), str):
            raise serializers.ValidationError('昵称必须是字符串')
        return value

    def validate(self, attrs):
        if self.instance is None and not self.context['request'].user.is_authenticated and not attrs.get('name'):
            raise serializers.ValidationError({'name': '请填写昵称'})
        return attrs

    def validate_content(self, value):
        if not isinstance(self.initial_data.get('content'), str):
            raise serializers.ValidationError('问题必须是字符串')
        return value

    class Meta:
        model = Question
        fields = ['id', 'content', 'name', 'is_guest', 'author', 'author_name', 'status', 'created_at', 'updated_at', 'answers']
        read_only_fields = ['author', 'status', 'created_at', 'updated_at']
