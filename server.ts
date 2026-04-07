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

    console.log(`AI Request: model=${model}, useSearch=${useSearch}`);
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Use the exact pattern from the original App.tsx which was working
      const result = await (genAI as any).models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: useSearch ? [{ googleSearch: {} }] : undefined,
        }
      });

      console.log("AI Response received");
      // The result structure might be different for this SDK version
      const text = result.text || (result.response && result.response.text && result.response.text()) || "";
      const groundingMetadata = result.candidates?.[0]?.groundingMetadata || (result.response && result.response.candidates?.[0]?.groundingMetadata);

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
