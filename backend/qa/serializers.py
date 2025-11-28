from rest_framework import serializers
from .models import Question, Answer
from django.contrib.auth import get_user_model

User = get_user_model()

class AnswerSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    
    class Meta:
        model = Answer
        fields = ['id', 'question', 'content', 'author', 'author_name', 'created_at', 'is_accepted']
        read_only_fields = ['author', 'created_at']

class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)
    author_name = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'content', 'author', 'author_name', 'status', 'created_at', 'updated_at', 'answers']
        read_only_fields = ['author', 'status', 'created_at', 'updated_at']
