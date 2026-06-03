from abc import ABC, abstractmethod
from PIL.Image import Image


class OCRModel(ABC):
    @abstractmethod
    def predict(self, image: Image) -> str:
        ...
