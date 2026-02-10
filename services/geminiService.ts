
import { GoogleGenAI } from "@google/genai";
import { Category, Task } from "../types.ts";

export async function generateInsights(categories: Category[], tasks: Task[]) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Gemini API Key is missing. Please ensure it is set in the environment.");
    return "AI insights are currently unavailable because the API key is not configured.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Analyze this event management progress data and provide high-level strategic insights for the "IIT Madras Talk" event.
        
        Categories: ${JSON.stringify(categories, null, 2)}
        Tasks: ${JSON.stringify(tasks, null, 2)}
        
        Please provide:
        1. A brief summary of overall progress.
        2. Identify specific categories or tasks at high risk.
        3. Suggest 3 actionable next steps to ensure the 10 March 2026 deadline is met.
        4. Detect potential bottlenecks (e.g., blocked tasks).
        
        Format the response in clear Markdown.
      `,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating insights:", error);
    return "Failed to generate AI insights. The service might be temporarily unavailable.";
  }
}

export async function generateWeeklyReport(categories: Category[]) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "Weekly report generation requires a valid API key.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Generate a professional weekly progress report based on the following category data for the IIT-M Talk Event Management Team.
        
        Data: ${JSON.stringify(categories, null, 2)}
        
        Format the report with sections: 
        - Executive Summary
        - Phase-wise Status
        - Key Risks & Mitigations
        - Focus for Next Week
      `,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating report:", error);
    return "Failed to generate weekly report.";
  }
}
