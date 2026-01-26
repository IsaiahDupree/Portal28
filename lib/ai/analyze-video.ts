import OpenAI from "openai";

// Lazy-load OpenAI client to avoid build-time initialization errors
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export interface Chapter {
  timestamp_seconds: number;
  title: string;
  summary: string;
}

export interface Note {
  content: string;
  type: "key_point" | "summary" | "definition" | "example";
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface AnalysisResult {
  transcription: string;
  chapters: Chapter[];
  notes: Note[];
  quiz_suggestions: QuizQuestion[];
  key_points: string[];
}

export async function transcribeAudio(audioUrl: string): Promise<string> {
  // For now, we'll use a placeholder - in production, download audio and send to Whisper
  // This would typically involve:
  // 1. Download audio from Mux or video URL
  // 2. Send to OpenAI Whisper API
  // 3. Return transcription
  
  const response = await getOpenAIClient().audio.transcriptions.create({
    file: await fetch(audioUrl).then(r => r.blob()) as any,
    model: "whisper-1",
    response_format: "text",
  });
  
  return response;
}

export async function analyzeTranscription(transcription: string): Promise<Omit<AnalysisResult, "transcription">> {
  const systemPrompt = `You are an expert course content analyzer. Given a video transcription, extract:
1. Chapters with timestamps (estimate based on content flow, assuming ~150 words per minute)
2. Key learning notes
3. Quiz questions to test comprehension

Respond in JSON format only.`;

  const userPrompt = `Analyze this video transcription and create educational content:

TRANSCRIPTION:
${transcription}

Respond with this exact JSON structure:
{
  "chapters": [
    {"timestamp_seconds": 0, "title": "Introduction", "summary": "Brief description"},
    ...
  ],
  "notes": [
    {"content": "Key point or concept", "type": "key_point"},
    {"content": "Definition of term", "type": "definition"},
    ...
  ],
  "quiz_suggestions": [
    {
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "The correct answer is A because..."
    },
    ...
  ],
  "key_points": ["Main takeaway 1", "Main takeaway 2", ...]
}

Generate 3-7 chapters, 5-10 notes, and 3-5 quiz questions based on the content depth.`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error("Failed to parse AI response as JSON");
  }
}

export async function generateChaptersFromTranscription(
  transcription: string,
  videoDurationSeconds: number
): Promise<Chapter[]> {
  const systemPrompt = `You are an expert at creating video chapter markers. Given a transcription and video duration, create logical chapter breaks with timestamps.`;

  const userPrompt = `Create chapter markers for this ${Math.round(videoDurationSeconds / 60)} minute video.

TRANSCRIPTION:
${transcription}

Respond with JSON array of chapters:
[
  {"timestamp_seconds": 0, "title": "Introduction", "summary": "Brief overview of the topic"},
  {"timestamp_seconds": 120, "title": "Main Concept", "summary": "Explanation of core idea"},
  ...
]

Space chapters logically based on content transitions. Total duration: ${videoDurationSeconds} seconds.`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.chapters || [];
  } catch {
    return [];
  }
}

export async function generateQuizFromTranscription(
  transcription: string,
  numQuestions: number = 5
): Promise<QuizQuestion[]> {
  const systemPrompt = `You are an expert educator creating quiz questions to test comprehension. Create multiple-choice questions that test understanding, not just memorization.`;

  const userPrompt = `Create ${numQuestions} quiz questions based on this content:

TRANSCRIPTION:
${transcription}

Respond with JSON:
{
  "questions": [
    {
      "question": "Clear question about the content?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Why this is correct..."
    }
  ]
}`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    return parsed.questions || [];
  } catch {
    return [];
  }
}

export async function generateNotesFromTranscription(transcription: string): Promise<Note[]> {
  const systemPrompt = `You are an expert at creating concise, actionable learning notes from educational content.`;

  const userPrompt = `Extract key learning notes from this transcription:

TRANSCRIPTION:
${transcription}

Respond with JSON:
{
  "notes": [
    {"content": "Key concept or takeaway", "type": "key_point"},
    {"content": "Important definition", "type": "definition"},
    {"content": "Practical example", "type": "example"},
    {"content": "Section summary", "type": "summary"}
  ]
}

Create 5-10 notes that capture the most important information.`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    return parsed.notes || [];
  } catch {
    return [];
  }
}

export async function analyzeVideoContent(
  transcription: string,
  videoDurationSeconds?: number
): Promise<AnalysisResult> {
  // Run all analysis in parallel for speed
  const [chaptersResult, notesResult, quizResult] = await Promise.all([
    videoDurationSeconds 
      ? generateChaptersFromTranscription(transcription, videoDurationSeconds)
      : analyzeTranscription(transcription).then(r => r.chapters),
    generateNotesFromTranscription(transcription),
    generateQuizFromTranscription(transcription, 5),
  ]);

  const keyPoints = notesResult
    .filter(n => n.type === "key_point")
    .map(n => n.content);

  return {
    transcription,
    chapters: chaptersResult as Chapter[],
    notes: notesResult,
    quiz_suggestions: quizResult,
    key_points: keyPoints,
  };
}
