import Controller from "./MainController.mjs";

function defineRoutes(bot) {
  bot.start(async (ctx) => await Controller.start(ctx).then());

  // Message Handle

  bot.on("text", async (ctx) => await Controller.handleMessage(ctx));

  // Register
  bot.action(
    "get_registration",
    async (ctx) => await Controller.registration(ctx)
  );

  // Main Menu
  bot.action("get_schedule", async (ctx) => {
    await Controller.getSchedule(ctx);
  });

  bot.action("get_perfomance", async (ctx) => Controller.getPerfomance(ctx));

  bot.action("get_attestation", async (ctx) => Controller.getAttestation(ctx));

  bot.action("get_statement", async (ctx) => Controller.getStatement(ctx));

  // Settings Menu

  bot.action("get_user_settings", async (ctx) =>
    Controller.getUserSettings(ctx)
  );

  // Download

  bot.action("get_perfomance_xls", async (ctx) => await Controller.getXls());
}

export default defineRoutes;
