import { createRequire } from "module";

const require = createRequire(import.meta.url);

import { MongoClient, ServerApiVersion } from "mongodb";

/**
 * @формат_конфига
 *
 * @param {String} url # mongodb+srv://<login>:<password>@cluster0.alqovla.mongodb.net/?retryWrites=true&w=majority
 * @param {String} dbName
 * @param {String} login
 * @param {String} password
 *
 */

const authConfig = require("./auth.json");
class MongoDBWrapper {
  static url = authConfig.url.replace(
    "<login>:<password>",
    `${authConfig.login}:${authConfig.password}`
  );

  static dbName = authConfig.dbName;

  static usersCollection = "Users";

  /**
   * @формат_записи
   *
   * @param {Number} userId - id пользователя telegram
   * @param {Array} accounts - массив с его аккаунтами
   *
   * @property {String} login
   * @property {Base64} password
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

      await closeF();
    } catch (err) {
      console.error(err);
    }
  }

  static async addStudent(userId, login, hashed_password, studentId) {
    const newData = {
      login: login,
      hashed_password: hashed_password,
      studentId: studentId,
    };

    try {
      const { db, closeF } = await this.connectToDatabase();

      const collection = db.collection(this.usersCollection);

      await collection.updateOne(
        { userId: userId },
        { $push: { accounts: newData } }
      );

      await closeF();
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
        console.log({ acc });
        if (acc.studentId === studentId) {
          return acc;
        }
      });

      console.log(student);

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
    } catch (err) {
      console.error(err);
    }
  }

  static async deleteStudent(userId, studentId) {
    try {
      const { db, closeF } = await this.connectToDatabase();

      const collection = db.collection("Users");

      await collection.updateOne(
        { userId: userId },
        { $pull: { accounts: { studentId: studentId } } }
      );

      await closeF();
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
}

export default MongoDBWrapper;
