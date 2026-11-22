/* Каталог класів і предметів.
   id предмета = назва файлу курсу в data/courses/<id>.js
   ready:true — курс уже наповнено; інакше учні бачать «Готуємо».
   НОВЕ ВИДАННЯ ПІДРУЧНИКА (див. README):
     course: 'informatics2_2026'               — id нового курсу (файл data/courses/informatics2_2026.js)
     archive: [{ course: 'informatics2', label: 'видання 2024' }] — старі видання; їхні результати
                                                  вчитель і далі бачить у «Результатах». */
window.CATALOG = [
  { cls: 2, color: '#FF7A59', subjects: [
    { id: 'informatics2', name: 'Інформатика', icon: '💻', ready: true }
  ]},
  { cls: 3, color: '#FFB020', subjects: [
    { id: 'informatics3', name: 'Інформатика', icon: '💻', ready: true }
  ]},
  { cls: 4, color: '#2BB673', subjects: [
    { id: 'informatics4', name: 'Інформатика', icon: '💻', ready: true }
  ]},
  { cls: 5, color: '#14B8C4', subjects: [
    { id: 'informatics5', name: 'Інформатика', icon: '💻', ready: true },
    { id: 'math5', name: 'Математика', icon: '➗' }
  ]},
  { cls: 6, color: '#3B82F6', subjects: [
    { id: 'informatics6', name: 'Інформатика', icon: '💻', ready: true },
    { id: 'math6', name: 'Математика', icon: '➗' }
  ]},
  { cls: 7, color: '#6366F1', subjects: [
    { id: 'informatics7', name: 'Інформатика', icon: '💻' },
    { id: 'physics7', name: 'Фізика', icon: '🔭' }
  ]},
  { cls: 8, color: '#A855F7', subjects: [
    { id: 'informatics8', name: 'Інформатика', icon: '💻' },
    { id: 'physics8', name: 'Фізика', icon: '🔭' },
    { id: 'business8', name: 'Підприємництво', icon: '💼' }
  ]},
  { cls: 9, color: '#EC4899', subjects: [
    { id: 'informatics9', name: 'Інформатика', icon: '💻' },
    { id: 'physics9', name: 'Фізика', icon: '🔭' },
    { id: 'business9', name: 'Підприємництво', icon: '💼' }
  ]}
];

/* Курси, для яких уже підготовлено тести й презентації.
   Саме їх учитель може прив’язати до предмета в розділі «Предмети». */
window.AVAILABLE_COURSES = [
  { id: 'informatics2', subject: 'Інформатика', title: 'Інформатика, 2 клас — Морзе, Барна, «Я досліджую світ», ч. 2, 2024' },
  { id: 'informatics3', subject: 'Інформатика', title: 'Інформатика, 3 клас — Морзе, Барна, «Я досліджую світ», ч. 2, 2025' },
  { id: 'informatics4', subject: 'Інформатика', title: 'Інформатика, 4 клас — Морзе, Барна, «Інформатика», 2026' },
  { id: 'informatics5', subject: 'Інформатика', title: 'Інформатика, 5 клас — Морзе, Барна, «Інформатика», 2022' },
  { id: 'informatics6', subject: 'Інформатика', title: 'Інформатика, 6 клас — Морзе, Барна, «Інформатика», 2023' }
];
