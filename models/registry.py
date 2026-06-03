import threading
from models.base import OCRModel

_model: OCRModel | None = None
_lock = threading.Lock()


def get_model() -> OCRModel:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                from models.got_ocr_wrapper import GotOcrWrapper
                _model = GotOcrWrapper()
    return _model
