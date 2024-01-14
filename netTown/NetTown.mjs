import axios from "axios";

import fs from "fs";
import stream from "stream/promises";
import path from "path";

class NetTownApi {
  static url = "https://poo.tomedu.ru";

  constructor(login, hash_password, id = null, cookie = null) {
    this.loginData = {
      login,
      hash_password,
      id,
      cookie,
    };
  }

  async login() {
    if (!this.loginData.login || !this.loginData.hash_password) {
      return {
        success: false,
        message: "Не удалось авторизоваться, данных нет",
        data: null,
      };
    }

    const loginData = {
      login: this.loginData.login,
      password: this.loginData.hash_password,
      isRemember: true,
    };

    console.log({ loginData });

    const headers = {
      "Content-Type": "application/json",
    };
    try {
      const response = await axios.post(
        `${NetTownApi.url}/services/security/login`,
        loginData,
        { headers }
      );

      // Проверка успешности запроса
      if (response.status === 200) {
        const cookies = response.headers["set-cookie"];

        this.loginData.cookie = cookies.join("; ");

        if (!this.loginData.id) {
          const studentId = this.extractStudentId(response.data);

          this.loginData.id = studentId;
        }

        return { success: true, message: "Успешно", data: null };
      } else {
        return { success: false, message: "Неизвестная ситуация", data: null };
      }
    } catch (e) {
      return this._processErrorFromStatus(e);
    }
  }

  extractStudentId(data) {
    const val1 = Object.values(data.tenants)[0];

    return val1.studentRole.id;
  }

  async getSchedule() {
    if (!this.loginData.cookie) {
      await this.login();
      return await this.getSchedule();
    }
    // Получаем вчерашнюю дату
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate());

    // Получаем дату окончания через 6 дней
    const endDate = new Date(currentDate);
    endDate.setDate(currentDate.getDate() + 6);

    // Форматируем даты
    const formattedYestDate = formatDate(currentDate);
    const formattedEndDate = formatDate(endDate);

    function formatDate(date) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // Создать URL для GET-запроса с учетом studentId и временных параметров
    const scheduleUrl = `${NetTownApi.url}/services/students/${this.loginData.id}/lessons/${formattedYestDate}/${formattedEndDate}`;

    try {
      const headers = { Cookie: this.loginData.cookie };

      const response = await axios.get(scheduleUrl, { headers });

      if (response.status === 200) {
        return { success: true, message: "Успешно", data: response.data };
      } else {
        return { success: false, message: "Неизвестная ситуация" };
      }
    } catch (err) {
      return this._processErrorFromStatus(err);
    }
  }

  async getPerfomance() {
    if (!this.loginData.cookie) {
      await this.login();
      return await this.getPerfomance();
    }

    const perfUrl = `${NetTownApi.url}/services/reports/current/performance/${this.loginData.id}`;

    try {
      const headers = { Cookie: this.loginData.cookie };

      const response = await axios.get(perfUrl, { headers });

      if (response.status === 200) {
        return {
          success: true,
          message: "Успешно",
          data: response.data,
        };
      } else {
        return { success: false, message: "Неизвестная ситуация" };
      }
    } catch (err) {
      return this._processErrorFromStatus(err);
    }
  }

  async getPerfomanceXls() {
    if (!this.loginData.cookie) {
      await this.login();
      return await this.getPerfomanceXls();
    }

    const xlsUrl = `${NetTownApi.url}/services/reports/current/performance`;

    const currentDate = new Date().toISOString();

    const jsonData = {
      date: currentDate,
      studentWorkFlowId: this.loginData.id,
    };

    const encodedData = encodeURIComponent(JSON.stringify(jsonData));

    const data = `json=${encodedData}`;

    const headers = {
      Cookie: this.loginData.cookie,
      "Content-Type": "application/x-www-form-urlencoded",
      "Sec-Fetch-Dest": "document",
    };

    try {
      const axiosInstance = axios.create({
        responseType: "stream",
        headers,
      });

      const response = await axiosInstance.post(xlsUrl, data);

      if (response.status === 200) {
        const filename = `${this.loginData.id}.xlsx`;

        const filepath = path.join(
          path.join(process.cwd(), "./"),
          `./temp/${filename}`
        );

        const writeStream = fs.createWriteStream(filepath);
        await stream.pipeline(response.data, writeStream).catch(console.error);
        return {
          success: true,
          message: "Файл успешно получен",
          data: filepath,
        };
      }
    } catch (err) {
      this._processErrorFromStatus(err);
    }
  }

  async getAttestation() {
    // * Проверка на наличие куки и id
    if (!this.loginData.cookie) {
      await this.login();
      return await this.getAttestation();
    }

    await this.login();
    const attUrl = `${NetTownApi.url}/services/students/${this.loginData.id}/attestation`;

    try {
      const headers = { Cookie: this.loginData.cookie };

      const response = await axios.get(attUrl, { headers });

      if (response.status === 200) {
        return {
          success: true,
          message: "Успешно",
          data: response.data,
        };
      } else {
        return { success: false, message: "Неизвестная ситуация" };
      }
    } catch (err) {
      return this._processErrorFromStatus(err);
    }
  }

  async getStatement() {
    //* Проверка на наличие куки и id
    if (!this.loginData.cookie) {
      await this.login();
      return await this.getStatement();
    }
    const stUrl = `${NetTownApi.url}/services/reports/curator/group-attestation-for-student/${this.loginData.id}`;

    try {
      const headers = { Cookie: this.loginData.cookie };

      const response = await axios.get(stUrl, { headers });

      if (response.status === 200) {
        return {
          success: true,
          message: "Успешно",
          data: response.data,
        };
      } else {
        return { success: false, message: "Неизвестная ситуация" };
      }
    } catch (err) {
      return this._processErrorFromStatus(err);
    }
  }

  _processErrorFromStatus(error) {
    //* Обработка ошибок

    if (error.response) {
      if (error.response.status / 100 >= 5) {
        return { success: false, message: "Город не выстоял", data: null };
      }

      if (error.response.status / 100 >= 4) {
        return {
          success: false,
          message: "Возможно были введены неверные данные",
          data: null,
        };
      }
    } else {
      //* Справочная информация
      console.warn("Произошла неизвестная ошибка", {
        loginData: this.loginData,
        error: error,
        data: null,
      });

      return { success: false, message: "Неизвестная ошибка", data: null };
    }
  }
}

export default NetTownApi;
