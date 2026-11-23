const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
const icons = {query:'⌕',review:'⌘',account:'◉',csrf:'↗',path:'⌂',auth:'♙',cookies:'◌',dos:'⌁',dns:'◎',browse:'⌗',command:'⌘',ssti:'{ }',xxe:'< >',pay:'₽',deserialize:'◇',reset:'↻',ssrf:'⇢',upload:'↑',config:'⚙',file:'▤'};
const CASES = {
  sqli:{n:'01',title:'Каталог, который знает слишком много',clue:'После одного странного запроса магазин показывает почти весь ассортимент. Найди ввод, который меняет смысл поиска.',objective:'Добейся выдачи всех восьми предметов одним поисковым запросом.',hint:'Посмотри, как строка поиска попадает в запрос к каталогу. Попробуй изменить условие так, чтобы оно стало истинным для каждой записи.',xp:100,badge:'Детектив запросов',solution:'SQL-инъекция · CWE-89. Защита: параметризованные запросы и раздельная обработка кода и данных.',ubi:[33]},
  xss:{n:'02',title:'Гостевая книга с сюрпризом',clue:'Покупатели оставляют отзывы. Проверь, всегда ли текст на странице остаётся только текстом.',objective:'Найди отзыв, который браузер интерпретирует как активное содержимое.',hint:'Сравни обычный отзыв и HTML с обработчиком события. В учебной форме можно использовать безвредную проверку на локальном стенде.',xp:120,badge:'Редактор разметки',solution:'XSS · CWE-79. Защита: контекстное экранирование, безопасные шаблоны и корректная Content Security Policy.',ubi:[41]},
  idor:{n:'03',title:'Чужая посылка',clue:'В списке заказов есть записи двух покупателей. Проверь, насколько надёжно сервер связывает запрос с владельцем.',objective:'Открой заказ, который принадлежит другому демонстрационному покупателю.',hint:'Сравни запросы для покупателей 1001 и 1002. Идентификатор в запросе не всегда подтверждает право доступа.',xp:110,badge:'Чужие не читают',solution:'IDOR / нарушение контроля доступа · CWE-639. Защита: проверять владельца объекта на сервере при каждом запросе.',ubi:[28,159]},
  csrf:{n:'04',title:'Адрес изменился сам',clue:'В аккаунте можно изменить адрес доставки. Выясни, требует ли действие подтверждения намерения пользователя.',objective:'Выполни изменение через форму и изучи ответ сервера.',hint:'Проверь, нужен ли уникальный токен запроса или другое подтверждение помимо активной сессии.',xp:100,badge:'Проверка намерений',solution:'CSRF · CWE-352. Защита: непредсказуемый CSRF-токен, SameSite cookies и проверка источника запроса.',ubi:[42]},
  path:{n:'05',title:'Файл за соседней дверью',clue:'Служба выдаёт файлы по имени. В фиктивном архиве спрятана заметка с промокодом.',objective:'Найди заметку, расположенную вне обычной папки каталога.',hint:'Подумай, что означает переход на родительский каталог в пути. Стенд вернёт только данные из своей фиктивной карты.',xp:120,badge:'Архивариус',solution:'Path traversal / обход пути · CWE-22. Защита: нормализовать путь, ограничивать его корневым каталогом и использовать allowlist имён.',ubi:[15,16]},
  auth:{n:'06',title:'Вход без очереди',clue:'У магазина есть демонстрационная учётная запись. Исследуй вход и его реакцию на неудачные попытки.',objective:'Найди доступную учебную пару логин/пароль и войди.',hint:'В лабораторном стенде использованы простые тестовые реквизиты; попробуй типовые demo/admin значения.',xp:100,badge:'Вход найден',solution:'Слабые/повторно используемые учётные данные и отсутствие ограничения попыток · CWE-521/307. Защита: уникальные стойкие пароли, MFA, задержка и rate limit.',ubi:[8,30,46,100]},
  cookies:{n:'07',title:'Следы в браузере',clue:'Сессия магазина хранится в браузере. Проверь, какие настройки защищают её от чтения и передачи.',objective:'Изучи cookie сессии и определи, каких защитных атрибутов не хватает.',hint:'Сравни атрибуты HttpOnly, Secure и SameSite. Учебная метка не содержит настоящих секретов.',xp:90,badge:'Хранитель сессии',solution:'Слабая защита cookies · CWE-614/1004. Защита: HttpOnly, Secure, SameSite и отсутствие секретных данных в доступном JavaScript.',ubi:[17,197]},
  dos:{n:'08',title:'Очередь не движется',clue:'Представь распродажу: запросы копятся, а новые посетители ждут. Сравни поведение без ограничений и с защитой.',objective:'Проведи обе ограниченные симуляции и сравни принятые и заблокированные запросы.',hint:'Симулятор безопасно ограничен двадцатью условными запросами и не создаёт реальную нагрузку.',xp:120,badge:'Дежурный по очереди',solution:'Риск исчерпания ресурсов / отказ в обслуживании · CWE-400. Защита: rate limiting, квоты, таймауты и распределение нагрузки.',ubi:[14,140,153]},
  dns:{n:'09',title:'Куда ведёт shop.lab?',clue:'Внутренняя карточка магазина сообщает адрес узла. Проверь, совпадает ли он с ожидаемым адресом стенда.',objective:'Сравни синтетическую DNS-запись с ожидаемым адресом 192.0.2.10.',hint:'Адреса 192.0.2.0/24 и 203.0.113.0/24 зарезервированы для примеров; реальные DNS-запросы не выполняются.',xp:100,badge:'Верный адрес',solution:'Подмена DNS-кеша. Защита: безопасный DNS-резолвер, проверка ответов, обновления и мониторинг изменений записей.',ubi:[19]},
  browse:{n:'10',title:'Страницы вне меню',clue:'Не все страницы обязательно попадают в навигацию магазина. Исследуй известные служебные маршруты стенда.',objective:'Найди хотя бы один доступный маршрут, на который нет ссылки в меню.',hint:'Попробуй распространённые имена вроде preview или old backup; ответ содержит только безопасную демонстрационную запись.',xp:90,badge:'Картограф сайта',solution:'Принудительный веб-браузинг · CWE-425.',ubi:[151,159]},
  command:{n:'11',title:'Диагностика магазина',clue:'Служба проверки доступности принимает имя узла.',objective:'Получи маркер инъекции в echo-симуляции.',hint:'Проверь разделители команд; команды ОС не запускаются.',xp:110,badge:'Диагност',solution:'Command injection · CWE-78 · BDU:W01; shell не запускается.',ubi:[68]},
  ssti:{n:'12',title:'Шаблон с секретом',clue:'Проверь поле персонализации страницы.',objective:'Передай маркер шаблона.',hint:'Поищи синтаксис фигурных скобок. Выражения не вычисляются.',xp:100,badge:'Ткач шаблонов',solution:'SSTI · CWE-1336 · BDU:W01; распознаётся только маркер.',ubi:[68]},
  xxe:{n:'13',title:'XML из письма',clue:'Импорт заказа принимает XML.',objective:'Найди маркер объявления сущности.',hint:'Используй DOCTYPE/ENTITY; XML не разбирается.',xp:100,badge:'XML-следопыт',solution:'XXE · CWE-611 · BDU:W01; сущности не разрешаются.',ubi:[68]},
  pay:{n:'14',title:'Чек на любую сумму',clue:'Проверь, откуда берутся сумма и статус оплаты.',objective:'Отправь чек с произвольными параметрами.',hint:'Платёжный сервер не подтверждает клиентские значения.',xp:100,badge:'Аудитор чека',solution:'Доверие клиентским данным · CWE-602 · УБИ.033.',ubi:[33]},
  deserialize:{n:'15',title:'Импортированный объект',clue:'Проверь обработку архивированных данных корзины.',objective:'Передай фиктивный маркер сериализации.',hint:'pickle/eval не вызываются.',xp:100,badge:'Архивный след',solution:'Небезопасная десериализация · CWE-502 · BDU:W03.',ubi:[68]},
  reset:{n:'16',title:'Код восстановления',clue:'Профиль показывает код восстановления.',objective:'Запроси демонстрационный код сброса.',hint:'Проверь источник случайности в коде.',xp:100,badge:'Случайность',solution:'Слабый генератор · CWE-330 · УБИ.008.',ubi:[8]},
  ssrf:{n:'17',title:'Внутренний запрос',clue:'Сервер загружает превью по URL.',objective:'Получить localhost fixture через серверный запрос.',hint:'Допускается только localhost:5000/api/ssrf-fixture.',xp:110,badge:'Локальный навигатор',solution:'SSRF · CWE-918 · УБИ.068; разрешена одна локальная фикстура.',ubi:[68]},
  upload:{n:'18',title:'Посылка с файлом',clue:'Форма принимает изображение товара.',objective:'Загрузи файл размером до 1 МБ.',hint:'Файл сохранится в uploads/ как данные и не исполнится.',xp:100,badge:'Контролёр вложений',solution:'Загрузка файла · CWE-434 · BDU:W05; файл не исполняется.',ubi:[21]},
  file:{n:'19',title:'Системный справочник',clue:'Лабораторный маршрут читает ограниченную локальную фикстуру.',objective:'Запроси /etc/passwd.',hint:'Разрешён только этот путь, вывод ограничен 4096 байтами.',xp:100,badge:'Читатель фикстур',solution:'Раскрытие файла · CWE-22 · BDU:W02; разрешён только /etc/passwd.',ubi:[16]},
  config:{n:'20',title:'Настройки магазина',clue:'Осмотри конфигурационный эндпоинт и заголовки.',objective:'Найди FAKE ключ, wildcard CORS и отсутствующие заголовки.',hint:'Открой /api/config и изучи ответ.',xp:100,badge:'Инспектор конфигурации',solution:'Небезопасная конфигурация · CWE-489/942/1021.',ubi:[127]}
};
let products = [];
let activeCategory = 'Все';
let activeTab = 'all';
let selectedLab = null;
let bag = 0;
let toastTimer;
let badgeTimer;
let progressState = readProgress();

function readProgress() {
  try { return {...{solved:[],xp:0,dosFree:false,dosProtected:false}, ...JSON.parse(localStorage.getItem('forma-lab-progress') || '{}')}; }
  catch { return {solved:[],xp:0,dosFree:false,dosProtected:false}; }
}
function saveProgress() { localStorage.setItem('forma-lab-progress', JSON.stringify(progressState)); renderProgress(); }
function renderProgress() {
  const solved = progressState.solved.length;
  const totalCases = Object.keys(CASES).length;
  const level = Math.floor(progressState.xp / 250) + 1;
  const levelProgress = (progressState.xp % 250) / 250 * 100;
  $('#homeSolved').textContent = solved; $('#homeXp').textContent = progressState.xp;
  $('#homeProgress').style.width = `${solved * 5}%`; $('#fabSolved').textContent = `${solved}/20`;
  $('#gameLevel').textContent = level; $('#gameXp').textContent = progressState.xp;
  $('#gameSolved').textContent = solved; $('#gameBadges').textContent = solved;
  $('#gameProgress').style.width = `${levelProgress}%`;
  const shelf = $('#badgeShelf');
  if (shelf) shelf.innerHTML = Object.entries(CASES).map(([id, mission]) => `<span class="badge-chip ${progressState.solved.includes(id)?'earned':''}" title="${progressState.solved.includes(id)?mission.badge:'Значок пока закрыт'}"><i>${progressState.solved.includes(id)?'✦':'?'}</i></span>`).join('');
}
function completeCase(id, successful, note = '') {
  if (!successful || progressState.solved.includes(id)) return;
  const mission = CASES[id]; if (!mission) return;
  progressState.solved.push(id); progressState.xp += mission.xp; saveProgress();
  const pop = document.createElement('div'); pop.className = 'badge-pop';
  pop.innerHTML = `<strong>Значок получен: ${mission.badge}</strong><span>+${mission.xp} XP · ${note || 'Дело раскрыто. Разбор доступен ниже.'}</span>`;
  document.body.append(pop); clearTimeout(badgeTimer); badgeTimer = setTimeout(() => pop.remove(), 4300);
  loadLabs();
  if (selectedLab?.id === id) showLab(selectedLab);
  if (progressState.solved.length === 20) setTimeout(() => showToast('Все дела раскрыты! Ты прошёл сезон «Тихая форма». 🎉'), 500);
}

function artFor(kind) {
  const common = 'viewBox="0 0 220 220" role="img" aria-hidden="true"';
  const sets = {
    chair: `<svg ${common}><ellipse cx="110" cy="188" rx="62" ry="10" fill="#414339" opacity=".12"/><path d="M63 48Q67 30 88 29h49q22 0 24 22l4 65H57z" fill="#9d7959"/><path d="M65 55q5-17 21-17h54q13 0 15 17l3 42H62z" fill="#b08b68"/><path d="M53 107q0-9 11-9h91q12 0 13 10l-8 30H63z" fill="#a17b59"/><path d="M60 111 44 119l4 35 14 1 9-33M159 111l18 8-5 37-15-1-8-34" fill="#987351"/><path d="m73 135-6 54m78-54 8 54" stroke="#684e39" stroke-width="7" stroke-linecap="round"/><path d="M91 44v53m39-53v53" stroke="#c4a17e" stroke-width="2" opacity=".5"/></svg>`,
    lamp: `<svg ${common}><ellipse cx="111" cy="188" rx="46" ry="8" fill="#414339" opacity=".12"/><path d="M109 66v113" stroke="#786e5e" stroke-width="5"/><path d="M64 69q4-43 46-43t46 43z" fill="#d4c7ad"/><path d="M64 69h92" stroke="#a6977b" stroke-width="4"/><path d="M88 178h43q12 0 15 8H72q3-8 16-8" fill="#766d60"/><path d="M94 72v80m33-80v80" stroke="#c1b297" stroke-width="1" opacity=".55"/><circle cx="110" cy="91" r="26" fill="#f1dfad" opacity=".2"/></svg>`,
    vase: `<svg ${common}><ellipse cx="112" cy="188" rx="38" ry="8" fill="#414339" opacity=".12"/><path d="M91 43h39l-5 28q0 8 12 21 15 17 12 48-2 35-34 37h-8q-32-2-34-37-3-31 12-48 12-13 11-22z" fill="#b9b7aa"/><path d="M93 47h36v11H93z" fill="#d7d4c8"/><path d="M96 82q14 9 32 0M85 141q26 16 54 0" fill="none" stroke="#e2dfd4" stroke-width="3" opacity=".65"/><path d="M110 40v-19m0 10-13-8m13 13 15-15" stroke="#788674" stroke-width="2"/></svg>`,
    sofa: `<svg ${common}><ellipse cx="110" cy="184" rx="82" ry="10" fill="#414339" opacity=".12"/><path d="M38 96q0-14 16-14h112q16 0 16 14v64H38z" fill="#aa9e8c"/><path d="M48 75q0-13 15-13h94q15 0 15 13v30H48z" fill="#c5b9a5"/><path d="M41 106h139v49H41z" fill="#b6aa96"/><path d="M109 75v76" stroke="#998c78" stroke-width="2"/><path d="M51 151v29m123-29v29" stroke="#715f4b" stroke-width="7" stroke-linecap="round"/><path d="M52 109v34m116-34v34" stroke="#d4caba" stroke-width="3" opacity=".6"/></svg>`,
    clock: `<svg ${common}><ellipse cx="111" cy="184" rx="51" ry="8" fill="#414339" opacity=".12"/><circle cx="110" cy="105" r="63" fill="#b6aa96"/><circle cx="110" cy="105" r="54" fill="#e2ddcf"/><circle cx="110" cy="105" r="3" fill="#646657"/><path d="M110 105V67m0 38 26 13" stroke="#696b60" stroke-width="3" stroke-linecap="round"/><circle cx="110" cy="52" r="2" fill="#8e907f"/><circle cx="163" cy="105" r="2" fill="#8e907f"/><circle cx="110" cy="158" r="2" fill="#8e907f"/><circle cx="57" cy="105" r="2" fill="#8e907f"/></svg>`
  };
  return sets[kind] || sets.vase;
}

function renderProducts(list) {
  const grid = $('#productGrid');
  const visible = activeCategory === 'Все' ? list : list.filter(item => item.category === activeCategory);
  $('#shownCount').textContent = String(visible.length).padStart(2, '0');
  $('#searchFeedback').textContent = visible.length ? '' : 'Ничего не нашлось. Попробуйте изменить запрос.';
  grid.innerHTML = visible.map(item => `
    <article class="product-card" data-id="${item.id}">
      <div class="product-visual" style="--swatch:${item.color}">
        <span class="product-tag">${item.category.toUpperCase()}</span>
        <button class="product-heart" aria-label="В избранное">♡</button>
        <div class="product-illustration">${artFor(item.art)}</div>
      </div>
      <div class="product-info"><div class="product-title-row"><span class="product-title">${item.name}</span><span class="product-price">${money(item.price)}</span></div><div class="product-subtitle">${item.subtitle}</div><button class="add-button">Добавить в корзину <span>＋</span></button></div>
    </article>`).join('');
  $$('.add-button', grid).forEach(button => button.addEventListener('click', () => { bag++; $('#bagCount').textContent = bag; showToast('Добавили в вашу корзину'); }));
  $$('.product-heart', grid).forEach(button => button.addEventListener('click', () => { button.classList.toggle('saved'); button.textContent = button.classList.contains('saved') ? '♥' : '♡'; }));
}

async function fetchProducts(term = '') {
  const response = await fetch('/api/products?q=' + encodeURIComponent(term));
  const data = await response.json();
  products = data.products || [];
  renderProducts(products);
  if (data.error) $('#searchFeedback').textContent = data.error + ' · учебная SQL-инъекция';
  else if (term) $('#searchFeedback').textContent = `Найдено: ${data.count} · поиск в учебной базе`;
}

function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function openLab() { $('#labOverlay').classList.add('open'); $('#labOverlay').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
function closeLab() { $('#labOverlay').classList.remove('open', 'detail-open'); $('#labOverlay').setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; selectedLab = null; }

const LAB_GROUPS = {sqli:'Данные',xss:'Браузер',idor:'Аккаунт',csrf:'Аккаунт',path:'Сервер',auth:'Аккаунт',cookies:'Браузер',dos:'Сеть',dns:'Сеть',browse:'Веб-сервер',command:'Сервер',ssti:'Сервер',xxe:'Сервер',pay:'Данные',deserialize:'Сервер',reset:'Аккаунт',ssrf:'Сеть',upload:'Сервер',file:'Сервер',config:'Сервер'};
const LAB_KINDS = {sqli:'query',xss:'review',idor:'account',csrf:'csrf',path:'path',auth:'auth',cookies:'cookies',dos:'dos',dns:'dns',browse:'browse',command:'command',ssti:'ssti',xxe:'xxe',pay:'pay',deserialize:'deserialize',reset:'reset',ssrf:'ssrf',upload:'upload',file:'file',config:'config'};
function loadLabs() {
  const labs = Object.keys(CASES).map(id => ({id, group:LAB_GROUPS[id], kind:LAB_KINDS[id]}));
  renderLabList(labs);
}

function renderLabList(labs) {
  const filtered = labs.filter(lab => activeTab === 'all' || (activeTab === 'web' ? ['Данные','Браузер','Аккаунт'].includes(lab.group) : ['Сервер','Сеть','Веб-сервер'].includes(lab.group)));
  $('#labList').innerHTML = filtered.map(lab => { const mission = CASES[lab.id] || {n:'?',title:lab.title,clue:'Исследуй учебный сценарий.',objective:'Проверь соответствующий API-маршрут.',xp:80,solution:lab.cwe,ubi:[]}; const done = progressState.solved.includes(lab.id); return `<button class="lab-card ${done?'completed':''}" data-lab="${lab.id}"><span class="lab-icon ${done?'case-open':''}">${done?'✓':String(mission.n).padStart(2,'0')}</span><span><span class="case-num">ДЕЛО ${mission.n} · ${done?'РАСКРЫТО':'ЗАЦЕПКА'}</span><span class="lab-card-title">${mission.title}</span><span class="lab-card-desc">${done?mission.solution:mission.clue}</span><span class="mission-meta"><span>${done?'Значок получен':mission.objective}</span><b>${done?'✓':`+${mission.xp} XP`}</b></span><span class="mission-progress"><i style="width:${done?'100%':'0%'}"></i></span></span><span class="lab-arrow">${done?'★':'↗'}</span></button>`; }).join('');
  $$('.lab-card').forEach(card => card.addEventListener('click', () => showLab(filtered.find(lab => lab.id === card.dataset.lab))));
}

function showLab(lab) {
  selectedLab = lab;
  $('#labOverlay').classList.add('detail-open');
  const mission = CASES[lab.id] || {n:'?',title:lab.title,clue:'Исследуй учебный сценарий.',objective:'Проверь соответствующий API-маршрут.',hint:'Смотри описание API в README.',xp:80,solution:lab.cwe,ubi:[]}, done = progressState.solved.includes(lab.id);
  const ubi = done ? mission.ubi.map(id => `<span class="lab-tag ubi">УБИ ${id}</span>`).join('') : '<span class="lab-tag">Класс дефекта скрыт до раскрытия</span>';
  const hint = `<details class="mission-hint"><summary>Открыть подсказку</summary><p>${mission.hint}</p></details>`;
  const debrief = done ? `<div class="debrief"><b>Разбор дела</b><p>${mission.solution}<br>Связанные записи: ${mission.ubi.map(id=>`УБИ ${id}`).join(', ') || 'практикум'}.</p></div>` : '';
  $('#detailContent').innerHTML = `<div class="detail-heading"><p class="eyebrow dark"><span class="eyebrow-line"></span> ДЕЛО ${mission.n} · ${lab.group.toUpperCase()}</p><h3>${mission.title}</h3><div class="mission-intro"><span class="case-num">ЗАДАНИЕ</span><p>${mission.clue}</p><div class="mission-meta"><span>${mission.objective}</span><b>+${mission.xp} XP</b></div></div><div class="detail-metadata">${ubi}</div>${done?'':hint}</div>${formFor(lab.kind)}${debrief}`;
  bindLabForm(lab.kind);
}

function formFor(kind) {
  const box = (title, body, form) => `<section class="detail-box"><h4>${title}</h4><p>${body}</p>${form}<div class="lab-result" hidden></div></section>`;
  switch(kind) {
    case 'query': return box('Исследуй каталог','Попробуй обычный поиск, затем проверь необычный ввод. Каталог содержит только восемь учебных товаров.',`<form class="lab-form" id="queryLab"><label>Поисковая строка<input name="q" value="chair" autocomplete="off"></label><button class="lab-action">Искать</button></form>`);
    case 'review': return box('Оставь отзыв','Отправь сообщение и посмотри, как оно появляется в гостевой книге. Используй только учебные данные.',`<form class="lab-form" id="reviewLab"><label>Имя<input name="author" value="Гость"></label><label>Отзыв<textarea name="body" placeholder="Поделитесь впечатлением"></textarea></label><button class="lab-action">Опубликовать</button></form><div class="review-output" id="reviewOutput" hidden></div>`);
    case 'account': return box('Посмотри заказы','В магазине есть демонстрационные учётные записи. Проверь, какие записи выдаёт форма.',`<form class="lab-form" id="accountLab"><label>Номер покупателя<input name="customer_id" value="1001" inputmode="numeric"></label><button class="lab-action">Показать заказы</button></form>`);
    case 'csrf': return box('Измени адрес доставки','Сохрани другой адрес, затем изучи, какие проверки выполнил сервер.',`<form class="lab-form" id="csrfLab"><label>Адрес доставки<input name="address" value="ул. Тихая, 12"></label><button class="lab-action">Сохранить</button></form>`);
    case 'path': return box('Запроси файл','В хранилище магазина есть фиктивные документы. Ответы не читаются с диска компьютера.',`<form class="lab-form" id="pathLab"><label>Имя или путь документа<input name="path" value="../private/notes.txt"></label><button class="lab-action">Открыть документ</button></form>`);
    case 'auth': return box('Войди в демо-аккаунт','Проверь, как устроен вход в учебном магазине. Здесь нет реальных пользователей.',`<form class="lab-form" id="authLab"><label>Имя пользователя<input name="username" autocomplete="off"></label><label>Пароль<input name="password" type="password"></label><button class="lab-action">Войти</button></form>`);
    case 'cookies': return box('Исследуй браузерное хранилище','Посмотри на значение сессии и её настройки. Никаких настоящих секретов в cookie нет.',`<button class="lab-action" id="inspectCookie">Проверить хранилище</button><div class="lab-result" id="cookieResult" hidden></div>`);
    case 'dos': return box('Симулятор очереди','Сравни режимы. Для безопасности модель ограничена двадцатью условными запросами и не создаёт сетевой трафик.',`<form class="lab-form" id="dosLab"><label>Условное число запросов (1–20)<input name="requests" type="number" min="1" max="20" value="12"></label><label><span><input name="protected" type="checkbox" style="width:auto;min-height:auto;margin-right:7px">Включить ограничитель</span></label><button class="lab-action">Смоделировать</button></form>`);
    case 'dns': return box('Сверь адрес узла','Сравни ответ учебного сервиса с ожидаемым адресом из задания. Реальные DNS-запросы не выполняются.',`<form class="lab-form" id="dnsLab"><label>Имя узла<input name="host" value="shop.lab"></label><label>Ожидаемый IP<input name="expected" value="192.0.2.10"></label><button class="lab-action">Проверить запись</button></form>`);
    case 'browse': return box('Исследуй маршруты','Проверь, существуют ли у магазина страницы помимо тех, что видны в меню.',`<form class="lab-form" id="browseLab"><label>Адрес страницы<input name="route" value="test.php"></label><button class="lab-action">Открыть</button></form>`);
    case 'command': return box('Проверка доступности','Команда полностью симулируется; shell не запускается.',`<form class="lab-form" id="commandLab"><label>Аргумент echo<input name="host" value="127.0.0.1"></label><button class="lab-action">Проверить</button></form>`);
    case 'ssti': return box('Шаблонный маркер','Сервер только отмечает синтаксис шаблона, не вычисляет его.',`<form class="lab-form" id="sstiLab"><label>Текст приветствия<textarea name="template">Привет, {{ marker }}</textarea></label><button class="lab-action">Отправить</button></form>`);
    case 'xxe': return box('XML-маркер','Внешние сущности не разбираются.',`<form class="lab-form" id="xxeLab"><label>XML<textarea name="xml">&lt;!DOCTYPE x [&lt;!ENTITY demo "XXE_MARKER"&gt;]&gt;</textarea></label><button class="lab-action">Импортировать</button></form>`);
    case 'pay': return box('Учебный чек','Платёж не проводится; создаётся только локальная запись.',`<form class="lab-form" id="payLab"><label>Сумма<input name="amount" type="number" value="1"></label><label>Статус<input name="status" value="paid"></label><button class="lab-action">Создать чек</button></form>`);
    case 'deserialize': return box('Импорт корзины','Обрабатывается только маркер; десериализация не запускается.',`<form class="lab-form" id="deserializeLab"><label>Данные<textarea name="data">SERIALIZATION_MARKER</textarea></label><button class="lab-action">Проверить</button></form>`);
    case 'reset': return box('Восстановление доступа','Код остаётся демонстрационным, пароль не меняется.',`<button class="lab-action" id="resetLab">Запросить код</button>`);
    case 'ssrf': return box('Загрузка локального превью','URL ограничен одним localhost-маршрутом.',`<form class="lab-form" id="ssrfLab"><label>URL<input name="url" value="http://127.0.0.1:5000/api/ssrf-fixture"></label><button class="lab-action">Получить превью</button></form>`);
    case 'upload': return box('Загрузка вложения','Размер файла — до 1 МБ; файл только сохраняется.',`<form class="lab-form" id="uploadLab"><label>Файл<input name="file" type="file"></label><button class="lab-action">Сохранить</button></form>`);
    case 'file': return box('Локальная фикстура','Читается только /etc/passwd, максимум 4096 байт.',`<form class="lab-form" id="fileLab"><label>Путь<input name="path" value="../../etc/passwd"></label><button class="lab-action">Читать</button></form>`);
    case 'config': return box('Конфигурация и заголовки','Изучи тестовые настройки сервера.',`<button class="lab-action" id="configLab">Показать конфигурацию</button>`);
  }
}

function showResult(form, value, error = false) {
  const result = $('.lab-result', form.closest('.detail-box'));
  result.hidden = false; result.classList.toggle('error', error);
  result.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
async function postJSON(path, data) { const r = await fetch(path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); return {ok:r.ok,data:await r.json()}; }

function bindLabForm(kind) {
  const on = (id, callback) => { const form = $('#' + id); if (form) form.addEventListener('submit', async e => { e.preventDefault(); await callback(form); }); };
  if (kind === 'query') on('queryLab', async form => { const q = new FormData(form).get('q'); const r = await fetch('/api/products?q=' + encodeURIComponent(q)); const data = await r.json(); showResult(form, {найдено:data.count, товары:data.products?.map(p=>p.name), ошибка:data.error}); await fetchProducts(q); completeCase('sqli', data.count === 8 && /or\s+1\s*=\s*1/i.test(q), 'Каталог раскрыл все записи.'); });
  if (kind === 'review') on('reviewLab', async form => { const data = Object.fromEntries(new FormData(form)); const {data:result} = await postJSON('/api/reviews', {...data,product_id:'chair-01'}); const output = $('#reviewOutput'); output.hidden = false; output.innerHTML = `<b>${result.review.author}</b><p>${result.review.body}</p>`; showResult(form, 'Отзыв записан. Посмотри, как браузер показал его в гостевой книге.'); completeCase('xss', /<\s*(script|img|svg|iframe)\b|onerror\s*=|javascript:/i.test(data.body), 'Страница выполнила содержимое из отзыва.'); });
  if (kind === 'account') on('accountLab', async form => { const id = new FormData(form).get('customer_id'); const result = await (await fetch('/api/account?customer_id=' + id)).json(); showResult(form, result); completeCase('idor', id === '1002' && (result.orders || []).length > 0, 'Удалось открыть заказ другого покупателя.'); });
  if (kind === 'csrf') on('csrfLab', async form => { const {data} = await postJSON('/api/address', Object.fromEntries(new FormData(form))); showResult(form, data); completeCase('csrf', data.ok === true, 'Сервер принял изменение без дополнительного подтверждения.'); });
  if (kind === 'path') on('pathLab', async form => { const path = new FormData(form).get('path'); const data = await (await fetch('/api/file?path=' + encodeURIComponent(path))).json(); showResult(form, data, !!data.error); completeCase('path', path.includes('..') && !!data.content && data.content.includes('LAB-ONLY'), 'Вне обычной папки нашлась фиктивная заметка.'); });
  if (kind === 'auth') on('authLab', async form => { const values = Object.fromEntries(new FormData(form)); const result = await postJSON('/api/login', values); showResult(form, result.data, !result.ok); completeCase('auth', result.ok, `Демо-вход выполнен для ${result.data.user}.`); });
  if (kind === 'cookies') $('#inspectCookie').addEventListener('click', () => { const el = $('#cookieResult'); el.hidden = false; el.textContent = 'document.cookie → ' + (document.cookie || '(пусто)') + '\nПроверь настройки этой cookie в инструментах разработчика.'; completeCase('cookies', document.cookie.includes('lab_session='), 'Cookie доступна странице JavaScript.'); });
  if (kind === 'dos') on('dosLab', async form => { const values = new FormData(form); const count = Number(values.get('requests')); const protectedMode = values.has('protected'); const result = await postJSON('/api/load-sim', {requests:count, protected:protectedMode}); showResult(form, result.data); if (protectedMode) progressState.dosProtected = result.data.blocked > 0; else progressState.dosFree = result.data.accepted > 5; saveProgress(); completeCase('dos', progressState.dosFree && progressState.dosProtected, 'Сравнил поток без лимита и с ограничителем.'); });
  if (kind === 'dns') on('dnsLab', async form => { const values = Object.fromEntries(new FormData(form)); const data = await (await fetch('/api/dns-demo?host=' + encodeURIComponent(values.host))).json(); showResult(form, data); const mismatch = data.answer !== values.expected; completeCase('dns', mismatch, mismatch ? 'Ответ не совпал с ожидаемым адресом.' : 'Адрес совпал.'); });
  if (kind === 'browse') on('browseLab', async form => { const route = new FormData(form).get('route'); const data = await (await fetch('/api/hidden?route=' + encodeURIComponent(route))).json(); showResult(form, data, !!data.error); completeCase('browse', !!data.result, 'Нашёл маршрут вне основной навигации.'); });
  if (kind === 'command') on('commandLab', async form => { const host = new FormData(form).get('host'); const data = await (await fetch('/api/ping?host=' + encodeURIComponent(host))).json(); showResult(form, data); completeCase('command', !!data.marker, 'Появился маркер в безопасной симуляции.'); });
  if (kind === 'ssti') on('sstiLab', async form => { const data = await postJSON('/api/ssti', Object.fromEntries(new FormData(form))); showResult(form, data.data); completeCase('ssti', !!data.data.marker, 'Сервер распознал маркер без вычисления шаблона.'); });
  if (kind === 'xxe') on('xxeLab', async form => { const xml = new FormData(form).get('xml'); const data = await postJSON('/api/xxe', {xml}); showResult(form, data.data); completeCase('xxe', !!data.data.marker, 'Получен ответ-маркер без парсинга сущностей.'); });
  if (kind === 'pay') on('payLab', async form => { const data = await postJSON('/api/pay', Object.fromEntries(new FormData(form))); showResult(form, data.data); completeCase('pay', data.data.ok, 'Создан учебный чек на клиентскую сумму.'); });
  if (kind === 'deserialize') on('deserializeLab', async form => { const data = await postJSON('/api/deserialize', Object.fromEntries(new FormData(form))); showResult(form, data.data); completeCase('deserialize', !!data.data.marker, 'Получен маркер без десериализации.'); });
  if (kind === 'reset') $('#resetLab').addEventListener('click', async () => { const {data} = await postJSON('/api/reset', {}); $('#resetLab').nextElementSibling.textContent = JSON.stringify(data); completeCase('reset', !!data.token, 'Код восстановления создан слабым генератором.'); });
  if (kind === 'ssrf') on('ssrfLab', async form => { const url = new FormData(form).get('url'); const data = await (await fetch('/api/fetch?url=' + encodeURIComponent(url))).json(); showResult(form, data, !!data.error); completeCase('ssrf', JSON.stringify(data).includes('LOCAL_FIXTURE_ONLY'), 'Сервер получил только localhost-фикстуру.'); });
  if (kind === 'upload') on('uploadLab', async form => { const body = new FormData(form); const response = await fetch('/api/upload', {method:'POST',body}); const data = await response.json(); showResult(form, data, !response.ok); completeCase('upload', data.stored === true, 'Файл сохранён как неисполняемые данные.'); });
  if (kind === 'file') on('fileLab', async form => { const path = new FormData(form).get('path'); const data = await (await fetch('/api/file?path=' + encodeURIComponent(path))).json(); showResult(form, data); completeCase('file', !!data.content && data.path.includes('etc/passwd'), 'Прочитана ограниченная локальная фикстура.'); });
  if (kind === 'config') $('#configLab').addEventListener('click', async () => { const response = await fetch('/api/config'); const data = await response.json(); $('#configLab').nextElementSibling.textContent = JSON.stringify(data, null, 2); completeCase('config', data.cors === '*' && !!data.fake_secret, 'Найдены учебные признаки конфигурации.'); });
}

$('#profileButton').addEventListener('click', () => document.querySelector('#accountSection').scrollIntoView({behavior:'smooth'}));
$('#storeLogin').addEventListener('submit', async e => { e.preventDefault(); const result = await postJSON('/api/login', Object.fromEntries(new FormData(e.currentTarget))); const out = $('#loginOutput'); out.hidden = false; out.textContent = JSON.stringify(result.data, null, 2); });
$('#storeRegister').addEventListener('submit', async e => { e.preventDefault(); const result = await postJSON('/api/register', Object.fromEntries(new FormData(e.currentTarget))); const out = $('#registerOutput'); out.hidden = false; out.textContent = JSON.stringify(result.data, null, 2); });
$('#loadProfile').addEventListener('click', async () => { const profile = await (await fetch('/api/profile')).json(); $('#profileOutput').textContent = JSON.stringify(profile, null, 2); });
$('#searchForm').addEventListener('submit', async e => { e.preventDefault(); await fetchProducts($('#searchInput').value); });
$('#searchFocus').addEventListener('click', () => { $('#searchInput').focus(); document.querySelector('#catalog').scrollIntoView({behavior:'smooth'}); });
$('#filters').addEventListener('click', e => { const button = e.target.closest('.filter'); if (!button) return; activeCategory = button.dataset.category; $$('.filter').forEach(item => item.classList.toggle('active', item === button)); renderProducts(products); });
$('#openLab').addEventListener('click', openLab);
$('#startGame').addEventListener('click', openLab);
$('#closeLab').addEventListener('click', closeLab);
$('#detailBack').addEventListener('click', () => $('#labOverlay').classList.remove('detail-open'));
$('#labOverlay').addEventListener('click', e => { if (e.target === $('#labOverlay')) closeLab(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLab(); });
$('.lab-tabs').addEventListener('click', e => { const tab = e.target.closest('[data-tab]'); if (!tab) return; activeTab = tab.dataset.tab; $$('.lab-tabs button').forEach(item => item.classList.toggle('active', item === tab)); loadLabs(); });
$('#bagButton').addEventListener('click', () => showToast(bag ? `В корзине предметов: ${bag}` : 'Корзина пока пуста'));
$('#loadMore').addEventListener('click', () => showToast('Вы уже видите все предметы коллекции'));
$('#newsletterForm').addEventListener('submit', e => { e.preventDefault(); $('#newsletterStatus').textContent = 'Спасибо! Подписка демонстрационная, данные никуда не отправлены.'; $('#emailInput').value = ''; });

renderProgress();
fetchProducts();
loadLabs();
