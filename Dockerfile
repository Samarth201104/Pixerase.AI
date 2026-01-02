# Fast CUDA base image with PyTorch already installed
FROM pytorch/pytorch:2.1.2-cuda11.8-cudnn8-runtime

WORKDIR /app

# Install ONLY minimal required system packages (fast)
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements (WITHOUT torch, torchvision, torchaudio in requirements.txt)
COPY requirements.txt .

# Install python dependencies

RUN pip install --no-cache-dir -r requirements.txt

# Copy full project
COPY . .
COPY background/models/u2net.pth background/models/u2net.pth

EXPOSE 5000

CMD ["python", "app.py"]
