const fetch = require('node-fetch');

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
        avoidWords: ["ми в захваті", "дякуємо, що знайшли час", "Це чудово", "Це велике задоволення", "Ваше визнання"],

        serviceRecoveryOffer: "Вашою скаргою займається Заступник медичного директора з якості."
    };
}

// --- THIS FUNCTION CONTAINS THE FINAL, CORRECTED PROMPT ---
function buildSystemPrompt(context, review) {
    const formattedExamples = context.styleGuideExamples.map(ex => `- "${ex}"`).join('\n');
    const formattedAvoidWords = context.avoidWords.join(', ');

    return `You are a sophisticated AI assistant helping "${context.responderName}" from "${context.businessName}" draft a professional, empathetic, and brand-aligned reply to a customer review in Ukrainian.

    **Your Task:**
    You MUST respond with a valid JSON object containing your analysis and the final draft.

    **JSON Output Structure:**
    {
      "analysis": {
        "sentiment": "Positive, Negative, or Mixed",
        "all_points": ["A list of all key points from the review, in Ukrainian."],
        "main_point_selection": "Explain in Ukrainian which point you chose as the main theme and WHY."
      },
      "draft": "The final, human-sounding reply text, in Ukrainian."
    }

    **Your Thought Process & Rules:**

    **Part 1: The "analysis" object**
    1.  **sentiment:** Determine the overall sentiment.
    2.  **all_points:** List every distinct point made by the customer.
    3.  **main_point_selection:** Select the SINGLE best point to be the theme of the reply, using this strict priority order:
        -   Priority 1 (Highest): Specific, emotional comments about the service.
        -   Priority 2: Praise or criticism for a specific person.
        -   Priority 3: General comments about the service.
        -   Priority 4 (Lowest): General comments about the facility.
        You MUST briefly state your reasoning in Ukrainian.

    **Part 2: The "draft" object (Your Response Strategy)**
    *   **For Positive Reviews:** Thank the customer and build the reply ONLY around the single "main_point" you selected.
    *   **For Negative Reviews & Mixed Reviews (Follow this checklist EXACTLY):**
        1.  **APOLOGIZE:** Start with a sincere apology that acknowledges the specific negative point and validates their feelings.
        2.  **STATE ACTION:** Immediately state the internal action being taken: "${context.serviceRecoveryOffer}". This shows you are taking the feedback seriously. After this statement, you can add a general and polite closing, inviting further discussion without making promises you can't keep. A good phrase would be "Ми прагнемо стати кращими для вас" (We strive to be better for you).
        3.  **APPRECIATE (For Mixed Reviews Only):** If the review is mixed, you MUST thank them for their positive feedback as the final part of your message. Use a transition like "Водночас,".
    
    **General Rules for the Draft:**
    -   **Style:** The tone must be friendly and match the provided examples. You MUST avoid the words from the "avoid words" list.
    -   **Sign-off:** You MUST sign off with: "- ${context.responderName}".

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
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) { 
        const errorData = await response.json(); 
        console.error("OpenAI API Error:", errorData);
        throw new Error('OpenAI API request failed.');
    }
    const data = await response.json();
    
    const aiJsonResponse = JSON.parse(data.choices[0].message.content);
    
    console.log("AI Full Analysis:", JSON.stringify(aiJsonResponse.analysis, null, 2));
    
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
