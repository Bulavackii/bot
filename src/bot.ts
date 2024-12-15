import TelegramBot from "node-telegram-bot-api";
import moment from "moment";
import fs from "fs";

// Токен для бота, полученный через BotFather
const token = "7660404672:AAFJFVnTX0U5WRO5xRuRSD2bV3UUEbCxVXg";
const bot = new TelegramBot(token, { polling: true });
// Ваш Telegram ID (получите его, отправив команду /start в боте userinfobot)
const myTelegramId = 1758910226;
// Исключенные пользователи (ID)
let excludedUsers: Set<number> = new Set();
// Сообщение для автоответчика
let autoReplyMessage =
  "📢 Привет! Это автоответчик! Сейчас или выходной, или нерабочее время. Обратитесь, пожалуйста, 📅 в рабочее время!\n\n" +
  "Если ваш вопрос срочный, вы можете связаться с нами через другие каналы:\n\n" +
  "📱 **Телеграмм:** [@МойТелеграмм](https://t.me/мойТелеграмм)\n" +
  "💬 **ВКонтакте:** [Мой профиль ВКонтакте](https://vk.com/мой_профиль)\n" +
  "📞 **WhatsApp:** [Написать в WhatsApp](https://wa.me/МойНомер)\n\n" +
  "Буду рад помочь вам, как только смогу!";
let autoReplyEnabled = true; // Флаг для включения/выключения автоответчика
let profanityFilterEnabled = true; // Флаг для включения/выключения фильтра мата
let profanityWarnings = new Map<
  number,
  { username: string; time: string; count: number; id: number }
>();
let waitingForExceptionInput = false;
let waitingForNewMessage = false;
let currentAction: string | null = null;
let currentChatId: number | null = null;

// Путь к файлу с матерными словами
const profanityFilePath = "./data/profanityList.txt";
let profanityList: string[] = [];

// Загрузка списка матерных слов из файла
const loadProfanityList = (): void => {
  try {
    if (fs.existsSync(profanityFilePath)) {
      profanityList = fs
        .readFileSync(profanityFilePath, "utf-8")
        .split("\n")
        .map((line) => line.trim());
      console.log("📂 Список матерных слов успешно загружен.");
    }
  } catch (err) {
    console.error("⚠️ Ошибка при загрузке списка матерных слов:", err);
  }
};

// Функция проверки рабочего времени
const isWorkingDay = (): boolean => {
  const now = moment();
  const dayOfWeek = now.day(); // 0 - воскресенье, 1 - понедельник и т.д.
  const hourOfDay = now.hour();
  const minuteOfDay = now.minute();
  return (
    dayOfWeek >= 1 &&
    dayOfWeek <= 5 &&
    (hourOfDay > 8 || (hourOfDay === 8 && minuteOfDay >= 30)) &&
    hourOfDay < 17
  );
};

// Функция для проверки мата в сообщениях
const containsProfanity = (text: string): boolean => {
  return profanityList.some((word) => text.toLowerCase().includes(word));
};

// Функция отправки автоответа
const sendAutoReply = async (msg: TelegramBot.Message): Promise<void> => {
  const senderId = msg.from?.id;
  const chatId = msg.chat.id;
  const messageText = msg.text || "";
  console.log(
    `⚙️ Проверка исключения к отправителю с ID: ${senderId}, chat ID: ${chatId}`
  );

  // Проверка мата
  if (profanityFilterEnabled && containsProfanity(messageText)) {
    console.log(
      "⚠️ Сообщение содержит мат. Отправляю предупреждение пользователю."
    );

    // Получаем информацию о пользователе
    const username = msg.from?.username || "Неизвестный пользователь";
    const time = moment().format("YYYY-MM-DD HH:mm:ss");
    const userId = senderId!;

    // Обновляем или добавляем предупреждение для пользователя
    if (!profanityWarnings.has(userId)) {
      profanityWarnings.set(userId, { username, time, count: 1, id: userId });
    } else {
      const userWarning = profanityWarnings.get(userId);
      if (userWarning) {
        userWarning.count++;
        userWarning.time = time;
      }
    }

    // Формируем и отправляем подробное предупреждение
    const warningMessage = `⚠️ **Предупреждение!** Ваше сообщение содержит ненормативную лексику! 🤐\n\n
💬 **Ваше сообщение:** "${messageText}"
  
📝 **Информация о пользователе:**

- 🧑‍💼 **Ник:** @${username}
- 📱 **Телефон:** Не предоставлен
📈 **Предупреждения:** ${profanityWarnings.get(userId)?.count || 0}
📝 **Анти-мат база содержит:** ${profanityList.length} слов

⚠️ **Действия:** Если вы продолжите использовать ненормативную лексику, администрация получит уведомление, и ваш аккаунт может быть заблокирован в Telegram.`;

    bot.sendMessage(chatId, warningMessage);
    return;
  }

  if (excludedUsers.has(senderId!)) {
    console.log(
      `🚫 Отправитель ${senderId} в Избранном. Автоответ не отправлен.`
    );
    return;
  }

  if (!isWorkingDay() && autoReplyEnabled) {
    try {
      await bot.sendMessage(chatId, autoReplyMessage);
      console.log(`📢 Автоответ отправлен в чат с ID: ${chatId}`);
    } catch (error) {
      console.error(
        `⚠️ Ошибка при отправке автоответа в чат с ID ${chatId}: ${error}`
      );
    }
  } else {
    console.log(
      "📅 Это рабочий день или автоответчик выключен. Автоответ не отправлен."
    );
  }
};

// Клавиатура для управления
const mainMenuKeyboard = [
  [
    {
      text: `🚀 Автоответчик`,
      callback_data: "toggle_auto_reply",
    },
    {
      text: `🤐 Антимат`,
      callback_data: "toggle_profanity_filter",
    },
  ],
  [
    {
      text: `➕ Добавить в Избранное`,
      callback_data: "add_exception",
    },
    { text: "➖ Удалить из Избранного", callback_data: "remove_exception" },
  ],
  [
    { text: "📜 Просмотр Избранных", callback_data: "view_exceptions" },
    {
      text: "✏️ Автоответ",
      callback_data: "edit_auto_reply_message",
    },
  ],
  [{ text: "📊 Предупреждения", callback_data: "view_warnings" }],
];

// Функция отправки главного меню
const sendMainMenu = (chatId: number): void => {
  bot
    .sendMessage(chatId, "👤 **Выберите действие:**", {
      reply_markup: { inline_keyboard: mainMenuKeyboard },
    })
    .catch((error) => {
      console.error("⚠️ Ошибка при отправке главного меню:", error);
    });
};

// Функция для отображения предупреждений
const displayWarnings = (chatId: number): void => {
  const warningsList =
    Array.from(profanityWarnings.values())
      .map(
        (warning) =>
          `👤 **Пользователь:** @${warning.username || "Имя не задано"}\n` +
          `🔑 **ID:** ${warning.id}\n` +
          `📅 **Дата:** ${warning.time}\n` +
          `⚠️ **Предупреждений:** ${warning.count}\n` +
          `📉 **Статус:** ${
            warning.count >= 3 ? "❗️Критично" : "✅ Нормально"
          }\n` +
          `📝 **Анти-мат база содержит:** ${profanityList.length} слов\n` +
          `—`.repeat(30) // Разделитель между предупреждениями
      )
      .join("\n") || "📉 Нет предупреждений";

  bot.sendMessage(
    chatId,
    `📋 **Внимание! В переписке обнаружен мат! Информация о нарушении:**\n\n${warningsList}`,
    {
      parse_mode: "Markdown",
    }
  );
};

// Сохранение и загрузка данных
const saveExcludedUsers = (): void => {
  try {
    fs.writeFileSync(
      "excluded_users.json",
      JSON.stringify(Array.from(excludedUsers))
    );
    console.log("📂 Исключенные пользователи успешно сохранены.");
  } catch (err) {
    console.error("⚠️ Ошибка при сохранении исключенных пользователей:", err);
  }
};

const loadExcludedUsers = (): void => {
  try {
    if (fs.existsSync("excluded_users.json")) {
      const data = fs.readFileSync("excluded_users.json", "utf-8");
      excludedUsers = new Set(
        JSON.parse(data).filter((id: any) => typeof id === "number")
      );
      console.log(
        "📂 Исключенные пользователи успешно загружены:",
        Array.from(excludedUsers)
      );
    }
  } catch (err) {
    console.error("⚠️ Ошибка при загрузке исключенных пользователей:", err);
  }
};

// Слушаем сообщения
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from?.id;
  if (!senderId || msg.from?.is_bot) return; // Если сообщение пришло от бота или не удалось получить ID отправителя, обработка сообщения прекращается
  if (waitingForExceptionInput && currentChatId === chatId) {
    const userId = parseInt(msg.text ?? "", 10);
    if (isNaN(userId) || userId <= 0) {
      bot.sendMessage(chatId, "⚠️ Пожалуйста, введите корректный числовой ID.");
      return;
    }
    if (currentAction === "add") {
      excludedUsers.add(userId);
      bot.sendMessage(
        chatId,
        `✅ **Пользователь с ID ${userId} добавлен в исключения. Автоответы к нему больше не применяются!**`
      );
      saveExcludedUsers();
    } else if (currentAction === "remove") {
      if (excludedUsers.has(userId)) {
        excludedUsers.delete(userId);
        bot.sendMessage(
          chatId,
          `✅ **Пользователь с ID ${userId} удален из исключений. Автоответы к нему снова применяются!**`
        );
        saveExcludedUsers();
      } else {
        bot.sendMessage(
          chatId,
          `⚠️ **Пользователь с ID ${userId} не найден в исключениях.**`
        );
      }
    }
    waitingForExceptionInput = false;
    currentAction = null;
    currentChatId = null;
    return;
  }
  if (waitingForNewMessage && currentChatId === chatId) {
    autoReplyMessage = msg.text || autoReplyMessage;
    bot.sendMessage(
      chatId,
      `✏️ **Новое сообщение для автоответчика установлено:** "${autoReplyMessage}"`
    );
    waitingForNewMessage = false;
    currentChatId = null;
    return;
  }
  sendAutoReply(msg);
});

// Логика для обработки команд и действий через коллбэки
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message?.chat.id;
  const action = callbackQuery.data;
  if (!chatId || !action) return;
  switch (action) {
    case "toggle_auto_reply":
      autoReplyEnabled = !autoReplyEnabled;
      bot.sendMessage(
        chatId,
        `🚀 **Автоответчик ${autoReplyEnabled ? "включен" : "выключен"}.**`
      );
      break;
    case "toggle_profanity_filter":
      profanityFilterEnabled = !profanityFilterEnabled;
      bot.sendMessage(
        chatId,
        `🤐 **Фильтр мата ${profanityFilterEnabled ? "включен" : "выключен"}.**`
      );
      break;
    case "add_exception":
      currentAction = "add";
      waitingForExceptionInput = true;
      currentChatId = chatId;
      bot.sendMessage(
        chatId,
        "🔑 **Введите ID пользователя для добавления в Избранное: (узнать их ID через @userinfobot командой /start)**"
      );
      break;
    case "remove_exception":
      currentAction = "remove";
      waitingForExceptionInput = true;
      currentChatId = chatId;
      bot.sendMessage(
        chatId,
        "🔑 **Введите ID пользователя для удаления из Избранного: (узнать их ID через @userinfobot командой /start)**"
      );
      break;
    case "view_exceptions":
      if (excludedUsers.size === 0) {
        bot.sendMessage(
          chatId,
          "📋 **Нет пользователей в списке исключений.**"
        );
      } else {
        const exceptionsList = Array.from(excludedUsers)
          .map((userId) => {
            // Получаем информацию о пользователе из мапы предупреждений или выводим "Имя не задано"
            const userInfo = profanityWarnings.get(userId);
            const username = userInfo?.username || "Имя не задано";
            return `🆔 ${userId}\n`;
          })
          .join("\n\n");
        bot.sendMessage(
          chatId,
          `📋 **Список исключений:**\n\n${exceptionsList}`,
          { parse_mode: "Markdown" }
        );
      }
      break;
    case "edit_auto_reply_message":
      waitingForNewMessage = true;
      currentChatId = chatId;
      bot.sendMessage(
        chatId,
        "✏️ **Введите в чате новое сообщение для автоответчика:**"
      );
      break;
    case "view_warnings":
      displayWarnings(chatId);
      break;
    default:
      bot.sendMessage(chatId, "⚠️ **Неизвестная команда.**");
      break;
  }
  bot.answerCallbackQuery(callbackQuery.id);
});

// Старт бота
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "👋 **Привет! Я автоматический ответчик. Чтобы управлять пользователями, нужно узнать их ID через @userinfobot командой /start.**"
  );
  sendMainMenu(chatId);
});

loadProfanityList();
loadExcludedUsers();
process.on("exit", saveExcludedUsers);

console.log("🚀 **Бот успешно запущен.**");
console.log("🔄 **Загрузка данных...**");
console.log("📂 **Загружены исключенные пользователи.**");
console.log("🛠️ **Готов к работе!**");
