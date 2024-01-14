import Controller from "./MainController.mjs";

function defineRoutes(bot) {
  bot.start(async (ctx) => await Controller.start(ctx));

  bot.action("start", async (ctx) => await Controller.start(ctx));

  // Message Handle

  bot.on("text", async (ctx) => await Controller.handleMessage(ctx));

  bot.action(
    /selected_login:(.*)/,
    async (ctx) => await Controller.handleSelectedLogin(ctx)
  );

  bot.action(/delete_account:(.*)/, async (ctx) =>
    Controller.handleDeleteAccount(ctx)
  );

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

  bot.action(
    "get_user_settings",
    async (ctx) => await Controller.getUserSettings(ctx)
  );

  // Settings Menu

  bot.action(
    "select_account",
    async (ctx) => await Controller.selectAccount(ctx)
  );

  bot.action("add_account", async (ctx) => await Controller.addAccount(ctx));

  bot.action("del_account", async (ctx) => await Controller.deleteAccount(ctx));

  bot.action(
    "get_delete_account_scene",
    async (ctx) => await Controller.getDeleteAccountScene(ctx)
  );

  bot.action("del_user", async (ctx) => await Controller.deleteUser(ctx));

  bot.action(
    "get_delete_user_scene",
    async (ctx) => await Controller.getDeleteUserScene(ctx)
  );

  // Download

  bot.action("get_perfomance_xls", async (ctx) => await Controller.getXls(ctx));
}

export default defineRoutes;
