import unittest

from app.services.summaries import build_schedule_summary_prompt


class ScheduleSummaryPromptTests(unittest.TestCase):
    def test_prompt_requires_student_facing_recap(self) -> None:
        prompt = build_schedule_summary_prompt(
            "Live class on Arabic reading",
            "Arabic greeting. Subtitle credit. Mixed language fragments.",
        )

        self.assertIn("## Session Overview", prompt)
        self.assertIn("## Key Points", prompt)
        self.assertIn("## Questions & Follow-ups", prompt)
        self.assertIn("Do not invent topics", prompt)
        self.assertIn("Use markdown only.", prompt)
        # The recap must stay free of transcription/data-quality jargon.
        self.assertIn("Never mention transcription", prompt)
        self.assertNotIn("Transcript Breakdown", prompt)
        self.assertNotIn("Data Quality Notes", prompt)


if __name__ == "__main__":
    unittest.main()
