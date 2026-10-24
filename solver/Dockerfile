# Budowanie z korzenia repo: docker build -f solver/Dockerfile -t planner-solver .
# Uruchomienie: docker run --rm -v "$PWD:/app" planner-solver generuj --out plan.json --time 120
FROM python:3.12-slim

WORKDIR /app
COPY solver/requirements.txt solver/requirements-dev.txt solver/
RUN pip install --no-cache-dir -r solver/requirements.txt -r solver/requirements-dev.txt

ENTRYPOINT ["python", "-m", "solver.cli"]
