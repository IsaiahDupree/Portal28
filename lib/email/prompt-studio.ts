import { z } from "zod";

// Schema for prompt-generated updates (validated before applying)
export const PromptUpdateSchema = z.object({
  updated_schedule_text: z.string().optional(),
  updated_audience_type: z.enum(["all", "leads", "customers", "segment"]).optional(),
  updated_audience_filter: z.record(z.unknown()).optional(),
  updated_subject: z.string().max(200).optional(),
  updated_preview_text: z.string().max(300).optional(),
  updated_html: z.string().optional(),
  explanation: z.string().optional()
});

export type PromptUpdate = z.infer<typeof PromptUpdateSchema>;

// System prompt for Portal28/Sarah's voice
export const PORTAL28_SYSTEM_PROMPT = `You are the email copywriter for Portal28 Academy, run by Sarah Ashley.

Voice guidelines:
- Confident but not arrogant
- Warm and encouraging
- Results-focused
- Feminine-coded without being "girly" or corny
- Direct and concise
- Professional but personable

Email structure:
- Hook in the first line
- Clear value proposition
- Single call-to-action
- Keep emails under 200 words unless specified

Never use:
- "Hey girl!" or similar
- Excessive exclamation marks
- Salesy language like "limited time" unless true
- Generic filler like "hope this email finds you well"`;

// Parse prompt commands like "schedule: Friday 3pm ET"
export function parsePromptCommands(prompt: string): {
  commands: Record<string, string>;
  contentPrompt: string;
} {
  const commands: Record<string, string> = {};
  const lines = prompt.split("\n");
  const contentLines: string[] = [];

  for (const line of lines) {
    const commandMatch = line.match(/^(schedule|audience|tone|length|cta):\s*(.+)$/i);
    if (commandMatch) {
      commands[commandMatch[1].toLowerCase()] = commandMatch[2].trim();
    } else {
      contentLines.push(line);
    }
  }

  return {
    commands,
    contentPrompt: contentLines.join("\n").trim()
  };
}

// Build the LLM prompt for generating email content
export function buildGenerationPrompt(args: {
  basePrompt: string;
  userPrompt: string;
  currentSubject?: string;
  currentHtml?: string;
  programName: string;
  audienceType: string;
}): string {
  const { commands, contentPrompt } = parsePromptCommands(args.userPrompt);

  return `${PORTAL28_SYSTEM_PROMPT}

Program: ${args.programName}
Audience: ${args.audienceType}

${args.basePrompt ? `Base style instructions:\n${args.basePrompt}\n` : ""}

${args.currentSubject ? `Current subject: ${args.currentSubject}` : ""}

User request: ${contentPrompt}
${commands.tone ? `Tone: ${commands.tone}` : ""}
${commands.length ? `Length: ${commands.length}` : ""}
${commands.cta ? `CTA: ${commands.cta}` : ""}

Output ONLY valid JSON matching this schema:
{
  "updated_subject": "string (new subject line)",
  "updated_preview_text": "string (email preview text, max 100 chars)",
  "updated_html": "string (the email body HTML)",
  "explanation": "string (brief explanation of changes)"
}

${commands.schedule ? `Also include: "updated_schedule_text": "${commands.schedule}"` : ""}
${commands.audience ? `Also include: "updated_audience_type": "segment", "updated_audience_filter": { parse the filter }` : ""}`;
}

// Validate and extract structured updates from LLM response
export function parsePromptResponse(response: string): PromptUpdate | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON object in response
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      return null;
    }

    const parsed = JSON.parse(objectMatch[0]);
    const validated = PromptUpdateSchema.safeParse(parsed);

    if (validated.success) {
      return validated.data;
    }

    console.error("Validation failed:", validated.error);
    return null;
  } catch (err) {
    console.error("Failed to parse prompt response:", err);
    return null;
  }
}

// Generate a diff between versions for display
export function generateVersionDiff(
  oldVersion: { subject: string; html_content: string },
  newVersion: { subject: string; html_content: string }
): { subjectChanged: boolean; contentChanged: boolean; summary: string } {
  const subjectChanged = oldVersion.subject !== newVersion.subject;
  const contentChanged = oldVersion.html_content !== newVersion.html_content;

  const changes: string[] = [];
  if (subjectChanged) changes.push("subject line");
  if (contentChanged) changes.push("email content");

  return {
    subjectChanged,
    contentChanged,
    summary: changes.length > 0 ? `Changed: ${changes.join(", ")}` : "No changes"
  };
}
