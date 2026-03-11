export const sampleStudyDatabase = {
  id: 'sample-es-en',
  name: 'Sample Spanish Essentials',
  type: 'study',
  cards: [
    { id:'1', term:'hola', translation:'hello', example_sentence:'Hola, ¿cómo estás?', example_translation:'Hello, how are you?', pronunciation:'OH-la', part_of_speech:'interjection', tags:['greeting'], difficulty:'easy' },
    { id:'2', term:'comer', translation:'to eat', example_sentence:'Me gusta comer fruta.', example_translation:'I like to eat fruit.', pronunciation:'koh-MEHR', part_of_speech:'verb', tags:['food'], difficulty:'easy' },
    { id:'3', term:'desarrollar', translation:'to develop', example_sentence:'Quiero desarrollar nuevas habilidades.', example_translation:'I want to develop new skills.', pronunciation:'deh-sah-ro-YAR', part_of_speech:'verb', tags:['work'], difficulty:'medium' },
    { id:'4', term:'a pesar de', translation:'despite', example_sentence:'A pesar de la lluvia, salimos.', example_translation:'Despite the rain, we went out.', pronunciation:'ah peh-SAR deh', part_of_speech:'phrase', tags:['connector'], difficulty:'hard' }
  ]
};

export const samplePracticeDatabase = {
  id: 'sample-practice-es',
  name: 'Sample Spanish Practice Test',
  type: 'practice',
  questions: [
    { id:'p1', question:'Choose the correct translation of "book".', question_type:'multiple_choice', choices:['libro','mesa','correr','azul'], correct_answer:'libro', explanation:'"Libro" means book.', topic:'vocabulary', difficulty:'easy', tags:['noun'] },
    { id:'p2', question:'True or False: "perro" means cat.', question_type:'true_false', correct_answer:'false', explanation:'Perro means dog.', topic:'vocabulary', difficulty:'easy' },
    { id:'p3', question:'Write the Spanish word for "to speak".', question_type:'typed', acceptable_answers:['hablar'], correct_answer:'hablar', hint:'Starts with h.', topic:'verbs', difficulty:'medium' }
  ]
};
