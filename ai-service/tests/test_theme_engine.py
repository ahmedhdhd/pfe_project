import unittest

from app.services.theme_engine import _sanitize_css


def sanitize(candidate_css: str) -> str:
    return _sanitize_css(
        candidate_css,
        primary="#2563eb",
        secondary="#ec4899",
        font_family="Inter, sans-serif",
        description="Blue and rose LMS theme",
    )


class ThemeEnginePolicyTests(unittest.TestCase):
    def test_color_variables_pass(self) -> None:
        css = sanitize(
            """
            :root { --primary: oklch(0.7 0.15 220); }
            .dark { --primary: oklch(0.62 0.14 220); }
            """
        )

        self.assertIn("--primary: oklch(0.7 0.15 220);", css)
        self.assertIn("--primary: oklch(0.62 0.14 220);", css)

    def test_radius_is_clamped(self) -> None:
        css = sanitize(
            """
            :root { --radius: 3rem; }
            .dark { --radius: 3rem; }
            """
        )

        self.assertIn("--radius: 1rem;", css)

    def test_spacing_is_clamped(self) -> None:
        css = sanitize(
            """
            :root { --spacing: 2rem; }
            .dark { --spacing: 2rem; }
            """
        )

        self.assertIn("--spacing: 0.5rem;", css)

    def test_locked_variables_are_removed(self) -> None:
        css = sanitize(
            """
            :root { --button-height: 4rem; }
            .dark { --button-height: 4rem; }
            """
        )

        self.assertNotIn("--button-height", css)

    def test_unknown_variables_are_removed(self) -> None:
        css = sanitize(
            """
            :root { --mystery-token: 42; }
            .dark { --mystery-token: 42; }
            """
        )

        self.assertNotIn("--mystery-token", css)

    def test_non_theme_selectors_are_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "only :root and .dark"):
            sanitize(
                """
                body { display: none; }
                :root { --primary: oklch(0.7 0.15 220); }
                .dark { --primary: oklch(0.62 0.14 220); }
                """
            )


if __name__ == "__main__":
    unittest.main()
