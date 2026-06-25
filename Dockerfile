FROM python:3.11-slim

# Install GDAL system dependencies (required by geopandas & rasterio)
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

WORKDIR /app

# Install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create required runtime directories
RUN mkdir -p data/raw/uploads outputs

# Set up a new user named "user" with user ID 1000 for Hugging Face Spaces
RUN useradd -m -u 1000 user

# Give ownership of the working directory to the user
RUN chown -R user:user /app

# Switch to the "user" user
USER user

EXPOSE 7860

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7860"]
