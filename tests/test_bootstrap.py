"""Basic package import smoke test; domain contracts come later."""

from ziwei import __version__


def test_package_imports() -> None:
    assert __version__ == "0.1.0"
