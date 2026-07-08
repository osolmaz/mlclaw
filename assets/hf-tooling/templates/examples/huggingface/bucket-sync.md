# Storage Bucket Sync

The durable ML Claw state bucket is available as:

```bash
echo "$OPENCLAW_HF_STATE_BUCKET"
```

List buckets:

```bash
hf buckets list
```

Upload a file to an explicit bucket path:

```bash
hf buckets cp ./local-file.txt "hf://buckets/$OPENCLAW_HF_STATE_BUCKET/examples/local-file.txt"
```
