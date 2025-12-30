import { GoogleGenAI } from "@google/genai";
import { Move } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateCommentary = async (
  myMove: Move,
  opponentMove: Move,
  winner: 'me' | 'opponent' | 'draw'
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Reviewing the play...";

  const prompt = `
    Two players just played Rock Paper Scissors.
    Player 1 played: ${myMove}
    Player 2 played: ${opponentMove}
    Result: ${winner === 'draw' ? 'Draw' : winner === 'me' ? 'Player 1 Wins' : 'Player 2 Wins'}

    Act as a hype e-sports commentator. Give a very short, punchy, and funny 1-sentence commentary on this specific outcome. 
    Make it sound like a fighting game announcement.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "What a match!";
  } catch (error) {
    console.error("Gemini commentary failed", error);
    return "The crowd goes wild!";
  }
};
