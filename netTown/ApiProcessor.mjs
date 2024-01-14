import { markdownTable } from "markdown-table";

class ApiProcessor {
  static processSchedule(data) {
    let result = [];

    for (var day of data) {
      const date = this._processDate(day.date);
      const lessons = day.lessons;
      const dayLessons = [];

      if (lessons.length < 1) {
        dayLessons.push("Пары не обнаружены ");
      }

      for (var lesson of lessons) {
        if (typeof lesson !== "object") {
          dayLessons.push(`Пары не получены`);
          continue;
        }

        let lessonArray = [];

        if (lesson.startTime && lesson.endTime) {
          lessonArray.push(
            `⏰ Время: с ${lesson.startTime} до ${lesson.endTime}`
          );
        }

        if (lesson.name) {
          lessonArray.push(`📘 Предмет: ${lesson.name}`);
        }

        if (lesson.timetable && lesson.timetable.classroom) {
          lessonArray.push(
            `🏢 Аудитория: Здание ${lesson.timetable.classroom.building}, ${lesson.timetable.classroom.name}`
          );
        }

        if (lesson.timetable && lesson.timetable.teacher) {
          lessonArray.push(
            `👩‍🏫 Преподаватель: ${lesson.timetable.teacher.lastName} ${lesson.timetable.teacher.firstName} ${lesson.timetable.teacher.middleName}`
          );
        }

        let res = lessonArray.join("\n");
        dayLessons.push(res || "Пар нет");
      }

      result.push([`${date}\n${dayLessons.join("\n\n")}`]);
    }

    return result;
  }

  static processPerfomance(data) {
    if (!data.daysWithMarksForSubject) {
      return ["Оценок нет, спокойной ночи"];
    }

    const header = "Средние баллы по предметам\n";

    const resArray = [];

    resArray[0] = header;

    for (var item of data.daysWithMarksForSubject) {
      const name = item.subjectName;

      let body = "Пусто";

      if (item.averageMark) {
        body = item.averageMark;
      }

      resArray.push(`${name} - ${body}`);
    }

    return resArray;
  }

  static processAttestation(data) {
    const academicYears = data.academicYears;

    const subjects = data.subjects;

    // Создаем объект для хранения соответствия id и семестров
    const idToSemesterMap = {};

    // Итерируемся по academicYears
    for (const year of academicYears) {
      for (const term of year.terms) {
        // Учтем количество семестров и вычислим номер семестра
        const semesterNumber = (year.number - 1) * 2 + term.number;
        // Добавим соответствие в объект
        idToSemesterMap[term.id] = semesterNumber;
      }
    }

    const semesters = Object.values(idToSemesterMap);

    const semestersIds = Object.keys(idToSemesterMap);

    const headers = ["Предмет", ...semesters, "Итог"];

    const tableRows = subjects.map((subject) => {
      const row = [subject.name];

      semestersIds.forEach((sId) => {
        // Проверяем, есть ли оценка для данного семестра
        if (subject.marks && subject.marks[sId]) {
          // console.log({ mark: subject.marks });

          let grade = subject.marks[sId];

          if (grade.value) {
            grade = " " + ApiProcessor.gradeMap[grade.value]; // Глаз дёргается
          } else {
            grade = "()";
          }

          row.push(grade);
        } else {
          row.push("");
        }
      });

      // Обработка итоговой оценки
      if (subject.finalMark && subject.finalMark.value) {
        const finalGrade = ApiProcessor.gradeMap[subject.finalMark.value];
        row.push(finalGrade !== undefined ? " " + finalGrade : "()");
      } else {
        row.push("()");
      }

      return row;
    });

    const tables = [];

    for (let i = 0; i < tableRows.length; i += 20) {
      const chank = tableRows.slice(i, i + 20);

      tables.push(markdownTable([headers, ...chank]));
    }

    return tables;
  }

  static processStatement(data) {
    const subjects = data.subjects;

    const tableRows = subjects.map((subject) => {
      const row = [subject.name];

      let examType = ApiProcessor.examMap[subject.examinationType];

      row.push(examType ? examType : subject.examinationType);

      let grade = "";

      if (subject.marks) {
        grade = JSON.stringify(...Object.values(subject.marks));

        if (grade === "{}") {
          grade = "()";
        } else {
          grade = ApiProcessor.gradeMap[grade] || grade;
        }
      }

      row.push(grade);

      return row;
    });

    const additionals = [];

    let message;

    if (data.profModules.length > 0) {
      additionals.push("профмодули");
    }

    if (data.courseWorks.length > 0) {
      additionals.push("курсовые работы");
    }

    if (additionals.length > 0) {
      message = `Найдены ${additionals.join(
        ", "
      )}, если вы хотите чтобы они тоже отображались, свяжитесь с разработчиком в канале`;
    }

    const headers = ["Предмет", "Тип зачёта", "Оценка"];

    const table = markdownTable([headers, ...tableRows]);

    return { table, message: message || null };
  }

  static _processDate(date) {
    let parsedDate = new Date(date);

    let day = parsedDate.getDate();
    let month = parsedDate.getMonth() + 1; // Месяцы в JavaScript начинаются с 0
    let year = parsedDate.getFullYear();

    // Добавляем ведущие нули, если необходимо
    month = month < 10 ? `0${month}` : month;
    day = day < 10 ? `0${day}` : day;

    return `${day}.${month}.${year} `;
  }

  static gradeMap = {
    Five: 5,
    Four: 4,
    Three: 3,
    Two: 2,
    One: 1,
  };

  static examMap = {
    DifferentiatedTest: "Дифф.Зачёт",
    Exam: "Экзамен",
    Other: "Другое",
  };
}

export default ApiProcessor;
