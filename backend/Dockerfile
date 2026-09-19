# syntax=docker/dockerfile:1

# ---- deps: build wheel utk ML (pandas/numpy/statsmodels/scikit-learn) ----
FROM python:3.12-slim AS deps
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip setuptools wheel && pip install -r requirements.txt

# ---- final slim ----
FROM python:3.12-slim
WORKDIR /code
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    SKIP_DB=1 \
    DATA_KAS_PATH=/shared/data-kas.json
COPY --from=deps /usr/local /usr/local
COPY backend/app ./app
COPY shared/data-kas.json /shared/data-kas.json
EXPOSE 8077
HEALTHCHECK --interval=25s --timeout=3s --start-period=6s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8077/openapi.json', timeout=3)"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8077"]
