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

// Храним состояние "ожидания суммы" для каждого пользователя
const waitingForAmount = {};

// ===== /start =====
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  delete waitingForAmount[chatId];

  bot.sendMessage(chatId,
    '👋 Добро пожаловать!\n\n' +
    'Нажми кнопку ниже, чтобы пополнить баланс звёздами.',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '💰 Пополнить', callback_data: 'deposit' }
        ]]
      }
    }
  );
});

// ===== Кнопка "Пополнить" =====
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'deposit') {
    await bot.answerCallbackQuery(query.id);

    waitingForAmount[chatId] = true;

    bot.sendMessage(chatId,
      '✍️ Напиши сколько TON хочешь пополнить.\n\n' +
      'Например: `1` (это будет 50 ⭐)',
      { parse_mode: 'Markdown' }
    );
  }
});

// ===== Ожидание суммы в TON =====
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  // Игнорируем команды
  if (text.startsWith('/')) return;

  // Только если ждём сумму
  if (!waitingForAmount[chatId]) return;

  const ton = parseFloat(text.replace(',', '.'));

  if (!ton || ton <= 0) {
    bot.sendMessage(chatId, '❌ Введи число больше 0. Например: `1`', { parse_mode: 'Markdown' });
    return;
  }
  if (ton < 0.1) {
    bot.sendMessage(chatId, '❌ Минимум 0.1 TON');
    return;
  }
  if (ton > 1000) {
    bot.sendMessage(chatId, '❌ Максимум 1000 TON');
    return;
  }

  // Считаем звёзды
  const stars = Math.round(ton * STARS_PER_TON);

  delete waitingForAmount[chatId];

  try {
    // Отправляем invoice
    await bot.sendInvoice(
      chatId,
      'Пополнение баланса',
      ton + ' TON = ' + stars + ' звёзд',
      'payload_' + chatId + '_' + stars + '_' + ton,
      '',
      'XTR',
      [{ label: stars + ' звёзд', amount: stars }]
    );
    console.log('📤 Invoice: ' + ton + ' TON = ' + stars + ' ⭐ для ' + chatId);
  } catch (err) {
    console.error('Ошибка invoice:', err.message);
    bot.sendMessage(chatId, '❌ Ошибка: ' + err.message);
  }
});

// ===== Подтверждение и оплата =====
bot.on('pre_checkout_query', (q) => {
  bot.answerPreCheckoutQuery(q.id, true);
});

bot.on('successful_payment', (msg) => {
  const payload = msg.successful_payment.invoice_payload;
  const parts = payload.split('_');
  // parts: ['payload', chatId, stars, ton]
  const buyerId = parts[1];
  const stars = parseInt(parts[2], 10);
  const ton = parseFloat(parts[3]);

  console.log('✅ Оплата:', buyerId, stars, '⭐ =', ton, 'TON');

  bot.sendMessage(msg.chat.id,
    '✅ Оплата успешна!\n\n' +
    '⭐ Звёзд: ' + stars + '\n' +
    '🪙 TON: ' + ton + '\n\n' +
    'Баланс зачислит администратор.'
  );

  try {
    bot.sendMessage(ADMIN_ID,
      '💰 НОВАЯ ОПЛАТА!\n\n' +
      '🆔 ID игрока: ' + buyerId + '\n' +
      '⭐ Звёзд: ' + stars + '\n' +
      '🪙 TON: ' + ton + '\n\n' +
      'Начисли через админку игры (15 тапов по аватарке → ton2026)'
    );
  } catch(e) { console.error('ADMIN notify error:', e.message); }
});

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

console.log('🤖 Бот запущен...');
