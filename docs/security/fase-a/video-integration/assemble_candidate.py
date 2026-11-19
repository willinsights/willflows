"""Print the reviewed SQL candidate as one transaction. No database connection."""
import argparse
from hashlib import sha256
from pathlib import Path
import re
from uuid import UUID

ROOT = Path(__file__).resolve().parent
PARTS = ("00-accounting.sql", "01-upload.sql", "02-total-quota.sql")
ACCOUNTING_LOCK = "LOCK TABLE public.video_versions, public.workspace_storage IN SHARE ROW EXCLUSIVE MODE NOWAIT;"


def candidate_sql(review=None):
    manifest = dict(line.split(maxsplit=1)[::-1] for line in
                    (ROOT / "SHA256SUMS").read_text().splitlines())

    def checked(name):
        data = (ROOT / name).read_bytes()
        if sha256(data).hexdigest() != manifest[name]:
            raise ValueError(f"Checksum mismatch for {name}")
        return data.decode("utf-8").strip()

    bodies = []
    for name in PARTS:
        lines = checked(name).splitlines()
        if lines[0] != "BEGIN;" or lines[-1] != "COMMIT;":
            raise ValueError(f"Unexpected transaction boundaries in {name}")
        body = lines[1:-1]
        if any(line.strip().upper() in {"BEGIN;", "COMMIT;", "ROLLBACK;"} for line in body):
            raise ValueError(f"Unexpected transaction boundary inside {name}")
        if name == PARTS[0] and review:
            workspace, stored, active, count, fingerprint = review
            amounts = [int(value) for value in (stored, active, count)]
            if any(value < 0 or value > 2**63 - 1 for value in amounts):
                raise ValueError("Counter values must fit a nonnegative bigint")
            if not re.fullmatch(r"[0-9a-f]{64}", fingerprint):
                raise ValueError("Expected a SHA-256 snapshot hash")
            correction = checked("reconcile-reviewed-counter.sql")
            replacements = {
                "__BASELINE_QUERY__": checked("quota-baseline.sql").removesuffix(";"),
                "__WORKSPACE__": str(UUID(workspace)),
                "__STORED__": str(amounts[0]), "__ACTIVE__": str(amounts[1]),
                "__COUNT__": str(amounts[2]), "__HASH__": fingerprint,
            }
            for token, value in replacements.items():
                correction = correction.replace(token, value)
            body.insert(body.index(ACCOUNTING_LOCK) + 1, correction)
        bodies.extend([f"-- {name}", *body])
    return "\n".join(["BEGIN;", *bodies, "COMMIT;", ""])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reconcile-counter", nargs=5, metavar=("WORKSPACE", "STORED", "ACTIVE", "COUNT", "SHA256"))
    print(candidate_sql(parser.parse_args().reconcile_counter), end="")
