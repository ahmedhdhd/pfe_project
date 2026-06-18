import unittest

from app.services.summaries import build_schedule_summary_prompt


class ScheduleSummaryPromptTests(unittest.TestCase):
    def test_prompt_requires_evidence_based_structure(self) -> None:
        prompt = build_schedule_summary_prompt(
            "Live class on Arabic reading",
            "Arabic greeting. Subtitle credit. Mixed language fragments.",
        )

        self.assertIn("## Transcript Breakdown", prompt)
        self.assertIn("## Data Quality Notes", prompt)
        self.assertIn("Not detected in this segment.", prompt)
        self.assertIn("Do not invent student questions", prompt)
        self.assertIn("Use markdown only.", prompt)


if __name__ == "__main__":
    unittest.main()
