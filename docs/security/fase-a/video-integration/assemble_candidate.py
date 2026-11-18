"""Print the reviewed SQL candidate as one transaction. No database connection."""
from hashlib import sha256
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARTS = ("00-accounting.sql", "01-upload.sql", "02-total-quota.sql")


def candidate_sql():
    manifest = dict(line.split(maxsplit=1)[::-1] for line in
                    (ROOT / "SHA256SUMS").read_text().splitlines())
    bodies = []
    for name in PARTS:
        data = (ROOT / name).read_bytes()
        if sha256(data).hexdigest() != manifest[name]:
            raise ValueError(f"Checksum mismatch for {name}")
        lines = data.decode("utf-8").strip().splitlines()
        if lines[0] != "BEGIN;" or lines[-1] != "COMMIT;":
            raise ValueError(f"Unexpected transaction boundaries in {name}")
        body = lines[1:-1]
        if any(line.strip().upper() in {"BEGIN;", "COMMIT;", "ROLLBACK;"} for line in body):
            raise ValueError(f"Unexpected transaction boundary inside {name}")
        bodies.extend([f"-- {name}", *body])
    return "\n".join(["BEGIN;", *bodies, "COMMIT;", ""])


if __name__ == "__main__":
    print(candidate_sql(), end="")
