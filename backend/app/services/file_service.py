import tempfile
from pathlib import Path


class TemporaryWorkspace:
    """Unique per-request workspace cleaned when its response closes."""
    def __init__(self):
        self._directory = tempfile.TemporaryDirectory(prefix="pixerase-")
        self.path = Path(self._directory.name)

    def attach(self, response):
        response.call_on_close(self.cleanup)
        return response

    def cleanup(self):
        if self._directory is not None:
            self._directory.cleanup()
            self._directory = None
