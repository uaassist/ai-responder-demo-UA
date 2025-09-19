const fetch = require('node-fetch');

// This function simulates fetching the unique business context for a Ukrainian client.
function getBusinessContext() {
    return {
        businessName: "MEDIKOM на Оболонській набережній",
        responderName: "Олена",
        styleGuideExamples: [
            "Дякуємо вам за довіру та такий теплий відгук! Раді, що консультація у лікаря-отоларинголога Віктора Петровича Товстолита була для вас корисною та допомогла розібратись у ситуації. Бажаємо вам міцного здоров’я!",
            "Добрий день, пані Лідіє! Щиро дякуємо за Ваш відгук та високу оцінку стаціонара на Оболонській набережній. Нам дуже приємно знати, що Ви залишилися задоволені візитом.Бажаємо Вам міцного здоров’я та гарного настрою! Завжди раді бачити Вас у MEDIKOM на Оболонській набережній.",
            "Владиславе, дякуємо вам за довіру і зворотній зв'язок! Костянтин Едуардович - наш провідний фахівець в оперативній урології. Пишаємось своєю командою і радіємо, коли можемо допомогти нашим пацієнтам!"
        ],
        avoidWords: ["ми в захваті", "дякуємо, що знайшли час", "Це чудово", "Це велике задоволення"],
        serviceRecoveryOffer: "Вашою скаргою займається Заступник медичного директора з якості.",
        offlineContactInstruction: "Проте нам необхідні подробиці, щоб якісно виправитись. Будь ласка, зв'яжіться з нами за телефоном: +38 (044) 503-77-77 або електронною поштою: feedback@medikom.ua"
    };
}

// --- PROMPT 1: THE ANALYST ---
function buildAnalysisPrompt(review, authorName) {
    return `Your task is to analyze the following customer review. You MUST respond with a valid JSON object.

    JSON Output Structure:
    {
      "author_name_analysis": {
        "is_real_name": true or false,
        "greeting_name": "The first name in the correct vocative case, or null if it's a nickname."
      },
      "sentiment": "Positive, Negative, or Mixed",
      "main_positive_point": "The single most important positive point, or null.",
      "main_negative_point": "The single most important negative point, or null."
    }

    Analysis Rules:
    1.  **author_name_analysis:** Analyze the author's name: "${authorName}". If it's a real human name (e.g., "Олена", "Володимир Петренко"), set "is_real_name" to true and "greeting_name" to the vocative case of the first name. Otherwise, set "is_real_name" to false and "greeting_name" to null.
    2.  **sentiment:** Classify the sentiment. It MUST be "Mixed" if both positive and negative points are present.
    3.  **main_positive_point / main_negative_point:** Identify the single most important positive and/or negative point based on this priority: Emotional comments > Specific people > Specific services > General comments.

    Customer Review to Analyze:
    "${review}"

    Now, generate the complete JSON object.`;
}

// --- PROMPT 2: THE WRITER ---
function buildDraftingPrompt(context, analysis) {
    const formattedExamples = context.styleGuideExamples.map(ex => `- "${ex}"`).join('\n');
    let instructions = `You are an AI assistant helping "${context.responderName}" from "${context.businessName}" draft a professional, empathetic, and brand-aligned reply to a customer review in Ukrainian.

    **CRITICAL Style Guide:**
    Your response MUST match the style, tone, and vocabulary of these real response examples:
    ${formattedExamples}

    **Your Task:**
    Based on the provided analysis, write a short, sincere, and human-sounding reply.
    `;

    // Add instructions based on the analysis from the first prompt
    if (analysis.sentiment === 'Positive') {
        instructions += `\n**Scenario: Positive Review**
        - Start with a warm greeting (use the name "${analysis.author_name_analysis.greeting_name}" if available).
        - Thank the customer and build the reply ONLY around their main positive point: "${analysis.main_positive_point}".
        - End with a warm closing.
        - Sign off with: "- ${context.responderName}".`;
    } else if (analysis.sentiment === 'Negative') {
        instructions += `\n**Scenario: Negative Review**
        - Start with a sincere apology (use the name "${analysis.author_name_analysis.greeting_name}" if available).
        - Acknowledge their main negative point: "${analysis.main_negative_point}".
        - State the recovery action: "${context.serviceRecoveryOffer}".
        - Provide the offline contact instruction: "${context.offlineContactInstruction}".
        - Sign off with: "- ${context.responderName}".`;
    } else { // Mixed Review
        instructions += `\n**Scenario: Mixed Review (Follow this 3-step checklist EXACTLY):**
        1.  **APOLOGIZE:** Start with a sincere apology acknowledging their main negative point: "${analysis.main_negative_point}".
        2.  **RECOVER:** Immediately state the recovery action: "${context.serviceRecoveryOffer}" and provide the offline contact instruction.
        3.  **APPRECIATE:** As the final part, use a transition ("Водночас,") and thank them for their main positive point: "${analysis.main_positive_point}".
        4.  **SIGN-OFF:** Sign off with: "- ${context.responderName}".`;
    }
    
    return instructions;
}


exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  const { reviewText, authorName } = JSON.parse(event.body);
  const businessContext = getBusinessContext();
  
  try {
    // --- STEP 1: RUN THE ANALYSIS PROMPT (WITH A FASTER MODEL) ---
    const analysisPrompt = buildAnalysisPrompt(reviewText, authorName);
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Use the faster model for analysis
        messages: [ { role: 'user', content: analysisPrompt } ],
        temperature: 0.2, // Low temperature for accurate analysis
        response_format: { type: "json_object" },
      }),
    });
    if (!analysisResponse.ok) { throw new Error('AI analysis step failed.'); }
    const analysisData = await analysisResponse.json();
    const analysis = JSON.parse(analysisData.choices[0].message.content);
    
    console.log("AI Full Analysis:", JSON.stringify(analysis, null, 2));

    // --- STEP 2: RUN THE DRAFTING PROMPT (WITH THE HIGH-QUALITY MODEL) ---
    const draftingPrompt = buildDraftingPrompt(businessContext, analysis);
    const draftingResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, },
      body: JSON.stringify({
        model: 'gpt-4-turbo', // Use the high-quality model for writing
        messages: [ { role: 'user', content: draftingPrompt } ],
        temperature: 0.8, // Higher temperature for creative, human-like writing
      }),
    });
    if (!draftingResponse.ok) { throw new Error('AI drafting step failed.'); }
    const draftingData = await draftingResponse.json();
    const aiReply = draftingData.choices[0].message.content;

    return { statusCode: 200, body: JSON.stringify({ draftReply: aiReply }), };
  } catch (error) {
    console.error("Error in function execution:", error);
    return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "AI service is currently unavailable.", details: error.message }) 
    };
  }
};
