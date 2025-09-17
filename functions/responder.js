const fetch = require('node-fetch');

function getBusinessContext() {
    return {
        businessName: "MEDIKOM на Оболонській набережній",
        responderName: "Олена",
        responseTone: "Теплий, дружній та щирий",
        styleGuideExamples: [
            "Дякуємо вам за довіру та такий теплий відгук! Раді, що консультація була для вас корисною. Бажаємо вам міцного здоров’я!",
            "Добрий день, пані Лідіє! Щиро дякуємо за Ваш відгук та високу оцінку. Нам дуже приємно знати, що Ви залишилися задоволені візитом.",
            "Владиславе, дякуємо вам за довіру і зворотній зв'язок! Пишаємось своєю командою і радіємо, коли можемо допомогти нашим пацієнтам!"
        ],
        avoidWords: ["неймовірно", "дивовижно", "ми в захваті", "дякуємо, що знайшли час"],
        serviceRecoveryOffer: "Вашою скаргою займається Заступник медичного директора з якості."
    };
}

function buildSystemPrompt(context, review) {
    const formattedExamples = context.styleGuideExamples.map(ex => `- "${ex}"`).join('\n');
    const formattedAvoidWords = context.avoidWords.join(', ');

    return `Згенеруй одну, коротку та людяну відповідь, виступаючи як ${context.responderName} з ${context.businessName}, на наданий відгук клієнта, суворо дотримуючись наступної послідовності правил:

    1) **АНАЛІЗ ІМЕНІ:** Спочатку проаналізуй ім'я автора відгуку. **ЯКЩО** це справжнє людське ім'я (наприклад, "Олена", "Володимир Петренко"), твоє привітання **ОБОВ'ЯЗКОВО** повинно починатися **лише з першого імені** у кличному відмінку. **В УСІХ ІНШИХ ВИПАДКАХ** — якщо це нікнейм або ім'я не вказано — ти **ПОВИНЕН** використовувати загальне, ввічливе та різноманітне привітання.

    2) **ТОН І СТИЛЬ:** Твій тон і стиль **ПОВИННІ** ідеально відповідати неформальному, дружньому стилю наданих прикладів. **Ти ОБОВ'ЯЗКОВО повинен уникати** використання слів і фраз зі списку "Слова, яких слід уникати".
        *   **Приклади Стилю:** ${formattedExamples}
        *   **Слова, яких слід уникати:** ${formattedAvoidWords}

    3) **СТРАТЕГІЯ ВІДПОВІДІ:** Проаналізуй відгук, визнач його тип (Позитивний, Негативний або Змішаний) і дай відповідь згідно з відповідною стратегією:
        *   **Для позитивних відгуків:** Подякуй клієнту і згадай **лише один, найважливіший момент** з його відгуку.
        *   **Для змішаних відгуків:** Твоя відповідь **ОБОВ'ЯЗКОВО** повинна мати 3-частинну структуру: a) почни з вибачення за негатив; b) ПОТІМ, запропонуй рішення: "${context.serviceRecoveryOffer}"; c) ЛИШЕ ПІСЛЯ ЦЬОГО, подякуй за позитив.
        *   **Для суто негативних відгуків:** Звернися до негативного моменту та включи пропозицію: "${context.serviceRecoveryOffer}".

    4) **ПІДПИС:** Ти **ОБОВ'ЯЗКОВО** повинен підписатися просто "- ${context.responderName}".
    
    **Відгук клієнта для відповіді:**
    "${review}"`;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') { return { statusCode: 405, body: 'Method Not Allowed' }; }
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
      }),
    });
    if (!response.ok) { const errorData = await response.json(); throw new Error(JSON.stringify(errorData)); }
    const data = await response.json();
    const aiReply = data.choices[0].message.content;
    return { statusCode: 200, body: JSON.stringify({ draftReply: aiReply }), };
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "AI service is currently unavailable." }) };
  }
};