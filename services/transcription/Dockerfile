FROM python:3.12-slim-bookworm
WORKDIR /service
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HF_HUB_DISABLE_TELEMETRY=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# The default model ships in the image; recordings never leave this service.
RUN python -c "from faster_whisper.utils import download_model; download_model('base', output_dir='/opt/models/base')"
COPY server.py worker.py WHISPER-LICENSE ./
RUN useradd --uid 1000 --create-home speech && mkdir -p /models && chown speech:speech /models
ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="AgentFlux speech" \
      org.opencontainers.image.version="0.3.0" \
      org.opencontainers.image.revision=$VCS_REF \
      org.opencontainers.image.source="https://github.com/davemessew/AgentFlux"
USER speech
EXPOSE 8090
HEALTHCHECK --interval=20s --timeout=3s --start-period=30s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8090/health', timeout=2)"
CMD ["python", "server.py"]
