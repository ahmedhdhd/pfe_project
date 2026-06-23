import asyncio
from typing import Any

from app.config import settings
from app.services.embeddings import create_embedding, search_similar_chunks
from app.services.openrouter import chat_json


def _format_rag_section(chunks: list[dict[str, Any]], *, heading: str) -> str:
    if not chunks:
        return f"{heading}\n(No course content chunks were retrieved.)"

    lines: list[str] = [heading]
    for index, chunk in enumerate(chunks, start=1):
        metadata = chunk.get("metadata") or {}
        lesson = metadata.get("contentTitle") or "Unknown lesson"
        topic = metadata.get("topicName") or "Unknown topic"
        chapter = metadata.get("chapterName") or ""
        location = f"{lesson} — {topic}"
        if chapter:
            location = f"{chapter} / {location}"
        similarity = float(chunk.get("similarity") or 0)
        lines.append(
            f"[{index}] ({location}, relevance {similarity:.2f}):\n"
            f"{chunk.get('chunk_text', '')}"
        )
    return "\n\n".join(lines)


def _dedupe_chunks(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for chunk in chunks:
        key = f"{chunk.get('content_id')}:{chunk.get('chunk_text', '')[:120]}"
        if key in seen:
            continue
        seen.add(key)
        unique.append(chunk)
    return unique


async def retrieve_course_chunks(
    *,
    api_key: str,
    batch_id: str,
    query_text: str,
    topic_id: str | None = None,
    content_ids: list[str] | None = None,
    top_k: int | None = None,
) -> list[dict[str, Any]]:
    query = (query_text or "").strip()
    if not query:
        return []

    embedding = await create_embedding(api_key, query)
    return await search_similar_chunks(
        embedding,
        batch_id,
        top_k=top_k,
        topic_id=topic_id,
        content_ids=content_ids,
    )


def _level_instruction(level: str) -> str:
    normalized = (level or "MEDIUM").upper()
    if normalized == "EASY":
        return (
            "Easy: test recall and basic understanding with direct wording "
            "and low cognitive load."
        )
    if normalized == "HARD":
        return (
            "Hard: require analysis, application, edge cases, or multi-step reasoning. "
            "Avoid trick questions, but make distractors plausible."
        )
    return (
        "Medium: mix understanding and application. Questions should be clear "
        "but require more than memorization."
    )


def build_assignment_generation_prompt(
    *,
    assignment_title: str,
    assignment_description: str,
    course_name: str,
    topic_name: str,
    teacher_prompt: str,
    count: int,
    level: str,
) -> str:
    scope = course_name or "the course"
    if topic_name:
        scope = f"{topic_name} in {scope}"

    return f"""You are an expert instructional designer creating LMS assignment questions.

CRITICAL RULES:
- Use only the assignment details below and your general instructional design knowledge.
- Do not depend on indexed course content, embeddings, or retrieval results.
- Ensure questions are accurate and relevant to the assignment topic.
- Reference concepts and terminology appropriately.
- Prefer clear, teachable questions that fit the requested difficulty level.

Assignment scope: {scope}
Assignment title: {assignment_title}
Assignment description: {assignment_description or "(none)"}
Teacher instructions: {teacher_prompt}
Difficulty: {level}
Number of questions: {count}
Difficulty requirement: {_level_instruction(level)}

Return JSON only:
{{
  "questions": [
    {{
      "type": "QUIZ" | "TRUE_FALSE" | "SHORT_ANSWER",
      "title": "short title",
      "prompt": "student-facing question, can include simple HTML",
      "points": 1,
      "options": [{{"id":"a","text":"Option A"}}],
      "correctAnswer": {{"optionId":"a"}} OR {{"value":true}} OR {{"text":"expected answer"}}
    }}
  ]
}}

Supported types: QUIZ, TRUE_FALSE, SHORT_ANSWER only.
For QUIZ: exactly 4 options with ids a,b,c,d and one correct optionId.
For TRUE_FALSE: include correctAnswer.value as boolean.
For SHORT_ANSWER: include correctAnswer.text that matches the assignment scope and difficulty."""


def build_assignment_feedback_prompt(
    *,
    assignment_title: str,
    assignment_description: str,
    course_name: str,
    topic_name: str,
    score_percent: float | None,
    questions: list[dict[str, Any]],
    question_contexts: list[dict[str, Any]],
) -> str:
    question_blocks: list[str] = []
    for item, context in zip(questions, question_contexts, strict=False):
        rag_section = _format_rag_section(
            context.get("retrieved_chunks") or [],
            heading="Relevant lesson content for this question:",
        )
        question_blocks.append(
            f"""Question {item.get("number")} (id: {item.get("questionId")}):
Type: {item.get("type")}
Prompt: {item.get("prompt")}
Points: {item.get("points")}
Student answer: {item.get("studentAnswer") or "(blank)"}
Expected answer key: {item.get("correctAnswer") or "(teacher review)"}
Objective correctness hint: {item.get("isCorrect")}

{rag_section}"""
        )

    scope = course_name or "the course"
    if topic_name:
        scope = f"{topic_name} in {scope}"

    return f"""You are an educational tutor evaluating an assignment submission for "{assignment_title}".

CRITICAL RULES:
- Base explanations on the relevant lesson content provided for each question where possible.
- If retrieved content is missing or insufficient, use your general knowledge to evaluate and explain the answer.
- Explain WHY an answer is correct, partially correct, or incorrect.
- Cite lesson/topic names from the retrieved content when helpful.
- Be concise, supportive, and actionable.

Course scope: {scope}
Assignment description: {assignment_description or "(none)"}
Overall score percent (if graded): {score_percent}

Return JSON only with keys:
overallFeedback, weakConcepts, strengths, recommendations, questionFeedback, suggestedScorePercent

Each questionFeedback item must include:
questionId, isCorrect, feedback, whyCorrectAnswer, studyHint

suggestedScorePercent: number from 0 to 100 estimating overall performance against the course material and answer key.

Submission details:
{chr(10).join(question_blocks)[:24000]}"""


async def generate_assignment_questions_with_llm(
    *,
    api_key: str,
    model: str,
    batch_id: str,
    topic_id: str | None,
    content_ids: list[str] | None,
    assignment_title: str,
    assignment_description: str,
    course_name: str,
    topic_name: str,
    teacher_prompt: str,
    count: int,
    level: str,
) -> dict[str, Any]:
    prompt = build_assignment_generation_prompt(
        assignment_title=assignment_title,
        assignment_description=assignment_description,
        course_name=course_name,
        topic_name=topic_name,
        teacher_prompt=teacher_prompt,
        count=count,
        level=level,
    )

    parsed = await chat_json(
        api_key=api_key,
        model=model,
        prompt=prompt,
        temperature=0.25,
        max_tokens=settings.openrouter_assignment_generation_max_tokens,
    )

    questions = parsed.get("questions")
    if not isinstance(questions, list):
        questions = []

    return {
        "questions": questions,
        "ragChunksUsed": 0,
        "ragStatus": "llm",
    }


async def _retrieve_question_context(
    *,
    api_key: str,
    batch_id: str,
    topic_id: str | None,
    question: dict[str, Any],
) -> dict[str, Any]:
    query_parts = [
        str(question.get("prompt") or ""),
        str(question.get("correctAnswer") or ""),
        str(question.get("studentAnswer") or ""),
    ]
    query_text = " ".join(part.strip() for part in query_parts if part.strip())
    chunks = await retrieve_course_chunks(
        api_key=api_key,
        batch_id=batch_id,
        query_text=query_text,
        topic_id=topic_id,
        top_k=settings.rag_assignment_feedback_top_k,
    )
    return {
        "questionId": question.get("questionId"),
        "retrieved_chunks": chunks,
    }


async def evaluate_assignment_submission_with_rag(
    *,
    api_key: str,
    model: str,
    batch_id: str,
    topic_id: str | None,
    assignment_title: str,
    assignment_description: str,
    course_name: str,
    topic_name: str,
    score_percent: float | None,
    questions: list[dict[str, Any]],
) -> dict[str, Any]:
    question_contexts = await asyncio.gather(
        *[
            _retrieve_question_context(
                api_key=api_key,
                batch_id=batch_id,
                topic_id=topic_id,
                question=question,
            )
            for question in questions
        ]
    )

    all_chunks = _dedupe_chunks(
        [
            chunk
            for context in question_contexts
            for chunk in (context.get("retrieved_chunks") or [])
        ]
    )

    prompt = build_assignment_feedback_prompt(
        assignment_title=assignment_title,
        assignment_description=assignment_description,
        course_name=course_name,
        topic_name=topic_name,
        score_percent=score_percent,
        questions=questions,
        question_contexts=question_contexts,
    )

    parsed = await chat_json(
        api_key=api_key,
        model=model,
        prompt=prompt,
        temperature=0.2,
        max_tokens=settings.openrouter_assignment_feedback_max_tokens,
    )

    return {
        **parsed,
        "ragChunksUsed": len(all_chunks),
        "ragStatus": "ok" if all_chunks else "no_chunks",
    }
