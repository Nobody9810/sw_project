from django.db.models import Prefetch
from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError
from django.db import transaction

from shuwei.pagination import ContentPagination
from .models import Answer, Question
from .serializers import AnswerSerializer, QuestionSerializer
from .throttles import QuestionSubmissionThrottle


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.filter(status='published')
    serializer_class = QuestionSerializer
    pagination_class = ContentPagination

    def get_throttles(self):
        return [QuestionSubmissionThrottle()] if self.action == 'create' else []

    def get_permissions(self):
        permission = permissions.AllowAny if self.action in ('list', 'retrieve', 'create') else permissions.IsAdminUser
        return [permission()]

    def get_queryset(self):
        queryset = Question.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(status='published')
        return queryset.select_related('author').prefetch_related(
            Prefetch('answers', queryset=Answer.objects.select_related('author'))
        )

    def perform_create(self, serializer):
        from notifications.events import question_pending
        from rest_framework.authentication import SessionAuthentication
        SessionAuthentication().enforce_csrf(self.request)
        name = serializer.validated_data.pop('name', '')
        with transaction.atomic():
            question = serializer.save(author=self.request.user if self.request.user.is_authenticated else None,
                                       guest_name='' if self.request.user.is_authenticated else name, status='draft')
            question_pending(question)

    def perform_update(self, serializer):
        from notifications.models import TelegramReview
        from django.utils import timezone
        with transaction.atomic():
            serializer.instance = Question.objects.select_for_update().get(pk=serializer.instance.pk)
            question = serializer.save()
            TelegramReview.objects.filter(question=question, status='pending').update(
                status='superseded', processed_at=timezone.now())


class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.filter(question__status='published')
    serializer_class = AnswerSerializer
    pagination_class = ContentPagination

    def get_permissions(self):
        permission = permissions.AllowAny if self.action in ('list', 'retrieve') else permissions.IsAdminUser
        return [permission()]

    def get_queryset(self):
        queryset = Answer.objects.select_related('author', 'question')
        if not self.request.user.is_staff:
            queryset = queryset.filter(question__status='published')
        return queryset

    def perform_create(self, serializer):
        with transaction.atomic():
            target = serializer.validated_data.get('question') or serializer.instance.question
            question = Question.objects.select_for_update().get(pk=target.pk)
            if question.status != 'published':
                raise ValidationError({'question': '问题通过审核后才能回答'})
            serializer.save(**({'author': self.request.user} if serializer.instance is None else {}))

    def perform_update(self, serializer):
        self.perform_create(serializer)
