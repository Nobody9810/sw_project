from rest_framework import viewsets, permissions
from .models import Question, Answer
from .serializers import QuestionSerializer, AnswerSerializer
from rest_framework.decorators import action
from rest_framework.response import Response

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.filter(status='published')
    serializer_class = QuestionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Admin can see all, others only published? 
        # For simplicity, sticking to published for the main API.
        # You might want a separate Admin API or permission checks here.
        return Question.objects.filter(status='published')

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(author=self.request.user, status='draft')
        else:
            # Anonymous users can post? Assuming yes for now, but they need auth to have 'author'.
            serializer.save(author=None, status='draft')

class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(author=self.request.user)
