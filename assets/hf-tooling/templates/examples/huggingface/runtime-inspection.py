import importlib.metadata as metadata
import os


for package in ["huggingface_hub", "datasets", "safetensors"]:
    print(f"{package}=={metadata.version(package)}")

print("OPENCLAW_MODEL=", os.environ.get("OPENCLAW_MODEL", ""))
print("OPENCLAW_HF_STATE_BUCKET=", os.environ.get("OPENCLAW_HF_STATE_BUCKET", ""))
