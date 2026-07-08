# Hugging Face Examples

This workspace starts with the Hugging Face CLI, `hf-discover`, `uv`,
`huggingface_hub`, `datasets`, and `safetensors` available.

Useful checks:

```bash
hf auth whoami
hf repos list
hf-discover --version
python -c "import datasets, safetensors; from huggingface_hub import HfApi"
```

Do not put secrets in this directory. Use the Space or local gateway secrets
managed by ML Claw.
