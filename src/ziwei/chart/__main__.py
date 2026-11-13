"""Run a local sample: python -m ziwei.chart input.json (after npm install)."""
import json
from pathlib import Path
import sys

from . import BirthInput, render_chart


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python -m ziwei.chart birth_input.json")
    payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    print(json.dumps(render_chart(BirthInput.from_dict(payload)), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
