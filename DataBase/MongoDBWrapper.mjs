import { MongoClient, ServerApiVersion } from "mongodb";

import dotenv from "dotenv";

dotenv.config();
class MongoDBWrapper {
  static url = process.env.DataBase_Url.replace(
    "<login>:<password>",
    `${process.env.DataBase_Login}:${process.env.DataBase_Password}`
  );

  static dbName = process.env.DataBase_DBName;

  static usersCollection = "Users";

  /**
   * @формат_записи
   *
   * @param {Number} userId - id пользователя telegram
   * @param {Array} accounts - массив с его аккаунтами
   *
   * @property {String} login
   * @property {Base64_String} password
   * @property {Number} studentId - id с сетевого города
   */

  static async connectToDatabase() {
    // Create a MongoClient with a MongoClientOptions object to set the Stable API version
    const client = new MongoClient(this.url, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db(this.dbName).command({ ping: 1 });
      console.log("Success connection for MongoDB");

      // Возвращаем базу данных и метод закрытия подключения
      return {
        db: client.db(this.dbName),
        closeF: async () => {
          await client.close();
        },
      };
    } catch (err) {
      console.error(err);
    }
  }

  static async addUser(userId, login, hashed_password, studentId) {
    try {
      console.log(`Новый смешарик ${login}`);

      const newData = {
        userId: userId,
        startIndex: 0,
        accounts: [
          {
            login: login,
            hashed_password: hashed_password,
            studentId: studentId,
          },
        ],
      };

      const { db, closeF } = await this.connectToDatabase();

      const collection = db.collection(this.usersCollection);

      const result = await collection.insertOne(newData);

      console.log(`User added with ID: ${result.insertedId}`);

      return { success: true };

      await closeF();
    } catch (err) {
      console.error(err);

      return { success: false };
    }
  }

  static async addStudent(userId, login, hashed_password, studentId) {
    const newData = {
      login: login,
      hashed_password: hashed_password,
      studentId: studentId || null,
    };

    try {
      const { db, closeF } = await this.connectToDatabase();

      const collection = db.collection(this.usersCollection);

      await collection.updateOne(
        { userId: userId },
        { $push: { accounts: newData } }
      );

      await closeF();

      return { success: true };
    } catch (err) {
      console.error(err);
    }
  }

  static async checkRegisterById(userId) {
    try {
      const user = await this.getUserDataFromID(userId);

      return user ? true : false;
    } catch (err) {
      console.error(err);
    }
  }

  static async checkRegisterStudentById(userId, studentId) {
    try {
      const user = await this.getUserDataFromID(userId);

      const accs = user.accounts;

      const student = accs.find((acc) => {
        if (acc.studentId === studentId) {
          return acc;
        }
      });

      return student ? true : false;
    } catch (err) {
      console.error(err);
    }
  }

  static async deleteUser(userId) {
    try {
      const { db, closeF } = await this.connectToDatabase();

      const collection = db.collection(this.usersCollection);

      await collection.deleteOne({ userId: userId });

      await closeF();

      return { success: true };
    } catch (err) {
      console.error(err);
    }
  }

  static async deleteStudent(userId, login) {
    try {
      const { db, closeF } = await this.connectToDatabase();

      const collection = db.collection(this.usersCollection);

      const user = await collection.findOne({ userId: userId });

      const filteredAccounts = user.accounts.map((acc) => {
        if (acc && acc.login === login) return acc;
      });

      if (filteredAccounts.length < 1) {
        return {
          success: false,
          message: "У вас нет аккаунтов или их просто не удалось получить",
        };
      }

      const accountIndex = filteredAccounts.findIndex(
        (element) => element !== undefined
      );

      console.log(accountIndex);

      if (accountIndex === undefined) {
        return { success: false, message: "Не удалось найти ваш аккаунт" };
      }
      if (filteredAccounts.legth == 1) {
        return {
          success: false,
          message: "У вас всего один аккаунт, невозможно выполнить операцию",
        };
      }

      await collection.updateOne(
        { userId: userId },
        { $set: { startIndex: 0 }, $pull: { accounts: { login: login } } }
      );

      await closeF();

      return {
        success: true,
        message: "Успешно",
      };
    } catch (err) {
      console.error(err);
    }
  }

  static async getUserDataFromID(userId) {
    try {
      const { db, closeF } = await this.connectToDatabase();

      const collection = db.collection(this.usersCollection);

      const user = await collection.findOne({ userId: userId });

      console.log({ user });

      await closeF();

      return user;
    } catch (err) {
      console.error(err);
    }
  }

  static async updateStartIndexForAccount(userId, login) {
    try {
      const { db, closeF } = await this.connectToDatabase();

      const collection = db.collection(this.usersCollection);

      const user = await collection.findOne({ userId: userId });

      if (!user) {
        console.error("User not found");
        await closeF();
        return { success: false };
      }

      const accounts = user.accounts || [];
      const accountIndex = accounts.findIndex((acc) => acc.login === login);

      if (accountIndex === -1) {
        console.error("Account not found");
        await closeF();
        return { success: false };
      }

      if (user.startIndex !== accountIndex) {
        // Обновление в базе данных
        await collection.updateOne(
          { userId: userId },
          { $set: { startIndex: accountIndex } }
        );
      }

      await closeF();

      return { success: true };
    } catch (err) {
      console.error(err);
    }
  }

  static async checkAccountsLength(userId) {
    try {
      const { db, closeF } = await this.connectToDatabase();

      const collection = db.collection(this.usersCollection);

      const user = await collection.findOne({ userId: userId });

      if (!user) {
        console.error("User not found");
        await closeF();
        return { success: false, data: null };
      }

      const accounts = user.accounts || [];

      // Проверка на валидность аккаунта
      const filteredAccount = accounts
        .map((acc) => ({ login: acc.login, password: acc.hashed_password }))
        .filter((acc) => Boolean(acc.login) && Boolean(acc.password));

      const length = filteredAccount.legth;

      await closeF();

      return { success: true, data: length };
    } catch (err) {
      console.error(err);
    }
  }
}

export default MongoDBWrapper;
