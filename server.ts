import express from "express";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for Research
  app.get("/api/research", async (req, res) => {
    const { query, latest } = req.query;
    let arxivUrl = '';
    
    if (query) {
      arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query as string)}&start=0&max_results=15&sortBy=relevance&sortOrder=descending`;
    } else {
      arxivUrl = `https://export.arxiv.org/api/query?search_query=cat:physics&start=0&max_results=15&sortBy=submittedDate&sortOrder=descending`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(arxivUrl, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!response.ok) throw new Error('ArXiv server error');
      const text = await response.text();
      res.send(text);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error("ArXiv fetch timed out");
        res.status(504).send("ArXiv fetch timed out");
      } else {
        console.error("Server-side fetch error:", error);
        res.status(500).send("Error fetching from arXiv");
      }
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
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
