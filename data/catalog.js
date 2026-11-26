/* Каталог класів і предметів.
   id предмета = назва файлу курсу в data/courses/<id>.js
   ready:true — курс уже наповнено; інакше учні бачать «Готуємо».
   НОВЕ ВИДАННЯ ПІДРУЧНИКА (див. README):
     course: 'informatics2_2026'               — id нового курсу (файл data/courses/informatics2_2026.js)
     archive: [{ course: 'informatics2', label: 'видання 2024' }] — старі видання; їхні результати
                                                  вчитель і далі бачить у «Результатах». */
window.CATALOG = [
  { cls: 1, color: '#E8505B', subjects: [
    { id: 'ukr1', name: 'Українська мова (навчання грамоти)', icon: '✍️' },
    { id: 'math1', name: 'Математика', icon: '➗' },
    { id: 'world1', name: 'Я досліджую світ', icon: '🔎' }
  ]},
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
    { id: 'math5', name: 'Математика', icon: '➗', ready: true }
  ]},
  { cls: 6, color: '#3B82F6', subjects: [
    { id: 'informatics6', name: 'Інформатика', icon: '💻', ready: true },
    { id: 'math6', name: 'Математика', icon: '➗', ready: true }
  ]},
  { cls: 7, color: '#6366F1', subjects: [
    { id: 'informatics7', name: 'Інформатика', icon: '💻', ready: true },
    { id: 'physics7', name: 'Фізика', icon: '🔭', ready: true },
    { id: 'histua7', name: 'Історія України', icon: '🇺🇦', ready: true }
  ]},
  { cls: 8, color: '#A855F7', subjects: [
    { id: 'informatics8', name: 'Інформатика', icon: '💻', ready: true },
    { id: 'physics8', name: 'Фізика', icon: '🔭', ready: true },
    { id: 'business8', name: 'Підприємництво', icon: '💼', ready: true }
  ]},
  { cls: 9, color: '#EC4899', subjects: [
    { id: 'informatics9', name: 'Інформатика', icon: '💻', ready: true },
    { id: 'physics9', name: 'Фізика', icon: '🔭', ready: true },
    { id: 'business9', name: 'Підприємництво', icon: '💼', ready: true }
  ]}
];

/* Курси, для яких уже підготовлено тести й презентації.
   Саме їх учитель може прив’язати до предмета в розділі «Предмети». */
window.AVAILABLE_COURSES = [
  { id: 'informatics2', subject: 'Інформатика', title: 'Інформатика, 2 клас — Морзе, Барна, «Я досліджую світ», ч. 2, 2024' },
  { id: 'informatics3', subject: 'Інформатика', title: 'Інформатика, 3 клас — Морзе, Барна, «Я досліджую світ», ч. 2, 2025' },
  { id: 'informatics4', subject: 'Інформатика', title: 'Інформатика, 4 клас — Морзе, Барна, «Інформатика», 2026' },
  { id: 'informatics5', subject: 'Інформатика', title: 'Інформатика, 5 клас — Морзе, Барна, «Інформатика», 2022' },
  { id: 'informatics6', subject: 'Інформатика', title: 'Інформатика, 6 клас — Морзе, Барна, «Інформатика», 2023' },
  { id: 'informatics7', subject: 'Інформатика', title: 'Інформатика, 7 клас — Морзе, Барна, «Інформатика», 2024' },
  { id: 'informatics8', subject: 'Інформатика', title: 'Інформатика, 8 клас — Морзе, Барна, «Інформатика», 2025' },
  { id: 'informatics9', subject: 'Інформатика', title: 'Інформатика, 9 клас — Бондаренко, Ластовецький та ін., «Ранок», 2026' },
  { id: 'physics7', subject: 'Фізика', title: 'Фізика, 7 клас — Бар’яхтар, Довгий та ін., «Ранок», 2024' },
  { id: 'physics8', subject: 'Фізика', title: 'Фізика, 8 клас — Бар’яхтар, Довгий та ін., «Ранок», 2021' },
  { id: 'physics9', subject: 'Фізика', title: 'Фізика, 9 клас — Бар’яхтар, Довгий та ін., «Ранок», 2026' },
  { id: 'math5', subject: 'Математика', title: 'Математика, 5 клас — Мерзляк, Полонський, Якір, «Гімназія», 2022' },
  { id: 'math6', subject: 'Математика', title: 'Математика, 6 клас — Мерзляк, Полонський, Якір, «Гімназія», 2023 (ч. 1–2)' },
  { id: 'business8', subject: 'Підприємництво', title: 'Підприємництво і фінансова грамотність, 8 клас — Гільберг, Суховій, «Генеза», 2025' },
  { id: 'business9', subject: 'Підприємництво', title: 'Підприємництво і фінансова грамотність, 9 клас — Гільберг, Суховій, «Генеза», 2026' },
  { id: 'histua7', subject: 'Історія України', title: 'Історія України, 7 клас — І. Щупак та ін., УОВЦ «Оріон», 2024' }
];
