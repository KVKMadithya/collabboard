const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
}); 

const generateChat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // 1. Get active models directly from Groq
    const modelList = await groq.models.list();
    const availableModelIds = modelList.data.map(m => m.id);
    
    // Log available models to server terminal for reference
    console.log("Available Groq Models:", availableModelIds);

    // 2. Pick an active text model automatically
    const activeModel = availableModelIds.find(id => !id.includes("whisper") && !id.includes("safetensors")) || availableModelIds[0];

    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful CollabBoard assistant. Keep answers concise." },
        { role: "user", content: message }
      ],
      model: activeModel, 
      temperature: 0.5,
      max_tokens: 1000,
    });

    const aiMessage = response.choices[0]?.message?.content;
    res.json({ reply: aiMessage });
  } catch (error) {
    console.error("Groq Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI response" });
  }
};

module.exports = { generateChat };