/* Каталог класів і предметів.
   id предмета = назва файлу курсу в data/courses/<id>.js
   ready:true — курс уже наповнено; інакше учні бачать «Готуємо». */
window.CATALOG = [
  { cls: 2, color: '#FF7A59', subjects: [
    { id: 'informatics2', name: 'Інформатика', book: '«Я досліджую світ», Н. Морзе та ін., 2025', icon: '💻', ready: true }
  ]},
  { cls: 3, color: '#FFB020', subjects: [
    { id: 'informatics3', name: 'Інформатика', icon: '💻' }
  ]},
  { cls: 4, color: '#2BB673', subjects: [
    { id: 'informatics4', name: 'Інформатика', icon: '💻' }
  ]},
  { cls: 5, color: '#14B8C4', subjects: [
    { id: 'informatics5', name: 'Інформатика', icon: '💻' },
    { id: 'math5', name: 'Математика', icon: '➗' }
  ]},
  { cls: 6, color: '#3B82F6', subjects: [
    { id: 'informatics6', name: 'Інформатика', icon: '💻' },
    { id: 'math6', name: 'Математика', icon: '➗' }
  ]},
  { cls: 7, color: '#6366F1', subjects: [
    { id: 'informatics7', name: 'Інформатика', icon: '💻' },
    { id: 'physics7', name: 'Фізика', icon: '🔭' }
  ]},
  { cls: 8, color: '#A855F7', subjects: [
    { id: 'informatics8', name: 'Інформатика', icon: '💻' },
    { id: 'physics8', name: 'Фізика', icon: '🔭' },
    { id: 'health8', name: 'Основи здоров’я', icon: '🍎' },
    { id: 'business8', name: 'Підприємництво', icon: '💼' }
  ]},
  { cls: 9, color: '#EC4899', subjects: [
    { id: 'informatics9', name: 'Інформатика', icon: '💻' },
    { id: 'physics9', name: 'Фізика', icon: '🔭' },
    { id: 'business9', name: 'Підприємництво', icon: '💼' }
  ]}
];
