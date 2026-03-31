/**
 * @typedef {'leitura_pdf' | 'questoes' | 'video' | 'revisao' | 'lei_seca' | 'outras'} TaskType
 */

/**
 * @typedef {Object} Orientation
 * @property {string} id
 * @property {string} title
 * @property {string} body
 */

/**
 * @typedef {Object} ArticleRange
 * @property {string} raw         - ex: "1 a 5, 45, 100 a 102"
 * @property {number[]} resolved  - ex: [1,2,3,4,5,45,100,101,102]
 */

/**
 * @typedef {Object} Task
 * @property {string}       id
 * @property {string}       disciplineId
 * @property {TaskType}     type
 * @property {string}       title
 * @property {string}       description
 * @property {string}       link
 * @property {string|null}  orientationId
 * @property {ArticleRange|null} articles   - só para lei_seca
 * @property {string|null}  lawSource       - só para lei_seca (ex: "CF/88")
 * @property {string}       createdAt
 */

/**
 * @typedef {Object} Goal
 * @property {string}   id
 * @property {string}   planId
 * @property {string}   title
 * @property {string}   description
 * @property {string[]} taskIds
 * @property {string}   createdAt
 */

/**
 * @typedef {Object} Plan
 * @property {string}   id
 * @property {string}   title          - ex: "Sefaz MA 2027"
 * @property {string}   description
 * @property {string}   mentorId
 * @property {string[]} sharedWith     - userIds
 * @property {string}   createdAt
 */

/**
 * @typedef {Object} Discipline
 * @property {string} id
 * @property {string} name             - ex: "Direito Constitucional"
 * @property {string} color            - hex
 */