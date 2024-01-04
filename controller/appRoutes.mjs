import { Controller } from "./Controller.mjs";

function defineRoutes(bot) {
  bot.start(async (ctx) => await Controller.start(ctx).then());

  // Message Handle

  bot.on("text", (ctx) => Controller.handleMessage(ctx));

  // Register
  bot.action(
    "get_registration",
    async (ctx) => await Controller.registration(ctx)
  );

  // Main Menu
  bot.action("get_schedule", (ctx) => {
    console.log(ctx.from);
    ctx.reply("da");
  });

  bot.action("get_performance", (ctx) => ctx.reply("da"));

  bot.action("get_attestation", (ctx) => ctx.reply("da"));

  bot.action("get_statement", (ctx) => ctx.reply("da"));

  bot.action("get_settings", (ctx) => ctx.reply("da"));

  // Settings Menu

  bot.action("get_user_settings", (ctx) => ctx.reply("net"));
}

export default defineRoutes;
