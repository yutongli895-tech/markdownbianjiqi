import { GoogleGenAI } from "@google/genai";

export const onRequestPost = async (context) => {
  const { request, env } = context;

  // 1. 检查 API Key 是否配置
  if (!env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY is not configured in Cloudflare Dashboard. Please add it to Settings -> Functions -> Environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { topic, keyPoints, systemPrompt, userQuery } = await request.json();

    // 正确的初始化方式：必须使用 { apiKey: ... }
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    
    // 尝试使用 gemini-1.5-flash-latest，这是兼容性最好的别名
    // 如果失败，会自动捕获并尝试备选模型
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-1.5-flash-latest", 
        contents: userQuery,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ googleSearch: {} }]
        }
      });
    } catch (firstError) {
      console.warn("Primary model failed, trying fallback:", firstError);
      // 备选方案：使用最新的 2.0 Flash 模型
      response = await ai.models.generateContent({
        model: "gemini-2.0-flash", 
        contents: userQuery,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ googleSearch: {} }]
        }
      });
    }

    const contentText = response.text || '';
    
    // 提取搜索溯源信息
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const groundingSources = groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri || '',
      title: chunk.web?.title || '引用来源'
    })).filter((s: any) => s.uri) || [];

    return new Response(
      JSON.stringify({ text: contentText, sources: groundingSources }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
