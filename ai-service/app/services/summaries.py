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
Short bullets with the main ideas, explanations, or examples covered. Scale
the number of bullets to how much actually happened — a short session may
have only 1-2 bullets, and that is fine.

## Questions & Follow-ups
Only include this section if students asked questions or the teacher gave
homework, next steps, or reminders. Otherwise omit it entirely.

Always produce the recap, even when the transcript is very short — summarize
whatever was said, however brief, and keep the overview modest rather than
padding it with invented content. Never refuse, never apologize, and never
comment on the length or quality of the recording.

Session title: {clean_title}

Transcript:
{clean_transcript}
""".strip()
