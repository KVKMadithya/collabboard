const Groq = require("groq-sdk");
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const mongoose = require('mongoose'); // 🛑 NEW: Required to fix the Task/Note ID query issue

const Task = require('../models/Task');
const Note = require('../models/Note');
const ReportModule = require('../models/ReportModule');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
}); 

// 🛑 NEW: Prevent 413 Entity Too Large errors by capping text length
const MAX_CHARS = 12000; 
const truncateText = (text) => {
  if (text.length > MAX_CHARS) {
    return text.substring(0, MAX_CHARS) + "\n...[CONTENT TRUNCATED DUE TO SIZE LIMITS]";
  }
  return text;
};

// 1. FOR TEMP CHAT UPLOADS (Deletes file after reading)
const extractTextFromFile = async (file) => {
  if (!file) return "";
  try {
    const buffer = fs.readFileSync(file.path);
    let extractedText = "";

    if (file.mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } 
    else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } 
    else if (file.mimetype === 'text/plain') {
      extractedText = buffer.toString('utf-8');
    }

    fs.unlink(file.path, (err) => {
      if (err) console.error("Failed to delete temp file:", err);
    });

    return truncateText(extractedText); // 🛑 Updated to truncate
  } catch (error) {
    console.error("Document Parsing Error:", error);
    if (file && file.path) fs.unlink(file.path, () => {}); 
    throw new Error("Failed to read the attached document.");
  }
};

// 2. FOR SAVED DATABASE REPORTS (Does NOT delete the file)
const extractTextFromSavedPath = async (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return "";
  try {
    const buffer = fs.readFileSync(filePath);
    const ext = filePath.split('.').pop().toLowerCase();
    
    let extracted = "";
    if (ext === 'pdf') {
      const data = await pdfParse(buffer);
      extracted = data.text;
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      extracted = result.value;
    } else if (ext === 'txt') {
      extracted = buffer.toString('utf-8');
    }
    
    return truncateText(extracted); // 🛑 Updated to truncate
  } catch (error) {
    console.error(`Failed to read saved report at ${filePath}:`, error);
    return ""; // Return empty string rather than crashing the whole chat
  }
};

const generateChat = async (req, res) => {
  try {
    const { message, mode, projectId } = req.body;
    const attachedFile = req.file;

    if (!message && !attachedFile) {
      return res.status(400).json({ message: "Message or document is required." });
    }

    let systemPrompt = "You are CollabBoard's elite AI Assistant. You are helpful, highly intelligent, and concise. Format your answers beautifully using markdown (bullet points, bold text).";

    if (mode === 'workspace' && projectId) {
      // 🛑 FIX 1: Cast string ID to MongoDB ObjectId to ensure queries don't fail
      const validProjectId = mongoose.Types.ObjectId.isValid(projectId) 
        ? new mongoose.Types.ObjectId(projectId) 
        : projectId;
        
      const query = { $or: [{ project: validProjectId }, { projectId: validProjectId }] };

      const [tasks, notes, reports] = await Promise.all([
        Task.find(query).select('title description status priority'),
        Note.find(query).select('title content category'),
        ReportModule.find(query).select('name description proposal finalReport dataReport')
      ]);

      // FIX 2: Loop through reports and extract the actual text from the physical files
      let reportsWithText = [];
      for (const report of reports) {
        let reportContent = "";
        
        if (report.proposal) {
          reportContent += `\n[Proposal Document]:\n` + await extractTextFromSavedPath(report.proposal);
        }
        if (report.finalReport) {
          reportContent += `\n[Final Report Document]:\n` + await extractTextFromSavedPath(report.finalReport);
        }
        if (report.dataReport) {
          reportContent += `\n[Data Report Document]:\n` + await extractTextFromSavedPath(report.dataReport);
        }

        reportsWithText.push({
          name: report.name,
          description: report.description,
          extractedFileContent: reportContent
        });
      }

      systemPrompt += `\n\nYou are currently assisting a user within a specific Workspace. Here is the live data from their database:\n`;
      systemPrompt += `\n--- TASKS ---\n${JSON.stringify(tasks)}`;
      systemPrompt += `\n--- NOTES ---\n${JSON.stringify(notes)}`;
      systemPrompt += `\n--- REPORTS CONTENT ---\n${JSON.stringify(reportsWithText)}`;
      systemPrompt += `\n\nUse the data above to accurately answer questions about their project. If the user asks about a report, read the extracted file content provided above.`;
    }

    let finalUserPrompt = message || "Please summarize the attached document.";
    
    if (attachedFile) {
      const documentText = await extractTextFromFile(attachedFile);
      finalUserPrompt += `\n\n--- ATTACHED DOCUMENT CONTENT ---\n${documentText}`;
    }

    const modelList = await groq.models.list();
    const availableModelIds = modelList.data.map(m => m.id);
    
    const preferredModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768"
    ];

    const activeModel = 
      preferredModels.find(model => availableModelIds.includes(model)) || 
      availableModelIds.find(id => 
        !id.includes("whisper") && 
        !id.includes("guard") && 
        !id.includes("safeguard")
      ) || 
      "llama-3.3-70b-versatile";

    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalUserPrompt }
      ],
      model: activeModel, 
      temperature: 0.5,
    });

    const aiMessage = response.choices[0]?.message?.content;
    res.json({ reply: aiMessage });

  } catch (error) {
    console.error("Groq RAG Error:", error);
    res.status(500).json({ message: error.message || "Failed to generate AI response" });
  }
};

module.exports = { generateChat };