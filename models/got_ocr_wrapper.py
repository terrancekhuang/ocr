import torch
from models.base import OCRModel

_CHECKPOINT = "stepfun-ai/GOT-OCR-2.0-hf"


class GotOcrWrapper(OCRModel):
    def __init__(self):
        from transformers import GotOcr2ForConditionalGeneration, AutoProcessor

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.processor = AutoProcessor.from_pretrained(_CHECKPOINT)
        self.model = GotOcr2ForConditionalGeneration.from_pretrained(
            _CHECKPOINT,
            low_cpu_mem_usage=True,
            device_map=self.device,
        ).eval()

    def predict(self, image) -> str:
        inputs = self.processor(image, return_tensors="pt", format=True).to(self.device)

        with torch.no_grad():
            generate_ids = self.model.generate(
                **inputs,
                do_sample=False,
                tokenizer=self.processor.tokenizer,
                stop_strings="<|im_end|>",
                max_new_tokens=4096,
            )

        return self.processor.decode(
            generate_ids[0, inputs["input_ids"].shape[1]:],
            skip_special_tokens=True,
        )
