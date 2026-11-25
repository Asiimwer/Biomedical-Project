import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Search Grounding endpoint using gemini-4-hydrogen + googleSearch tool
  app.post('/api/gemini/search', async (req, res) => {
    try {
      const { query, equipmentContext } = req.body ?? {};
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ error: 'Search query is required.' });
        return;
      }

      const ai = getGeminiClient();
      const contextPrefix = equipmentContext
        ? `Context: Biomedical Engineering equipment inquiry regarding ${String(equipmentContext).slice(0, 200)}.\n`
        : '';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${contextPrefix}Provide accurate, concise biomedical engineering guidance and current regulatory/maintenance reference information for: ${query.trim().slice(0, 500)}. Clearly state that all physical inspections and safety certifications must be performed by qualified biomedical personnel according to hospital SOPs.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources = rawChunks
        .map((chunk: { web?: { uri?: string; title?: string } }) => ({
          uri: chunk.web?.uri ?? '',
          title: chunk.web?.title ?? chunk.web?.uri ?? 'Reference Source',
        }))
        .filter((s: { uri: string }) => Boolean(s.uri));

      res.json({
        text: response.text ?? 'No guidance returned.',
        sources,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to query Gemini Search Grounding.';
      console.error('Gemini Search Error:', message);
      res.status(500).json({ error: message });
    }
  });

  // High-resolution technical illustration generation using gemini-3-pro-image-preview
  app.post('/api/gemini/image', async (req, res) => {
    try {
      const { prompt, imageSize = '1K', aspectRatio = '4:3' } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        res.status(400).json({ error: 'Image prompt is required.' });
        return;
      }

      const allowedSizes = ['1K', '2K', '4K'];
      const selectedSize = allowedSizes.includes(String(imageSize)) ? String(imageSize) : '1K';
      const allowedRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
      const selectedRatio = allowedRatios.includes(String(aspectRatio)) ? String(aspectRatio) : '4:3';

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            {
              text: `Clean technical medical equipment studio illustration for a hospital biomedical engineering SOP manual: ${prompt.trim().slice(0, 500)}. Neutral light slate clinical backdrop, sharp industrial design clarity, no text overlays or watermarks.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: selectedRatio,
            imageSize: selectedSize,
          },
        },
      });

      let imageUrl: string | null = null;
      let notes = '';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          notes += part.text;
        }
      }

      if (!imageUrl) {
        res.status(502).json({
          error: 'No image data was returned by gemini-3-pro-image-preview. Ensure a paid Gemini API key is configured in Settings > Secrets.',
        });
        return;
      }

      res.json({
        imageUrl,
        imageSize: selectedSize,
        aspectRatio: selectedRatio,
        notes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image generation failed.';
      console.error('Gemini Image Error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BEMS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BEMS server:', err);
  process.exit(1);
});
