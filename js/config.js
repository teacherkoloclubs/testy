/* =====================================================================
   НАЛАШТУВАННЯ ПОРТАЛУ
   Детальна інструкція — у файлі README.md
   ===================================================================== */
window.APP_CONFIG = {
  /* Назва, яку бачать учні */
  siteTitle: 'Тести та матеріали',
  schoolName: 'Освітній портал для учнів',

  /* 1) Вставте сюди налаштування з Firebase Console
        (Project settings → Your apps → Web app → firebaseConfig).
        Поки поле apiKey порожнє, увійти на сайт неможливо. */
  firebase: {
    apiKey: 'AIzaSyC8POXwFRlRdBxm0c044gkbVCGXuCy8y_k',
    authDomain: 'shkola-testy.firebaseapp.com',
    projectId: 'shkola-testy',
    storageBucket: 'shkola-testy.firebasestorage.app',
    messagingSenderId: '768893946813',
    appId: '1:768893946813:web:47bd81b524003914c860d4'
  },

  /* 2) Пошта (або кілька) облікового запису вчителя.
        Такий самий список має бути у файлі firestore.rules */
  teacherEmails: ['teacher@example.com'], // ← ЗАМІНІТЬ на пошту вчителя з Firebase → Authentication → Users

  /* Учні входять за логіном; технічно логін перетворюється на адресу
     login@<цей домен>. Справжня пошта не потрібна. Не змінюйте після
     того, як створили учнів. */
  studentEmailDomain: 'uchni.school',

  /* Правила тестів */
  secondsPerQuestion: 45,      // таймер: секунд на одне питання
  unlockSecondsPerQuestion: 10,// кнопка «Перевірити» активна через N с × питань
  passScore: 4,                // менше — тест не зараховано
  maxScore: 12,
  lessonQuestions: 12,         // тест за параграф
  sectionQuestions: 24,        // підсумковий за розділ
  finalQuestions: 36           // річний підсумковий
};