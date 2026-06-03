from pydantic import BaseModel


class OCRResponse(BaseModel):
    markdown: str
    raw_output: str
