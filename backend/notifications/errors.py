class DeliveryError(Exception):
    """Safe provider code only: never carry tokens, addresses or response bodies."""

    def __init__(self, code, *, permanent=False, retry_after=0):
        super().__init__(code)
        self.permanent = permanent
        self.retry_after = retry_after
