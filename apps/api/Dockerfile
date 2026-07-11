FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/workspace/apps/api:/workspace/packages/processor/src

WORKDIR /workspace

COPY apps/api /workspace/apps/api
COPY packages/processor /workspace/packages/processor
COPY resources/lexicon /workspace/resources/lexicon

RUN pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    pydantic>=2 \
    python-multipart \
    pypdf \
    pymupdf \
    pillow \
    jieba>=0.42.1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
