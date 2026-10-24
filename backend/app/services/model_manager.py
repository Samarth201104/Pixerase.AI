from threading import Lock


class ModelManager:
    """Load each inference model once, on its first request."""
    def __init__(self):
        self._lock = Lock()
        self._background = None
        self._object = None
        self._device = None

    def device(self):
        if self._device is None:
            import torch
            self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        return self._device

    def background(self, path):
        with self._lock:
            if self._background is None:
                from app.models.background.model_loader import load_u2net
                self._background = load_u2net(str(path), device=self.device())
            return self._background

    def object(self, path):
        with self._lock:
            if self._object is None:
                from app.models.object.infer import load_object_model
                self._object = load_object_model(str(path), device=self.device())
            return self._object


models = ModelManager()
