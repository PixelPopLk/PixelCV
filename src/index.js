const MAX_BODY_BYTES = 12000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function cleanText(value, max = 4000) {
  return String(value ?? "").trim().slice(0, max);
}

function buildPrompt(action, input) {
  if (action === "summary") {
    const source = [
      `Name: ${cleanText(input.name, 120)}`,
      `Target role: ${cleanText(input.title, 160)}`,
      `Education: ${cleanText(input.education, 1200)}`,
      `Experience: ${cleanText(input.experience, 1800)}`,
      `Skills: ${cleanText(input.skills, 1000)}`,
      `Projects: ${cleanText(input.projects, 1000)}`,
      `What the person wants to say about themselves: ${cleanText(input.aboutMe, 1800)}`
    ].join("\n");

    return {
      system: [
        "You write concise professional CV content.",
        "Use only facts supplied by the user. Never invent employers, dates, qualifications, achievements, metrics, job titles, or skills.",
        "Write a natural professional summary for a CV.",
        "Return only the summary paragraph. No heading, no bullets, no quotation marks.",
        "Keep it between 45 and 90 words."
      ].join(" "),
      user: source
    };
  }

  if (action === "experience") {
    const source = [
      `Job title: ${cleanText(input.title, 180)}`,
      `Company: ${cleanText(input.company, 180)}`,
      `Original description: ${cleanText(input.description, 2500)}`
    ].join("\n");

    return {
      system: [
        "You improve CV job descriptions.",
        "Use only facts supplied by the user. Do not invent numbers, responsibilities, tools, clients, or achievements.",
        "Return 2 to 4 concise action-oriented bullet lines, one bullet per line, without bullet symbols.",
        "Preserve the original meaning and dates. Do not add a heading."
      ].join(" "),
      user: source
    };
  }

  throw new Error("Unsupported AI action");
}

async function callGemini(env, action, input) {
  const apiKey = env.GEMINI_API_KEY;
  const model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const prompt = buildPrompt(action, input);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: prompt.system }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt.user }]
        }
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: action === "summary" ? 180 : 220,
        candidateCount: 1
      }
    })
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Gemini returned an unexpected response.");
  }

  if (!response.ok) {
    const message = data?.error?.message || `Gemini API error (${response.status})`;
    throw new Error(message);
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || "")
    .join(" ")
    .trim();

  if (!text) throw new Error("Gemini did not return text.");
  return text.replace(/^['\"]|['\"]$/g, "").trim();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": url.origin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400"
        }
      });
    }

    if (url.pathname !== "/api/ai" || request.method !== "POST") {
      return json({ error: "Not found" }, 404);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength && contentLength > MAX_BODY_BYTES) {
      return json({ error: "Request is too large." }, 413);
    }

    try {
      const body = await request.text();
      if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
        return json({ error: "Request is too large." }, 413);
      }

      const payload = JSON.parse(body);
      const action = payload?.action;
      const input = payload?.input || {};

      if (!action || !["summary", "experience"].includes(action)) {
        return json({ error: "Invalid AI action." }, 400);
      }

      const result = await callGemini(env, action, input);
      return json({ ok: true, action, result });
    } catch (error) {
      console.error(error);
      return json({
        ok: false,
        error: error?.message || "AI request failed."
      }, 500);
    }
  }
};
