def build_schedule_summary_prompt(title: str, transcript: str) -> str:
    clean_title = title.strip() or "Untitled live session"
    clean_transcript = transcript.strip()

    return f"""
You are summarizing a live class transcript for a learning platform.

Task:
- Produce a grounded, real-time style summary of the transcript below.
- Only describe what is actually supported by the transcript.
- Do not invent student questions, takeaways, or topics that are not present.
- If a section has no clear evidence, write "Not detected in this segment."
- Keep the output concise, practical, and easy to scan.
- Use markdown only. Do not wrap the answer in code fences.

Required format:
## Transcript Breakdown
For each clear segment, write a short bullet with:
- a segment label
- a confidence tag: High, Medium, or Low
- what is clearly happening
- what is uncertain, if anything

## Data Quality Notes
Include bullets that classify any of these when present:
- Core content
- Metadata / subtitle artifacts
- Noise / uncertain segments
- Translation or ASR errors

## What the transcript supports
If the transcript clearly supports it, add 1-3 bullets with the most useful learning points.
If not, write "Not detected in this segment."

Transcript title: {clean_title}

Transcript:
{clean_transcript}
""".strip()
