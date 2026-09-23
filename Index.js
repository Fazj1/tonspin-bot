// ===== HTTP-сервер для Render =====
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running');
}).listen(PORT, () => {
  console.log('HTTP server on port ' + PORT);
});
// ==================================

const TelegramBot = require('node-telegram-bot-api');

// ===== НАСТРОЙКИ =====
const TOKEN = '8659566747:AAErTzE0eWs7X3fxgtI-JhnuqoOvEWc7RnQ';
const ADMIN_ID = 8122378281;
const STARS_PER_TON = 50;
// =====================

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const param = (match[1] || '').trim();
  console.log('Получен параметр:', param);

  let starsCount = 0;
  let buyerId = chatId;

  if (param.startsWith('stars_')) {
    const parts = param.split('_');
    buyerId = parts[1];
    starsCount = parseInt(parts[2], 10);
  }

  // Если параметра нет — приветствие
  if (!starsCount || starsCount < 5) {
    bot.sendMessage(chatId, 
      '👋 Привет!\n\n' +
      'Открой игру и нажми "Пополнить" → "Звёзды", чтобы купить звёзды.'
    );
    return;
  }

  // ⚡ СРАЗУ отправляем invoice — игрок сразу видит кнопку оплаты
  const tonAmount = (starsCount / STARS_PER_TON).toFixed(1);
  const payload = 'payload_' + buyerId + '_' + starsCount;

  try {
    await bot.sendInvoice(
      chatId,
      'Пополнение баланса',                       // title
      starsCount + ' звёзд = ' + tonAmount + ' TON', // description
      payload,                                     // payload
      '',                                          // provider (пусто для звёзд)
      'XTR',                                       // currency — звёзды
      [{ label: starsCount + ' ⭐', amount: starsCount }] // цены
    );
    console.log('📤 Invoice отправлен:', starsCount, '⭐ для', buyerId);
  } catch (err) {
    console.error('Ошибка sendInvoice:', err.message);
    bot.sendMessage(chatId, '❌ Не удалось создать счёт: ' + err.message);
  }
});

// Подтверждение оплаты
bot.on('pre_checkout_query', (q) => {
  bot.answerPreCheckoutQuery(q.id, true);
});

// Успешная оплата
bot.on('successful_payment', (msg) => {
  const payload = msg.successful_payment.invoice_payload;
  const parts = payload.split('_');
  const buyerId = parts[1];
  const stars = parseInt(parts[2], 10);
  const ton = stars / STARS_PER_TON;

  console.log('✅ Оплата:', buyerId, stars, '⭐ =', ton, 'TON');

  bot.sendMessage(msg.chat.id,
    '✅ Оплата успешна!\n\n' +
    '⭐ Звёзд: ' + stars + '\n' +
    '🪙 TON: ' + ton.toFixed(1) + '\n\n' +
    'Баланс зачислит администратор.'
  );

  try {
    bot.sendMessage(ADMIN_ID,
      '💰 НОВАЯ ОПЛАТА!\n\n' +
      '🆔 ID игрока: ' + buyerId + '\n' +
      '⭐ Звёзд: ' + stars + '\n' +
      '🪙 TON: ' + ton.toFixed(1) + '\n\n' +
      'Начисли через админку игры (15 тапов по аватарке → ton2026)'
    );
  } catch(e) { console.error('ADMIN notify error:', e.message); }
});

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

console.log('🤖 Бот запущен...');
