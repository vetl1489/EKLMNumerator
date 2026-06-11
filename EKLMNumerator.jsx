/**
 * @file EKLMNumerator.jsx
 * @author Vitaly Shutikov <vetl1489@gmail.com>
 * @version 1.9.2
 * @description Adobe InDesign Script. Нумерация абзацев буквами русского алфавита.
 */

#target indesign;
#targetengine "eklmn";

var Script = {
  NAME: "EKLMNumerator",
  VERSION: "v. 1.9.2",
  AUTHOR: "© vetl1489",
  CONFIG_FILE: "EKLMNumerator.conf",
};

var SCRIPT_HEADER = Script.NAME + ", " + Script.VERSION + " | " + Script.AUTHOR;

// Выходим, если старый InDesign
if (parseInt(app.version, 10) < 6) {
  alert("Скрипт для InDesign CS4+", SCRIPT_HEADER, true);
  exit();
}
// Выходим если нет открытых документов
if (app.documents.length === 0) {
  alert("Откройте хотя бы один документ InDesign.", SCRIPT_HEADER);
  exit();
}

var startDocument = app.activeDocument;

// Массив букв для нумерации
var LETTER_LIST = ["а", "б", "в", "г", "д", "е", "ё", "ж", "з", "и", "й", "к", "л", "м", "н", "о", "п", "р", "с", "т", "у", "ф", "х", "ц", "ч", "ш", "щ", "ъ", "ы", "ь", "э", "ю", "я"];

// Конфигурация по умолчанию
var DEFAULT_CONFIG = {
  startLetter: 0,  // индекс в LETTER_LIST
  isSkipLetters: false,
  skipLetters: encodeURI("ё,й,ъ,ь"),
  isTabBefore: false,
  isCapital: false,
  dividerAfter: encodeURI(")^t"),  // поддерживаются InDesign-коды ^t, ^p и т.д.
  lastDocument: encodeURI(getDocName(startDocument)),
  applyCharacterStyle: 0,  // индекс в DDL стилей
  windowLocation: null
};

// Считываем конфиг
var configFile = new File(getScriptFolder() + "/" + Script.CONFIG_FILE);
var config = loadConfig(configFile);


/**
 * =======================================
 * Интерфейс
 */

/**
 * Объект интерфейса
 */
function UI(document, windowHeader) {
  this.document = document;
  this.windowHeader = windowHeader;
}

/**
 * Создаёт окно и элементы UI
 */
UI.prototype._init = function () {
  var UI_CONSTS = {
    WINDOW_WIDTH: 250,
    BASE_MARGIN: 10,
    BASE_SPACING: 10,
    EDIT_TEXT_HEIGHT: 20,
    CHECK_HEIGHT: 15
  };

  // Window
  this.window = new Window("palette", this.windowHeader);
  this.window.preferredSize.width = UI_CONSTS.WINDOW_WIDTH;
  this.window.orientation = "column";
  this.window.alignChildren = ["center", "top"];
  this.window.spacing = UI_CONSTS.BASE_SPACING;
  this.window.margins = UI_CONSTS.BASE_MARGIN;

  // Панель "Нумерация"
  var _numPanel = this.window.add("panel", undefined, "Нумерация");
  _numPanel.orientation = "column";
  _numPanel.alignChildren = ["left", "top"];
  _numPanel.spacing = UI_CONSTS.BASE_SPACING;
  _numPanel.margins = UI_CONSTS.BASE_MARGIN;
  _numPanel.alignment = "fill";

  // _startGroup. Начать список с буквы
  var _startGroup = _numPanel.add("group");
  _startGroup.orientation = "row";
  _startGroup.alignChildren = ["right", "center"];

  var _startString = _startGroup.add("statictext", undefined, "Начать список с");
  _startString.preferredSize.width = 125;
  _startString.justify = "right";

  // Выбор стартовой буквы для нумерации
  this.letterListDDL = _startGroup.add("dropdownlist");
  this.letterListDDL.preferredSize = [60, UI_CONSTS.EDIT_TEXT_HEIGHT];

  // _startGroup. Исключить буквы
  var _skipGroup = _numPanel.add("group");
  _skipGroup.orientation = "row";
  _skipGroup.alignChildren = ["left", "bottom"];

  // Чекбокс, включающий удаление букв
  this.skipLettersCB = _skipGroup.add("checkbox", undefined, "Пропустить буквы");
  this.skipLettersCB.preferredSize.height = UI_CONSTS.CHECK_HEIGHT + 4;

  // Буквы для исключения, через пробел или запятую
  this.skipLettersET = _skipGroup.add("edittext");
  this.skipLettersET.preferredSize = [76, UI_CONSTS.EDIT_TEXT_HEIGHT + 2];

  // Панель "Вид"
  var _viewPanel = this.window.add("panel", undefined, "Вид");
  _viewPanel.orientation = "column";
  _viewPanel.alignChildren = ["left", "top"];
  _viewPanel.spacing = UI_CONSTS.BASE_SPACING;
  _viewPanel.margins = UI_CONSTS.BASE_MARGIN;
  _viewPanel.margins.top = UI_CONSTS.BASE_MARGIN + 5;
  _viewPanel.alignment = ["fill", "top"];

  // Чекбокс "Tab перед нумерацией"
  this.tabBeforeCB = _viewPanel.add("checkbox", undefined, "Tab в начале");
  this.tabBeforeCB.preferredSize.height = UI_CONSTS.CHECK_HEIGHT;

  // Чекбокс "Нумерация ЗАГЛАВНЫМИ"
  this.capitalLettersCB = _viewPanel.add("checkbox", undefined, "Нумерация ЗАГЛАВНЫМИ");
  this.capitalLettersCB.preferredSize.height = UI_CONSTS.CHECK_HEIGHT;

  // _divGroup. Отбить от текста
  var _divGroup = _viewPanel.add("group");
  _divGroup.orientation = "row";
  _divGroup.alignChildren = ["left", "center"];
  _divGroup.spacing = UI_CONSTS.BASE_SPACING;
  _divGroup.margins = 0;
  _divGroup.alignment = ["fill", "top"];

  var _tabString = _divGroup.add("statictext", undefined, "Отбить от текста");
  _tabString.alignment = ["left", "fill"];

  // Поле ввода отбивки нумерации от текста
  this.textDividerET = _divGroup.add("edittext");
  this.textDividerET.preferredSize.width = 97;
  this.textDividerET.alignment = ["left", "center"];

  // Кнопка "Сбросить" отбивку на значение по умолчанию
  this.resetTabButton = _viewPanel.add("button", undefined, "Сбросить");
  this.resetTabButton.alignment = ["right", "top"];

  // Стиль символа
  _viewPanel.add("statictext", undefined, "Применить стиль символа");
  this.characterStyleDDL = _viewPanel.add("dropdownlist");
  this.characterStyleDDL.alignment = ["fill", "top"];
  this.characterStyleDDL.maximumSize.width = UI_CONSTS.WINDOW_WIDTH - 40;

  // _group4. Кнопки "ОК" и "Отмена"
  var _buttonGroup = this.window.add("group");
  _buttonGroup.orientation = "row";
  _buttonGroup.alignChildren = ["right", "center"];
  _buttonGroup.spacing = UI_CONSTS.BASE_SPACING;
  _buttonGroup.alignment = ["fill", "top"];

  this.okButton = _buttonGroup.add("button", undefined, "ОК", { name: "ok" });
  this.cancelButton = _buttonGroup.add("button", undefined, "Отмена", { name: "cancel" });
};

/**
 * Заполняет UI данными из конфига и списка стилей
 * @param {Object} config - объект конфигурации
 * @param {Array<{name: string, id: number}>} characterStylesList - список стилей
 */
UI.prototype._populate = function (config, characterStylesList) {
  if (config.windowLocation) this.window.location = config.windowLocation;
  else this.window.center();

  // Заполняем список буквами
  for (var i = 0; i < LETTER_LIST.length; i++) {
    this.letterListDDL.add("item", LETTER_LIST[i]);
  }
  this.letterListDDL.selection = config.startLetter;

  this.skipLettersCB.value = config.isSkipLetters;
  this.skipLettersET.text = decodeURI(config.skipLetters);
  this.skipLettersET.enabled = this.skipLettersCB.value;

  this.tabBeforeCB.value = config.isTabBefore;
  this.capitalLettersCB.value = config.isCapital;

  this.textDividerET.text = decodeURI(config.dividerAfter);

  // Записываем стили в выпадающий список
  for (i = 0; i < characterStylesList.length; i++) {
    this.characterStyleDDL.add("item", characterStylesList[i].name);
  }
  this.characterStyleDDL.selection = 0;
  // Если новый документ, выбираем [Без стиля]
  if (decodeURI(config.lastDocument) === getDocName(startDocument)
    && characterStylesList.length - 1 >= config.applyCharacterStyle) {
    this.characterStyleDDL.selection = config.applyCharacterStyle;
  }
}

/**
 * Обновляет выпадающий список стилей
 * @param {Array<{name: string, id: number}>} characterStylesList - новый список стилей
 */
UI.prototype.updateStyles = function (characterStylesList) {
  this.characterStyleDDL.removeAll();
  for (var i = 0; i < characterStylesList.length; i++) {
    this.characterStyleDDL.add("item", characterStylesList[i].name);
  }
  this.characterStyleDDL.selection = 0;
}

/**
 * Отображает окно
 */
UI.prototype.show = function () {
  this.window.show();
}

/**
 * Собирает настройки интерфейса
 * @return {Object} объект конфигурации
 */
UI.prototype.getActualConfig = function () {
  var currentDoc = app.activeDocument;
  return {
    startLetter: this.letterListDDL.selection.index,
    isSkipLetters: this.skipLettersCB.value,
    skipLetters: encodeURI(this.skipLettersET.text),
    isTabBefore: this.tabBeforeCB.value,
    isCapital: this.capitalLettersCB.value,
    dividerAfter: encodeURI(this.textDividerET.text),
    lastDocument: encodeURI(getDocName(currentDoc)),
    applyCharacterStyle: this.characterStyleDDL.selection.index,
    windowLocation: [this.window.location[0], this.window.location[1]]
  }
}

// Запускам окно
var characterStylesList = getCharacterStyles(startDocument);
var ui = new UI(app.activeDocument, SCRIPT_HEADER);
ui._init();
ui._populate(config, characterStylesList);
ui.show();


/**
 * =======================================
 * События
 */

/**
 * Чекбокс "Пропустить буквы" - включает/отключает поле ввода исключаемых букв
 */
ui.skipLettersCB.onClick = function () {
  ui.skipLettersET.enabled = ui.skipLettersCB.value;
};
/**
 * Кнопка "Сбросить" - устанавливает значение по умолчанию для поля "Отбить от текста"
 */
ui.resetTabButton.onClick = function () {
  ui.textDividerET.text = decodeURI(DEFAULT_CONFIG.dividerAfter);
}
/**
 * Кнопка "Отмена" - закрывает окно скрипта
 */
ui.cancelButton.onClick = function () {
  ui.window.close();
};

/**
 * Кнопка "ОК" - применяет нумерацию к выделенным абзацам
 */
ui.okButton.onClick = function () {
  // main();
  app.doScript(main, ScriptLanguage.JAVASCRIPT, [], UndoModes.FAST_ENTIRE_SCRIPT, Script.NAME);
  // Исключение, если нет открытых документов
  try {
    app.documents[0].select(NothingEnum.nothing);
  } catch(e) {}
};

/**
 * Сохраняет настройки в файл конфигурации при закрытии окна
 */
ui.window.onClose = function () {
  // Исключение, если нет открытых документов 
  try {
    saveConfig(configFile, ui.getActualConfig());
  } catch (e) {}
}


/**
 * =======================================
 * Функции
 */

/**
 * Основная функция: проверяет выделение, применяет нумерацию.
 */
function main() {
  if (app.documents.length === 0) {
    alert("Откройте хотя бы один документ InDesign.", SCRIPT_HEADER, true);
    return;
  }

  var uiData = ui.getActualConfig();
  var currentDocument = app.activeDocument;

  // Перечитываем стили, если другой документ стал активным
  if (getDocName(currentDocument) !== getDocName(startDocument)) {
    startDocument = currentDocument;
    characterStylesList = getCharacterStyles(currentDocument);
    ui.updateStyles(characterStylesList);
    alert("Активен другой документ.\nСписок стилей символов обновлен.", SCRIPT_HEADER);
    return;
  }

  // Актуальный список букв для нумерации
  var actualNumberingList = LETTER_LIST.slice(uiData.startLetter);
  if (uiData.isSkipLetters) {
    var skipLetters = decodeURI(uiData.skipLetters).toLowerCase().split(/[,.\s]+/);
    actualNumberingList = buildNumberingList(actualNumberingList, skipLetters);
  }

  // Проверяем выделение
  if (app.selection.length === 0) {
    alert("Выделите абзацы для нумерации.", SCRIPT_HEADER);
    return;
  }
  switch (app.selection[0].constructor.name) {
    case "InsertionPoint":
    case "Paragraph":
    case "Character":
    case "Story":
    case "Text":
    case "Line":
    case "TextColumn":
    case "Word":
    case "TextStyleRange":
      var selectParagraphs = currentDocument.selection[0].paragraphs;
      break;
    default:
      alert("Выделите абзацы для нумерации.", SCRIPT_HEADER);
      return;
  }

  // Предупреждение, если количество выделенных абзацев
  // больше количества зарезервированных букв
  if (selectParagraphs.length > actualNumberingList.length) {
    alert("Невозможно применить нумерацию!\nВыделенных абзацев: " +
    selectParagraphs.length + "\nБукв для нумерации: " +
      actualNumberingList.length, SCRIPT_HEADER, true);
    return;
  }

  // Получаем выбранный стиль
  var selectStyleID = characterStylesList[uiData.applyCharacterStyle].id;
  var selectStyle = currentDocument.characterStyles.itemByID(selectStyleID);

  // Если стиль был удален во время работы, предупреждаем, обновляем список стилей
  if (!selectStyle.isValid) {
    var missingStyleName = characterStylesList[uiData.applyCharacterStyle].name;
    characterStylesList = getCharacterStyles(currentDocument);
    ui.updateStyles(characterStylesList);
    alert("Выбранный стиль символа \"" + missingStyleName + "\" отсутствует!\nСписок стилей символов обновлен.", SCRIPT_HEADER, true);
    return;
  }

  // Применяем нумерацию 
  applyNumbering(selectParagraphs, actualNumberingList, selectStyle, uiData);
}

/**
 * Применяет нумерацию к абзацам
 * @param {Paragraphs} selectParagraphs - массив абзацев для обработки
 * @param {Array<String>} numberingList - массив букв для нумерации
 * @param {CharacterStyle} characterStyle - стиль символа для нумерации
 * @param {Object} config - конфиг с данными из интерфейса
 */
function applyNumbering(selectParagraphs, numberingList, characterStyle, config) {
  // Табуляция перед "нумерацией"
  var tabBeforeText = "";
  var tabBeforeJS = "";
  if (config.isTabBefore) {
    tabBeforeText = "^t";
    tabBeforeJS = "\t";
  }
  // "Соль" для поиска
  var SaltJS = "\u200A\u200A\u2006\u2006\u200A";
  var SaltIND = "^|^|^%^%^|";

  // Отбивка после "нумерации"
  var dividerAfter = decodeURI(config.dividerAfter);

  app.findTextPreferences = app.changeTextPreferences = NothingEnum.nothing;
  // Основной цикл
  for (var i = (selectParagraphs.length - 1); i >= 0; i--) {
    var currentLetter = config.isCapital ? numberingList[i].toUpperCase() : numberingList[i];
    selectParagraphs[i].insertionPoints[0].contents = SaltJS + tabBeforeJS + currentLetter;
    app.findTextPreferences.findWhat = SaltIND + tabBeforeText + currentLetter;
    app.changeTextPreferences.changeTo = tabBeforeText + currentLetter + dividerAfter;
    app.changeTextPreferences.appliedCharacterStyle = characterStyle;
    selectParagraphs[i].changeText();
  }
  app.findTextPreferences = app.changeTextPreferences = NothingEnum.nothing;
}

/**
 * Генерирует список букв с исключениями
 * @param {Array<string>} defaultNumberingList - исходный список букв
 * @param {Array<string>} ignoreLetters - массив букв для исключения
 * @return {Array<string>} массив букв для нумерации
 */
function buildNumberingList(defaultNumberingList, ignoreLetters) {
  var result = [];

  var ignoreTable = {};
  for (var i = 0; i < ignoreLetters.length; i++) {
    if (!ignoreLetters[i]) continue;
    ignoreTable[ignoreLetters[i]] = true;
  }
  for (var i = 0; i < defaultNumberingList.length; i++) {
    if (!ignoreTable[defaultNumberingList[i]]) {
      result.push(defaultNumberingList[i]);
    }
  }
  return result;
}

/**
 * Получает имя документа, в зависимости от того сохранен он или нет 
 * @param {Document} document - документ
 * @return {string} имя документа
 */
function getDocName(document) {
  return document.saved ? document.fullName.fullName : document.name; 
}

/**
 * Проверяет валидность конфигурации (типы и диапазоны)
 * @param {Object} config - загруженная конфигурация
 * @return {boolean} true - если валиден
 */
function checkConfig(config) {
  try {
    // исключение, если объект некорректный
    for (var key in DEFAULT_CONFIG) {
      if (!config.hasOwnProperty(key)) return false;
    }
  }
  catch (error) {
    return false;
  }

  if (typeof config.startLetter !== "number"
    || config.startLetter < 0 || config.startLetter >= LETTER_LIST.length
    || typeof config.isSkipLetters !== "boolean"
    || typeof config.skipLetters !== "string"
    || typeof config.isTabBefore !== "boolean"
    || typeof config.isCapital !== "boolean"
    || typeof config.dividerAfter !== "string"
    || typeof config.lastDocument !== "string"
    || typeof config.applyCharacterStyle !== "number"
  ) return false;
  return true;
}

/**
 * Сохраняет файл конфигурации
 * @param {File} file - `.conf` файл конфигурации
 * @param {Object} config - объект конфигурации
 */
function saveConfig(file, config) {
  if (config === undefined || !file.exists) {
    saveFile(file, DEFAULT_CONFIG.toSource());
  } else {
    saveFile(file, config.toSource());
  }
}

/**
 * Загружает конфигурационный файл
 * @param {File} file - `.conf` файл конфигурации
 * @return {Object} объект конфигурации
 */
function loadConfig(file) {
  var config;

  if (!file.exists) {
    saveConfig(file);
    config = DEFAULT_CONFIG;
  } 
  else {
    file.open("r");
    config = eval(file.read());
    file.close();

    if (!checkConfig(config)) {
      config = DEFAULT_CONFIG;
      saveConfig(file);
    }
  }
  return config;
}

/**
 * Сохраняет файл
 * @param {File} file - сохраняемый файл
 * @param {string} content - содержимое файла
 */
function saveFile(file, content) {
  file.open("w");
  file.write(content);
  file.close();
}

/**
 * Получает путь к папке, где расположен скрипт
 * @return {string} путь к папке в виде строки
 */
function getScriptFolder() {
  try {
    // При запуске в отладчике, возникает исключение
    return app.activeScript.path;
  }
  catch (error) {
    return File(error.fileName).path;
  }
}

/**
 * Рекурсивное получение списка стилей символов
 * @param {CharacterStyleGroup} parentFolder - родительская папка со стилями (весь документ)
 * @param {string} parentFolderName - строка с именами всех родительских папок
 * @return {Array<Object>} массив c объектами {name:style_name, id:style_id}
 */
function getCharacterStyles(parentFolder, parentFolderName) {
  var stylesArray = [];
  var allParentFolderName = parentFolderName !== undefined ? parentFolderName : "";
  if (parentFolder.constructor.name !== "Document") {
    allParentFolderName += parentFolder.name + " > ";
  }

  var numOfCharacterStyles = parentFolder.characterStyles.length;
  for (var i = 0; i < numOfCharacterStyles; i++) {
    var currentStyle = parentFolder.characterStyles[i];
    stylesArray.push({
      name: allParentFolderName + currentStyle.name,
      id: currentStyle.id
    });
  }

  var subFolders = parentFolder.characterStyleGroups;
  var numOfSubFolders = subFolders.length;
  for (var i = 0; i < numOfSubFolders; i++) {
    stylesArray = stylesArray.concat(
      getCharacterStyles(subFolders[i], allParentFolderName)
    );
  }
  return stylesArray;
}
