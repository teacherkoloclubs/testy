/* Курс: Інформатика, 2 клас
   Підручник: Н. В. Морзе, О. В. Барна. «Я досліджую світ», 2 клас, ч. 2. — Оріон, 2024
   Формат питання: { q: текст, e: емодзі, a: [варіанти], c: [індекси правильних] }
   c з одним індексом — одна правильна відповідь; з кількома — кілька. */
window.COURSES = window.COURSES || {};
window.COURSES.informatics2 = {
  id: 'informatics2',
  cls: 2,
  primary: true,
  title: 'Інформатика',
  /* Підручник-джерело. Для нового видання див. README → «Нове видання підручника» */
  textbook: {
    title: 'Я досліджую світ',
    grade: 2,
    part: '2',
    authors: 'Н. В. Морзе, О. В. Барна',
    publisher: 'Оріон',
    year: 2024,
    approval: 'Рекомендовано МОН України (наказ від 05.01.2024 № 8).'
  },
  parts: ['informatics2/s1.js', 'informatics2/s2.js', 'informatics2/s3.js', 'informatics2/s4.js', 'informatics2/s5.js'],
  ext: ['informatics2/x1.js', 'informatics2/x2.js', 'informatics2/x3.js'],
  games: ['informatics2/g1.js'],
  sections: []
};
