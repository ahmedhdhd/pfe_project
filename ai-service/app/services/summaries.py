def build_schedule_summary_prompt(title: str, transcript: str) -> str:
    clean_title = title.strip() or "Untitled live session"
    clean_transcript = transcript.strip()

    return f"""
You are writing a session recap for students who attended (or missed) a live
class on a learning platform. The recap is shown to students and teachers.

Task:
- Summarize what was taught in the session, based only on the transcript below.
- Do not invent topics, questions, or takeaways that are not in the transcript.
- Write for students: clear, friendly, and easy to scan.
- Never mention transcription, audio quality, confidence levels, ASR errors,
  metadata, or any other technical detail about how the transcript was made.
- Use markdown only. Do not wrap the answer in code fences.

Required format:
## Session Overview
2-3 sentences describing what the session covered overall.

## Key Points
3-7 short bullets with the main ideas, explanations, or examples covered.

## Questions & Follow-ups
Only include this section if students asked questions or the teacher gave
homework, next steps, or reminders. Otherwise omit it entirely.

If the transcript is too short or unclear to produce a meaningful recap,
respond with a single friendly sentence such as:
"This session's recording was too short to generate a detailed summary."
Do not explain why, and do not describe the transcript itself.

Session title: {clean_title}

Transcript:
{clean_transcript}
""".strip()
