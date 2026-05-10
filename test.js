const fs = require('fs');

async function testGemini() {
  const GEMINI_API_KEY = "AIzaSyBaS9dxOFVG723cHZLPK1JwVmxmzG-84fk"; // User's key
  const name = "Mom";
  const m1 = "Baking cookies";
  const m2 = "Reading stories";
  const m3 = "Always there";

  const mems = [m1, m2, m3].filter(Boolean).map((m, i) => `Memory ${i + 1}: "${m.trim()}"`).join('\n');
  const memoriesBlock = mems || 'She gave everything without asking for anything in return.';
  const prompt =
    `You are writing a deeply emotional cinematic Mother's Day tribute.

Create a heartfelt story using the provided memories.

Style:

* emotional
* cinematic
* nostalgic
* elegant
* warm

Themes:

* childhood dreams
* sacrifice
* unconditional love
* gratitude
* strength

Keep it concise and beautiful.

End with an emotional thank-you message.

Mother's Name:
${name || 'her'}

Memories:
${memoriesBlock}

---

Formatting rules (follow strictly):
- Write 5 to 7 paragraphs separated by blank lines
- Use third-person ("she", "her") throughout
- Let the memories surface naturally
- Do NOT use markdown, bullet points, asterisks, or headers — only plain paragraphs
- Output only the story. No labels, no preamble.`;

  console.log("Fetching API...");
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 1.1, maxOutputTokens: 1000, topP: 0.95 } })
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }
    const data = await res.json();
    console.log("Response:", data?.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testGemini();
