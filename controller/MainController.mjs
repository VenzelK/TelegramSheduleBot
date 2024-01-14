import { createRequire } from "module";

const require = createRequire(import.meta.url);

const { Markup } = require("telegraf");

const { getRandomInt } = require("../utils/utilsF.js");

import MongoDBWrapper from "../DataBase/MongoDBWrapper.mjs";

import NetTownApi from "../netTown/NetTown.mjs";

import HashManager from "../utils/HashManager.mjs";
import ApiProcessor from "../netTown/ApiProcessor.mjs";

import { unlink } from "fs";

class Controller {
  static registrationKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("Да", "get_registration"),
    Markup.button.callback("Нет", "get_registration"),
  ]);

  static mainKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("📅 Расписание", "get_schedule"),
    Markup.button.callback("📊 Оценки", "get_perfomance"),
    Markup.button.callback("📝 Аттестация", "get_attestation"),
    Markup.button.callback("🗂 Ведомость", "get_statement"),
    Markup.button.callback("👤 Профиль", "get_user_settings"),
  ]);

  static downloadXlsPerfomanceKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("Скачать", "get_perfomance_xls"),
  ]);

  static userSettingsKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("Выбрать аккаунт", "select_account"),
    Markup.button.callback("Добавить аккаунт", "add_account"),
    Markup.button.callback("Удалить аккаунт", "del_account"),
    Markup.button.callback("Удалить профиль", "del_user"),
  ]);

  static deleteAccountKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("Да", "get_delete_account_scene"),
    Markup.button.callback("Нет", "start"),
  ]);

  static deleteUserKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("Да", "get_delete_user_scene"),
    Markup.button.callback("Нет", "start"),
  ]);

  /**
   *
   * @param {Number} userId : { @param {String} state, @param {bool} registerFlag, @param {Class_instanse} NetTownApi}
   */

  static sessionsObject = {};

  static checkOld(ctx) {
    try {
      const serverTimeOffset = 32000;

      const currentTime = Date.now();

      if (ctx.message) {
        const currentDateTime = new Date(currentTime - serverTimeOffset);
        const messageDateTime = new Date(ctx.message.date * 1000);

        return currentDateTime - messageDateTime > 30000 ? true : false;
      }

      if (ctx.update && ctx.update.callback_query) {
        const currentDateTime = new Date(currentTime - serverTimeOffset);
        const callbackQuery = ctx.update.callback_query;
        const messageDateInSeconds =
          callbackQuery.message.date + serverTimeOffset;

        const messageMiliSecondsDate = new Date(messageDateInSeconds * 1000);

        return currentDateTime - messageMiliSecondsDate > 30000 ? true : false;
      }

      return true;
    } catch (err) {
      console.error(err);

      return true;
    }
  }

  static async start(ctx) {
    if (this.checkOld(ctx)) {
      return;
    }

    const userId = ctx.from.id;

    this.addSession(userId);

    const name = ctx.from.first_name;

    await ctx.replyWithMarkdown(
      `*Привет, ${name} !*
            *Это бот для получения информации из сетевого города.*
            *Чтобы воспользоваться ботом, тебе нужно зарегистрироваться в нем лишь единожды.*
            *Новости бота ( ты жк хочешь знать когда его отключат на проф. работы?  🤓), краткий тутор ( там есть что посмотреть ), приём баг репортов и т.д. тут - https://t.me/NetTown*`,
      { disable_web_page_preview: true }
    );

    await ctx.reply("Проверяю твою регистрацию");

    this.sessionsObject[userId].registerFlag = await this.checkRegister(userId);

    const regFlag = this.sessionsObject[userId].registerFlag;

    if (!regFlag) {
      await ctx.reply("Хочешь зарегистрироваться?", this.registrationKeyboard);
    } else {
      const user = await MongoDBWrapper.getUserDataFromID(userId);

      this.addSession(user.userId, regFlag, user.accounts, user.startIndex);

      if (!this.sessionsObject[userId].registerFlag) {
        await ctx.reply(
          "Что-то не так с вашим профилем, придётся его пересоздать"
        );

        await this.deleteUser(ctx);

        return;
      }
      await ctx.reply("Что хочешь?", this.mainKeyboard);
    }

    return;
  }

  static createNetTownApi(
    login,
    password,
    userId,
    studentId = null,
    registerFlag = false
  ) {
    const net = new NetTownApi(login, password);

    this.sessionsObject[userId].NetTownApi = net;

    this.sessionsObject[userId].NetTownApi.loginData["login"] = login;

    if (password.length < 10) {
      password = HashManager.hashAndBase64Encode(password);
    }

    this.sessionsObject[userId].NetTownApi.loginData["hash_password"] =
      password;

    if (studentId) {
      this.sessionsObject[userId].NetTownApi.loginData["id"] = studentId;
    }

    this.sessionsObject[userId].registerFlag = true;

    return;
  }

  static async checkRegister(userId) {
    const dbResult = await MongoDBWrapper.checkRegisterById(userId);

    if (dbResult) {
      return true;
    } else {
      return false;
    }
  }

  static async registration(ctx) {
    ctx.answerCbQuery();
    this.sessionsObject[ctx.from.id].state = "waitForRegistrationData";

    ctx.reply("Введите данные в формате *login password* без * конечно");
  }

  static async handleRegisterMessage(message, ctx, userId) {
    const regex = /^(\S+)\s(\S+)$/;

    let login;

    let password;

    if (regex.test(message)) {
      const matches = message.match(regex);
      login = matches[1];
      password = matches[2];
    } else console.log("loh");

    if (login && password) {
      this.sessionsObject[userId].state = null;

      this.createNetTownApi(
        login,
        password,
        userId,
        null,
        this.sessionsObject[userId].registerFlag
      );

      await ctx.reply("Пробую залогинитсья с вашими данными");

      const logresult = await this.sessionsObject[userId].NetTownApi.login();

      if (logresult.success === true) {
        await ctx.reply(logresult.message);

        await ctx.reply(
          "Авторизация прошла успешно, сейчас внесу вас в базу данных"
        );

        let dbResult;

        const dbCheckRegister = await this.checkRegister(userId);

        if (dbCheckRegister) {
          dbResult = await MongoDBWrapper.addStudent(
            userId,
            this.sessionsObject[userId].NetTownApi.loginData.login,
            this.sessionsObject[userId].NetTownApi.loginData.hash_password,
            this.sessionsObject[userId].NetTownApi.loginData.id
          );
        } else {
          dbResult = await MongoDBWrapper.addUser(
            userId,
            this.sessionsObject[userId].NetTownApi.loginData.login,
            this.sessionsObject[userId].NetTownApi.loginData.hash_password,
            this.sessionsObject[userId].NetTownApi.loginData.id
          );
        }

        if (dbResult && dbResult.success === true) {
          ctx.reply(
            "Успешно записанные ваши данные, для продожения введите /start, если вы добавляли аккаунт, то можете не перезапускать "
          );
        } else {
          ctx.reply("Что-то пошло не так, попробуйте позже");
        }
      } else {
        ctx.reply(logresult.message || "Ошибка чел");
      }

      return;
    } else {
      return await this.registration(ctx);
    }
  }

  static addSession(userId, regFlag = false, accounts, startIndex) {
    if (!regFlag) {
      this.sessionsObject[userId] = {
        state: null,
        registerFlag: null,
        netTown: null,
      };
    } else {
      this.sessionsObject[userId] = {
        state: null,
        registerFlag: true,
      };

      const acc = accounts[startIndex] || null;

      if (!acc || !acc.login || !acc.hashed_password) {
        return this.addSession(userId, false, null);
      }
      this.createNetTownApi(
        acc.login,
        acc.hashed_password,
        userId,
        acc.studentId || null,
        regFlag
      );
    }
    return;
  }

  static async handleMessage(ctx) {
    if (this.checkOld(ctx)) {
      return;
    }

    const userId = ctx.from.id;
    const message = ctx.message.text;

    if (!this.sessionsObject[userId]) {
      const n = getRandomInt(0, 2);

      await ctx.replyWithPhoto({ source: `./joks/ti_eblan?${n}.jpg` });

      await ctx.reply(
        "Я не жду от тебя сообщения или введи /start для начала работы с ботом"
      );

      return;
    } else {
      const sessionstate = this.sessionsObject[userId].state;

      switch (sessionstate) {
        case "waitForRegistrationData":
          this.handleRegisterMessage(message, ctx, userId);
          break;
      }
    }
  }

  static async getSchedule(ctx) {
    ctx.answerCbQuery();

    if (this.checkOld(ctx)) {
      return;
    }

    if (!this.sessionsObject[ctx.from.id]) {
      ctx.reply("Ты не зареган, перезапусти бота /start");

      return;
    }

    try {
      await ctx.reply("Получаю данные от сервера ... ");

      const answer = await this.sessionsObject[
        ctx.from.id
      ].NetTownApi.getSchedule();

      const message = answer.message;

      await ctx.reply(message);

      if (answer.success === true) {
        const dataMessage = ApiProcessor.processSchedule(answer.data);

        for (var el of dataMessage) {
          if (!el) {
            continue;
          }

          await ctx.reply(...el);
        }
      }
      return;
    } catch (err) {
      console.error(err);
    }
  }

  static async getPerfomance(ctx) {
    ctx.answerCbQuery();

    if (this.checkOld(ctx)) {
      return;
    }

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");

      return;
    }

    try {
      await ctx.reply("Получаю данные от сервера ... ");

      const answer = await this.sessionsObject[
        ctx.from.id
      ].NetTownApi.getSchedule();

      const message = answer.message;

      await ctx.reply(message);

      if (answer.success === true) {
        const dataMessage = ApiProcessor.processPerfomance(answer.data);

        if (!dataMessage) {
          await ctx.reply("Что-то не так вашими данными, попробуйте позже");

          return;
        }

        let mess;

        mess = dataMessage.join("\n");

        await ctx.reply(mess);

        await ctx.reply(
          "Для более полной информации можете скачать xls с сайта",
          this.downloadXlsPerfomanceKeyboard
        );
      } else {
        await ctx.reply(answer.message);
      }
      return;
    } catch (err) {
      console.error(err);
    }
  }

  static async getXls(ctx) {
    ctx.answerCbQuery();

    if (this.checkOld(ctx)) {
      return;
    }

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");

      return;
    }

    try {
      const answer = await this.sessionsObject[
        ctx.from.id
      ].NetTownApi.getPerfomanceXls();

      const message = answer.message;

      await ctx.reply(message);

      if (answer.success === true) {
        await ctx.replyWithDocument({
          source: answer.data,
          filename: "pp.xlsx",
        });

        await unlink(answer.data, (err) => {
          console.error(err);
        });
      }

      return;
    } catch (err) {
      console.error(err);
    }
  }

  static async getAttestation(ctx) {
    ctx.answerCbQuery();

    if (this.checkOld(ctx)) {
      return;
    }

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");

      return;
    }

    try {
      await ctx.reply("Получаю данные от сервера ... ");

      const answer = await this.sessionsObject[
        ctx.from.id
      ].NetTownApi.getAttestation();

      await ctx.reply(answer.message);

      if (answer.success === true) {
        const dataMessage = ApiProcessor.processAttestation(answer.data);

        dataMessage.forEach(async (part) => {
          await ctx.replyWithHTML(`<pre>${part}</pre>`);
        });
      }
      return;
    } catch (err) {
      console.error(err);
    }
  }

  static async getStatement(ctx) {
    ctx.answerCbQuery();

    if (this.checkOld(ctx)) {
      return;
    }

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");

      return;
    }

    try {
      await ctx.reply("Получаю данные от сервера ... ");

      const answer = await this.sessionsObject[
        ctx.from.id
      ].NetTownApi.getStatement();

      const message = answer.message;

      await ctx.reply(message);

      if (answer.success === true) {
        const dataMessage = ApiProcessor.processStatement(answer.data);

        await ctx.replyWithHTML(`<pre>${dataMessage.table}</pre>`);

        if (dataMessage.message) {
          await ctx.replyWithMarkdown(dataMessage.message);
        }
      }
      return;
    } catch (err) {
      console.error(err);
    }
  }

  static async getUserSettings(ctx) {
    ctx.answerCbQuery();

    if (this.checkOld(ctx)) {
      return;
    }

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");

      return;
    }

    await ctx.reply("Выберите действие", Controller.userSettingsKeyboard);

    return;
  }

  static async selectAccount(ctx) {
    ctx.answerCbQuery();

    if (this.checkOld(ctx)) {
      return;
    }

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");

      return;
    }

    async function ifOneAccount() {
      await ctx.reply("А тут выбирать нечего, ты угараешь?");

      return;
    }

    try {
      const { accounts } = await MongoDBWrapper.getUserDataFromID(ctx.from.id);

      if (accounts.length < 2) {
        await ifOneAccount();
        return;
      }

      const logins = accounts.map((acc) => acc.login).filter(Boolean);

      const buttons = logins.map((login) =>
        Markup.button.callback(login, `selected_login:${login}`)
      );

      if (buttons.length < 2) {
        await ifOneAccount();

        return;
      }

      const keyboard = Markup.inlineKeyboard([...buttons]);

      const mess = await ctx.reply("Хорошо, выбери аккаунт", keyboard);

      setTimeout(async () => {
        await ctx.editMessageText("А всё", {
          message_id: mess.message_id,
        });
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  }

  static async handleSelectedLogin(ctx) {
    await ctx.answerCbQuery();

    if (this.checkOld(ctx)) {
      return;
    }

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");
      return;
    }

    const selectedLogin = ctx.match[1];

    console.log("Выбран логин", { selectedLogin });

    try {
      await ctx.reply("Отличный выбор, принимаю настройки");

      const dbAnswer = await MongoDBWrapper.updateStartIndexForAccount(
        ctx.from.id,
        selectedLogin
      );

      if (!dbAnswer || dbAnswer.success !== true) {
        await ctx.reply("Что-то пошло не так, попробуй позже");
        return;
      }

      await ctx.reply("Удачно");

      await ctx.reply(
        "Для применения нового аккаунта перезапустите бота - /start"
      );
      return;
    } catch (err) {
      console.error(err);
    }
  }

  static async addAccount(ctx) {
    await ctx.answerCbQuery();

    if (this.checkOld(ctx)) {
      return;
    }

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");
      return;
    }

    try {
      await ctx.reply(
        "Вы действительно хотите добавить новый аккаунт?",
        this.registrationKeyboard
      );
    } catch (err) {
      console.error(err);
    }
  }

  static async deleteAccount(ctx) {
    await ctx.answerCbQuery();

    if (this.checkOld(ctx)) {
      return;
    }

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");
      return;
    }

    try {
      const accsLenght = await MongoDBWrapper.checkAccountsLength(ctx.from.id)
        .data;

      if (!accsLenght < 1) {
        await ctx.from("У тебя нет аккаунтов, Чел");

        return;
      }
      await ctx.reply(
        "Вы действительно хотите удалить один из аккаунтов?",
        this.deleteAccountKeyboard
      );
    } catch (err) {
      console.error(err);
    }
  }

  static async getDeleteAccountScene(ctx) {
    await ctx.answerCbQuery();

    if (this.checkOld(ctx)) {
      return;
    }

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");
      return;
    }

    try {
      const user = await MongoDBWrapper.getUserDataFromID(ctx.from.id);

      const accounts = user.accounts;

      const buttons = accounts.map((acc) =>
        Markup.button.callback(acc.login, `delete_account:${acc.login}`)
      );

      const keyboard = Markup.inlineKeyboard([...buttons]);

      await ctx.reply("Выбери аккаунт для удаления", keyboard);
    } catch (err) {
      console.error(err);
    }
  }

  static async handleDeleteAccount(ctx) {
    await ctx.answerCbQuery();

    if (this.checkOld(ctx)) {
      return;
    }

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");
      return;
    }

    const selectedLogin = ctx.match[1];

    console.log("Выбран логин", { selectedLogin });

    try {
      await ctx.reply("Отличный выбор, принимаю настройки");

      const dbAnswer = await MongoDBWrapper.deleteStudent(
        ctx.from.id,
        selectedLogin
      );

      if (!dbAnswer || dbAnswer.success !== true) {
        await ctx.reply("Что-то пошло не так, попробуй позже");

        console.error(dbAnswer.message);

        return;
      }

      await ctx.reply(dbAnswer.message);

      await ctx.reply(
        "Обратите внимание, что поставился ваш первый зареганный аккаунт, это вы можете изменить. Для продолжения нажмите - /start"
      );
      return;
    } catch (err) {
      console.error(err);
    }
  }

  static async deleteUser(ctx) {
    if (ctx.update.callback_query) {
      // Если кнопка не была нажата, выполнить ctx.answerCbQuery();
      await ctx.answerCbQuery();
    }

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");
      return;
    }

    if (this.checkOld(ctx)) {
      return;
    }

    try {
      await ctx.reply("Вы уверены?", this.deleteUserKeyboard);
    } catch (err) {
      console.error(err);
    }
  }

  static async getDeleteUserScene(ctx) {
    await ctx.answerCbQuery();

    if (!this.sessionsObject[ctx.from.id]) {
      await ctx.reply("Ты не в системе, перезапусти бота - /start");
      return;
    }

    if (this.checkOld(ctx)) {
      return;
    }

    try {
      const dbAnswer = await MongoDBWrapper.deleteUser(ctx.from.id);

      if (!dbAnswer || dbAnswer.success !== true) {
        await ctx.reply("Что-то пошло не так, попробуй позже");

        console.error(dbAnswer.message);

        return;
      }

      await ctx.replyWithPhoto({ source: `./joks/leave.jpg` });

      await ctx.reply("Прощай чувак");
    } catch (err) {
      console.error(err);
    }
  }
}

export default Controller;
