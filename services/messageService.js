import { GoogleGenerativeAI } from "@google/generative-ai";
import { BadRequestError } from "../errors/customErrors.js";

// Lazy initialization of Google Gemini AI
let genAI = null;

/**
 * Get or initialize the Gemini AI instance
 * @returns {GoogleGenerativeAI|null}
 */
const getGeminiInstance = () => {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

// Constants
const SINHALA_UNICODE_RANGE = /[\u0D80-\u0DFF]/;
const GEMINI_TIMEOUT_MS = 10000; // 10 seconds
const GEMINI_MODEL = "models/gemini-2.5-flash"; // Latest stable Gemini model

/**
 * Check if text contains Sinhala characters
 * @param {string} text - Text to check
 * @returns {boolean} - True if contains Sinhala characters
 */
export const containsSinhalaCharacters = (text) => {
  if (!text || typeof text !== 'string') return false;
  return SINHALA_UNICODE_RANGE.test(text);
};

/**
 * Translate Sinhala text to English using Google Gemini
 * @param {string} text - Sinhala text to translate
 * @returns {Promise<string>} - Translated English text
 * @throws {Error} - If translation fails
 */
export const translateSinhalaToEnglish = async (text) => {
  const geminiInstance = getGeminiInstance();
  
  if (!geminiInstance) {
    throw new Error("GEMINI_API_KEY is not configured. Cannot perform translation.");
  }

  try {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Translation request timed out")), GEMINI_TIMEOUT_MS);
    });

    // Create translation promise
    const translationPromise = (async () => {
      const model = geminiInstance.getGenerativeModel({ model: GEMINI_MODEL });
      
      const prompt = `Translate the following Sinhala text to English. Only provide the translation, nothing else:\n\n${text}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const translatedText = response.text().trim();
      
      if (!translatedText) {
        throw new Error("Translation returned empty response");
      }
      
      return translatedText;
    })();

    // Race between translation and timeout
    const translation = await Promise.race([translationPromise, timeoutPromise]);
    
    return translation;
  } catch (error) {
    // Log error for monitoring
    console.error("❌ Translation error:", error.message);
    
    // Rethrow with context
    if (error.message.includes("timed out")) {
      throw new Error("Translation service timed out. Please try again.");
    } else if (error.message.includes("API key")) {
      throw new Error("Translation service configuration error.");
    } else {
      throw new Error(`Translation failed: ${error.message}`);
    }
  }
};

/**
 * Process message content and handle translation if needed
 * @param {string} messageText - Original message text
 * @returns {Promise<{originalMessage: string, translatedMessage: string, requiresTranslation: boolean}>}
 */
export const processMessageContent = async (messageText) => {
  if (!messageText || typeof messageText !== 'string') {
    throw new BadRequestError("Message text is required and must be a string");
  }

  const hasSinhala = containsSinhalaCharacters(messageText);
  
  let translatedMessage = messageText;
  
  // Only translate if Sinhala characters are detected
  if (hasSinhala) {
    try {
      translatedMessage = await translateSinhalaToEnglish(messageText);
      console.log("✅ Translation successful");
    } catch (error) {
      console.error("❌ Translation failed, storing original message:", error.message);
      // Store original message if translation fails - don't block message creation
      translatedMessage = messageText;
    }
  }
  
  return {
    originalMessage: messageText,
    translatedMessage: translatedMessage,
    requiresTranslation: hasSinhala
  };
};

/**
 * Create a new message with translation support
 * @param {Object} messageData - Message data including senderId and message
 * @param {Object} userData - User data from authentication
 * @param {Object} fileData - Optional file upload data
 * @returns {Promise<Object>} - Created message object
 */
export const createMessageWithTranslation = async (messageData, userData, fileData = null) => {
  const { message } = messageData;
  
  if (!message) {
    throw new BadRequestError("Message content is required");
  }

  // Process message content (detect Sinhala and translate if needed)
  const { originalMessage, translatedMessage, requiresTranslation } = await processMessageContent(message);
  
  // Prepare the message object for database
  const messagePayload = {
    ...messageData,
    originalMessage,
    translatedMessage,
    requiresTranslation,
    message: translatedMessage, // Store translated version as primary message
    createdBy: userData.userId
  };

  // Add file path if image was uploaded
  if (fileData) {
    messagePayload.image = `uploads/${fileData.filename}`;
  }

  return messagePayload;
};
