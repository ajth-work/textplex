FROM python:3.12-slim

WORKDIR /site
COPY . .

EXPOSE 8200

CMD ["python", "-m", "http.server", "8200", "--bind", "0.0.0.0", "--directory", "."]
