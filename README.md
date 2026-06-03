# OCR → LaTeX

Web app that converts document images to LaTeX using locally-hosted ML models.

- **Document mode** — [Nougat](https://github.com/facebookresearch/nougat) (Meta): handles full pages with text, equations, and tables
- **Equation mode** — [Pix2Tex / LaTeX-OCR](https://github.com/lukas-blecher/LaTeX-OCR): optimised for isolated math equations

## Setup

### 1. Install PyTorch (CPU-only machines)

Skip this if you have a CUDA GPU — the regular torch from step 2 will work.

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000` in your browser.

## First run

Models are downloaded automatically on first use:

| Model | Size | Cache location |
|-------|------|----------------|
| Nougat small | ~250 MB | `~/.cache/huggingface/hub/models--facebook--nougat-small/` |
| Pix2Tex | ~85 MB | `~/.local/share/pix2tex/checkpoints/` |

The first conversion will be slow (~30–60s) while the model loads. Subsequent conversions are faster.

## Usage tips

- **Camera**: requires `localhost` or HTTPS (WebRTC browser security requirement)
- **Document mode**: photograph a full portrait-oriented page, well-lit and flat
- **Equation mode**: crop tightly around the equation for best accuracy
- **Snippet** output is suitable for pasting into an existing `.tex` file
- **Full .tex** output is a complete compilable document (`pdflatex output.tex`)
