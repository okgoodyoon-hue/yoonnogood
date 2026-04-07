import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI API endpoint
  app.post("/api/ai", async (req, res) => {
    const { prompt, model = "gemini-3-flash-preview", useSearch = false } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Use the models.generateContent pattern seen in the original App.tsx
      const result = await (genAI as any).models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
      });

      const response = result.response;
      const text = response.text();
      
      // Extract grounding metadata if available
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

      res.json({ text, groundingMetadata });
    } catch (error: any) {
      console.error("AI API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
