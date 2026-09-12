// ===================================================
// 담벼락 메모마다 Gemini에게 짧은 코멘트를 부탁하는 서버 코드
//
// 선생님이 화면에서 "AI 코멘트 받기"를 누르면 여기(/api/gemini)로
// 지금 담벼락에 있는 메모 목록을 보내고, 메모마다 코멘트를 받아 돌려줍니다.
//
// API 키는 코드에 적지 않고 Vercel 환경변수(GEMINI_API_KEY)에서 꺼내 씁니다.
// Vercel 대시보드 → 프로젝트 → Settings → Environment Variables 에서 등록하세요.
//
// 개인정보 보호: 메모의 text만 Gemini에 보냅니다. uid·이메일은 절대 보내지 않습니다.
// ===================================================

// 무료 요금제로 쓸 수 있는 모델입니다. Google AI Studio 요금제 페이지
// (https://ai.google.dev/pricing) 에서 현재 무료 등급 모델을 확인하고,
// 바뀌었으면 Vercel 환경변수 GEMINI_MODEL로 덮어써서 코드 수정 없이 바꿀 수 있습니다.
const DEFAULT_MODEL = "gemini-2.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST로 요청해 주세요." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되어 있지 않습니다." });
    return;
  }

  const memos = req.body && req.body.memos;
  if (!Array.isArray(memos) || memos.length === 0) {
    res.status(400).json({ error: "코멘트를 남길 메모가 없습니다." });
    return;
  }

  // Gemini에는 id와 text만 보냅니다.
  const memosForPrompt = memos.map(function (memo) {
    return { id: String(memo.id), text: String(memo.text || "") };
  });

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const prompt =
    "당신은 초등·중등 교실 담벼락(메모판)을 도와주는 다정한 보조 선생님입니다.\n" +
    "아래는 학생들이 쓴 메모 목록입니다. 메모마다 한 문장, 한국어로, 짧고 따뜻하게 코멘트를 남겨 주세요.\n" +
    "메모 목록(JSON): " + JSON.stringify(memosForPrompt) + "\n" +
    "반드시 각 메모의 id를 그대로 사용해서, id와 comment로 이루어진 배열로만 답해 주세요.";

  try {
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING" },
                  comment: { type: "STRING" }
                },
                required: ["id", "comment"]
              }
            }
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.status(502).json({ error: "Gemini 호출 실패: " + errText });
      return;
    }

    const geminiData = await geminiRes.json();
    const raw =
      geminiData.candidates &&
      geminiData.candidates[0] &&
      geminiData.candidates[0].content &&
      geminiData.candidates[0].content.parts &&
      geminiData.candidates[0].content.parts[0] &&
      geminiData.candidates[0].content.parts[0].text;

    if (!raw) {
      res.status(502).json({ error: "Gemini 응답을 이해할 수 없습니다." });
      return;
    }

    const comments = JSON.parse(raw);
    res.status(200).json({ comments: comments });
  } catch (err) {
    res.status(500).json({ error: "서버 오류: " + err.message });
  }
}
