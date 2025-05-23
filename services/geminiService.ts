import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Quiz, GeminiQuizResponse } from '../types';
import { GEMINI_MODEL_TEXT } from '../constants';

export async function generateQuiz(
    topicOrText: string, 
    numQuestions: number, 
    imageUrl?: string,
    bloomLevel?: string
): Promise<Quiz> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not found. Please ensure API_KEY environment variable is set.");
  }

  let imagePromptSection = "";
  if (imageUrl && numQuestions > 0) {
    imagePromptSection = `
One of these ${numQuestions} questions MUST be about the image provided.
The image-based question should involve identifying elements, context, or activities within the image.
This image-based question should also follow all other MCQ formatting requirements.
The "imageUrl" field for this question in the JSON response MUST be exactly: "${imageUrl}".
For all other questions, the "imageUrl" field must be an empty string or omitted.
`;
  }
  
  let bloomTaxonomyPromptSection = "";
  if (bloomLevel && bloomLevel !== "") {
    bloomTaxonomyPromptSection = `
Focus on generating questions that align with the '${bloomLevel}' level of Bloom's Taxonomy.
For example, if 'Application' is chosen, questions should require applying knowledge to new situations.
If 'Analysis' is chosen, questions should involve breaking down information.
`;
  }

  const prompt = `
You are a smart and friendly quiz generator AI.
Given the following input, generate an interactive quiz.

Input Topic/Text:
---
${topicOrText}
---

${imagePromptSection}

Quiz Requirements:
1. Generate exactly ${numQuestions} multiple-choice questions (MCQs).
2. Each question must have 4 options (A, B, C, D) with only one correct answer.
3. Clearly indicate the correct answer (using "A", "B", "C", or "D") and provide a short explanation for each question.
4. Mix difficulty levels (Easy, Medium, Hard) and label them for each question.
5. Avoid repeating questions or answers.
6. Use clear, beginner-friendly language.
${bloomTaxonomyPromptSection}
7. Format the output as a single structured JSON object matching this structure:
{
  "topic": "User Provided Topic or A summary of the custom text if it was long",
  "questions": [
    {
      "question": "Sample question text?",
      "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
      "correctAnswer": "C",
      "explanation": "Explanation for why C is correct.",
      "difficulty": "Easy", // or "Medium" or "Hard"
      "imageUrl": ${imageUrl ? `"${imageUrl}"` : '""'} // Include this ONLY for the image-based question, otherwise omit or make empty string.
    }
    // ... more questions
  ]
}

Be concise and accurate. If the input was a large text or document, ensure questions are based on its key points.
Ensure the "topic" field in the JSON response accurately reflects the subject matter of the quiz generated.
If an image URL was provided for an image-based question, ensure that question's JSON object includes the "imageUrl" field with the provided URL. For other questions, this field should be omitted or be an empty string. Make sure only ONE question has the imageUrl if provided.
All ${numQuestions} questions should be unique.
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    let jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    const parsedData = JSON.parse(jsonStr) as GeminiQuizResponse;
    if (!parsedData.topic || typeof parsedData.topic !== 'string') {
      parsedData.topic = topicOrText.substring(0,100);
    }
    if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
      throw new Error("AI did not return any questions. Try a different topic or phrasing.");
    }
    let imageAssigned = false;
    parsedData.questions.forEach((q, index) => {
      if (!q.question || !q.options || typeof q.options !== 'object' || Object.keys(q.options).length !== 4 || !q.correctAnswer || !q.explanation || !q.difficulty) {
        throw new Error(`Received malformed question data from AI for question ${index + 1}.`);
      }
      if (imageUrl) {
        if (q.imageUrl === imageUrl && !imageAssigned) {
          imageAssigned = true;
        } else if (q.imageUrl === imageUrl && imageAssigned) {
          delete q.imageUrl;
        } else if (q.imageUrl && q.imageUrl !== imageUrl) {
          delete q.imageUrl;
        }
      } else {
        delete q.imageUrl;
      }
    });
    if (imageUrl && !imageAssigned && parsedData.questions.length > 0) {
      parsedData.questions[0].imageUrl = imageUrl;
    }
    return parsedData as Quiz;
  } catch (error) {
    throw new Error(`API call failed. Check network or API Key. Original: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getSimplifiedExplanation(textToSimplify: string): Promise<string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not found. Please ensure API_KEY environment variable is set.");
  }
  const prompt = `Please simplify the following text. Explain it in a very simple way, as if you were talking to a 5-year-old child. Be clear, concise, and use easy-to-understand words.\n\nOriginal Text:\n---\n${textToSimplify}\n---\n\nSimplified Explanation (for a 5-year-old):`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  });
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    const simplifiedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    if (!simplifiedText) {
      throw new Error("AI returned an empty simplified explanation.");
    }
    return simplifiedText;
  } catch (error) {
    throw new Error(`API call failed for simplification. Check network or API Key. Original: ${error instanceof Error ? error.message : String(error)}`);
  }
}
