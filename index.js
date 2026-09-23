const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8659566747:AAErTzE0eWs7X3fxgtI-JhnuqoOvEWc7RnQ';
const ADMIN_ID = 8122378281;
const STARS_PER_TON = 50;

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const param = (match[1] || '').trim();
  let starsCount = 0;
  let buyerId = chatId;

  if (param.startsWith('stars_')) {
    const parts = param.split('_');
    buyerId = parts[1];
    starsCount = parseInt(parts[2], 10);
  }

  if (!starsCount || starsCount < 5) {
    bot.sendMessage(chatId, 'Привет! Открой игру, чтобы купить звёзды.');
    return;
  }

  try {
    const invoiceLink = await bot.createInvoiceLink(
      'Пополнение баланса',
      starsCount + ' звёзд для игры',
      'payload_' + buyerId + '_' + starsCount,
      '',
      'XTR',
      [{ label: starsCount + ' звёзд', amount: starsCount }]
    );

    bot.sendMessage(chatId, 'Нажми, чтобы оплатить:', {
      reply_markup: {
        inline_keyboard: [[
          { text: '⭐ Оплатить ' + starsCount + ' звёзд', url: invoiceLink }
        ]]
      }
    });
  } catch (err) {
    console.error('Ошибка:', err);
    bot.sendMessage(chatId, 'Ошибка. Попробуй позже.');
  }
});

bot.on('pre_checkout_query', (q) => bot.answerPreCheckoutQuery(q.id, true));

bot.on('successful_payment', (msg) => {
  const payload = msg.successful_payment.invoice_payload;
  const parts = payload.split('_');
  const buyerId = parts[1];
  const stars = parseInt(parts[2], 10);
  const ton = stars / STARS_PER_TON;

  console.log('✅ Оплата:', buyerId, stars, '⭐');

  bot.sendMessage(msg.chat.id, '✅ Оплата успешна! ' + stars + ' ⭐ = ' + ton.toFixed(1) + ' TON');

  try {
    bot.sendMessage(ADMIN_ID,
      '💰 НОВАЯ ОПЛАТА!\n' +
      'ID игрока: ' + buyerId + '\n' +
      'Звёзд: ' + stars + '\n' +
      'TON: ' + ton.toFixed(1)
    );
  } catch(e) {}
});

console.log('🤖 Бот запущен...');
