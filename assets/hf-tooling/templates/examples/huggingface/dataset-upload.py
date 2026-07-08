from pathlib import Path

from huggingface_hub import HfApi


def main() -> None:
    api = HfApi()
    repo_id = "USERNAME_OR_ORG/example-dataset"
    path = Path("sample.txt")
    path.write_text("hello from ML Claw\n", encoding="utf-8")

    api.create_repo(repo_id=repo_id, repo_type="dataset", exist_ok=True, private=True)
    api.upload_file(
        path_or_fileobj=str(path),
        path_in_repo="sample.txt",
        repo_id=repo_id,
        repo_type="dataset",
    )


if __name__ == "__main__":
    main()
