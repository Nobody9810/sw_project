from rest_framework.throttling import BaseThrottle
from shuwei.submissions import allow_submission


class QuestionSubmissionThrottle(BaseThrottle):
    def allow_request(self, request, view):
        return allow_submission(request, 'question')

    def wait(self):
        return 600
