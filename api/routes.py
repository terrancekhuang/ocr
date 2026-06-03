from fastapi import APIRouter, File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool
from PIL import Image
from io import BytesIO

from api.schemas import OCRResponse
from models import registry

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": registry._model is not None,
    }


@router.post("/ocr", response_model=OCRResponse)
async def ocr(file: UploadFile = File(...)):
    image_bytes = await file.read()
    try:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(400, f"Invalid image: {exc}")

    try:
        model = registry.get_model()
        raw = await run_in_threadpool(model.predict, img)
    except Exception as exc:
        raise HTTPException(500, f"Inference error: {exc}")

    return OCRResponse(markdown=raw, raw_output=raw)
