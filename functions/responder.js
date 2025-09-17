const fetch = require('node-fetch');

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
        serviceRecoveryOffer: "Вашою скаргою займається Заступник медичного директора з якості."
    };
}

function buildSystemPrompt(context, review) {
    const formattedExamples = context.styleGuideExamples.map(ex => `- "${ex}"`).join('\n');
    const formattedAvoidWords = context.avoidWords.join(', ');

    return `You are a sophisticated AI assistant helping "${context.responderName}" from "${context.businessName}" draft a reply to a customer review in Ukrainian.

    **Your Task:**
    Your goal is to generate a short, sincere, and human-sounding reply. To do this, you will first analyze the review and then draft a reply based on that analysis. You MUST respond with a valid JSON object containing your analysis and the final draft.

    **JSON Output Structure:**
    {
      "analysis": {
        "sentiment": "Positive, Negative, or Mixed",
        "all_points": ["A list of all key points mentioned in the review, in Ukrainian."],
        "main_point_selection": "Explain in Ukrainian which point you chose as the main theme and WHY you chose it based on the selection criteria."
      },
      "draft": "The final, human-sounding reply text, in Ukrainian."
    }

    **Your Thought Process & Rules:**

    **Part 1: The "analysis" object**
    1.  **sentiment:** Determine the overall sentiment.
    2.  **all_points:** List every distinct positive or negative point made by the customer.
    3.  **main_point_selection:** This is the most critical step. From your list of points, you MUST select the SINGLE best point to be the theme of the reply, using this strict priority order:
        -   **Priority 1 (Highest):** Specific, emotional comments about how the service made the patient or their family (especially children) feel.
        -   **Priority 2:** Praise for a specific person (a named doctor or "the nurse").
        -   **Priority 3:** Comments about a specific, tangible part of the service (quality of tests, insurance process).
        -   **Priority 4 (Lowest):** General comments about the facility (clean, fast).
        You MUST briefly state your reasoning in Ukrainian.

    **Part 2: The "draft" object**
    1.  **Focus:** Your draft must be built ONLY around the "main_point" you selected in your analysis. Do NOT list other points.
    2.  **Style:** The tone must be friendly and match the style of the provided examples. You MUST avoid the words from the "avoid words" list.
    3.  **Sign-off:** You MUST sign off with: "- ${context.responderName}".

    **Context for the Task:**
    *   **Style Guide Examples:** ${formattedExamples}
    *   **Words to Avoid:** ${formattedAvoidWords}
    *   **Service Recovery Offer:** ${context.serviceRecoveryOffer}
    *   **Customer's Review to Analyze:** "${review}"

    Now, generate the complete JSON object.`;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  const { reviewText } = JSON.parse(event.body);
  const businessContext = getBusinessContext();
  const systemPrompt = buildSystemPrompt(businessContext, reviewText);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [ { role: 'user', content: systemPrompt } ],
        temperature: 0.7,
        response_format: { type: "json_object" }, // Force the AI to output JSON
      }),
    });
    if (!response.ok) { 
        const errorData = await response.json(); 
        console.error("OpenAI API Error:", errorData);
        throw new Error('OpenAI API request failed.');
    }
    const data = await response.json();
    
    // Parse the JSON string from the AI
    const aiJsonResponse = JSON.parse(data.choices[0].message.content);
    
    // FOR DEBUGGING: Log the AI's "thought process"
    console.log("AI Full Analysis:", JSON.stringify(aiJsonResponse.analysis, null, 2));
    
    // Extract just the draft to send back to the frontend
    const aiReply = aiJsonResponse.draft;

    return { statusCode: 200, body: JSON.stringify({ draftReply: aiReply }), };
  } catch (error) {
    console.error("Error in function execution:", error);
    return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "AI service is currently unavailable.", details: error.message }) 
    };
  }
};
