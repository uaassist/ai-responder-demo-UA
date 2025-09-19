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
        // NEW: Add a specific contact instruction for the business
        offlineContactInstruction: "Проте нам необхідні подробиці, щоб якісно виправитись. Будь ласка, зв'яжіться з нами за телефоном: +38 (044) 503-77-77  або електронною поштою: feedbeack@medikom.ua"
    };
}

// --- THIS FUNCTION CONTAINS THE FINAL, CORRECTED PROMPT ---
function buildSystemPrompt(context, review, authorName) {
    const formattedExamples = context.styleGuideExamples.map(ex => `- "${ex}"`).join('\n');
    const formattedAvoidWords = context.avoidWords.join(', ');

    return `You are a sophisticated AI assistant helping "${context.responderName}" from "${context.businessName}" draft a professional, empathetic, and brand-aligned reply to a customer review from Google Maps in Ukrainian.

    **Your Task:**
    You MUST respond with a valid JSON object containing your analysis and the final draft.

    **JSON Output Structure:**
    // ... (This section is unchanged)

    **Your Thought Process & Rules (Follow in this exact order):**

    **Part 1: The "analysis" object**
    1.  **name_analysis:** Analyze the author's name: "${authorName}". IF it is a real human name, state that you will use only the first name in the vocative case. IN ALL OTHER CASES, state that you will use a generic greeting.
    2.  **all_points & sentiment:** List all distinct points and then classify the sentiment as "Mixed" if both positive and negative points are present.
    3.  **main_point_selection:** Select the SINGLE best point to be the theme of the reply, using the strict priority order.

    **Part 2: The "draft" object (Your Response Strategy)**
    *   **For Positive Reviews:** ...
    *   **For Negative Reviews & Mixed Reviews (Follow this checklist EXACTLY):**
        1.  **APOLOGIZE:** Start with a sincere apology that acknowledges the specific negative point.
        2.  **STATE ACTION:** Immediately state the internal action being taken: "${context.serviceRecoveryOffer}".
        3.  **TAKE IT OFFLINE (The Google Maps Rule):** After stating the action, you MUST use the following phrase to invite the user to contact the business: "${context.offlineContactInstruction}".
        4.  **APPRECIATE (For Mixed Reviews Only):** If the review is mixed, you MUST thank them for their positive feedback as the final part of your message.
    
    **General Rules for the Draft:**
    // ... (The rest of the rules are unchanged)

    **Context for the Task:**
    // ... (The rest of the context is unchanged)
    *   **Customer's Review to Analyze:** "${review}"

    Now, generate the complete JSON object.`;
}

exports.handler = async function (event) {
  // The handler no longer needs isKnownCustomer
  const { reviewText, authorName } = JSON.parse(event.body);
  const businessContext = getBusinessContext();
  const systemPrompt = buildSystemPrompt(businessContext, reviewText, authorName);
  
  // ... (The rest of the function is unchanged)
};
