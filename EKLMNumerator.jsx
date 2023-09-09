// EKLMNumerator, v.1.8.1
// © vetl1489, Vitaly Shutikov
// vetl1489@gmail.com
// Adobe InDesign Script. Нумерация абзацев буквами русского алфавита.

#targetengine "eklmn";

var Script = {
  NAME: "EKLMNumerator",
  VERSION: "v. 1.8",
  AUTHOR: "© vetl1489",
  CONFIG_FILE: "EKLMNumerator.conf",
};

var headerString = Script.NAME + ", " + Script.VERSION + " | " + Script.AUTHOR;

// Размеры UI
var UI = {
  WINDOW_WIDTH: 250,
  BASE_MARGIN: 10,
  BASE_SPACING: 10,
  EDIT_TEXT_HEIGHT: 20,
  CHECK_HEIGHT: 15
};

// Конфигурация по умолчанию
var defaultConfig = {
  startChar: 0,
  isCutChar: false,
  cutChars: encodeURI("ё,й,ъ,ь"),
  isTabBefore: false,
  isCapital: false,
  dividerAfter: encodeURI(")^t"),
  lastDocument: encodeURI(app.activeDocument.name),
  applyCharacterStyle: 0,
  windowLocation: null
};

// массив букв
var letterList = ["а", "б", "в", "г", "д", "е", "ё", "ж", "з", "и", "й", "к", "л", "м", "н", "о", "п", "р", "с", "т", "у", "ф", "х", "ц", "ч", "ш", "щ", "ъ", "ы", "ь", "э", "ю", "я"];

// Выходим, если старый InDesign
if (parseInt(app.version, 10) < 6) {
  alert("Скрипт для InDesign CS4 и старших версий.", headerString, true);
  exit();
}
if (app.documents.length === 0) exit();

// Считываем конфиг
var configFile = new File(getScriptFolder() + "/" + Script.CONFIG_FILE);
if (!configFile.exists) {
  saveConfig(configFile);
  var config = defaultConfig;
} else {
  var config = readConfig(configFile);
}

/**
 * =======================================
 * Формируем интерфейс
 */
// Window
var window = new Window("palette", headerString);
window.preferredSize.width = UI.WINDOW_WIDTH;
window.orientation = "column";
window.alignChildren = ["center", "top"];
window.spacing = UI.BASE_SPACING;
window.margins = UI.BASE_MARGIN;

// NumPanel - панель "Нумерация"
var numPanel = window.add("panel", undefined, "Нумерация");
numPanel.orientation = "column";
numPanel.alignChildren = ["left", "top"];
numPanel.spacing = UI.BASE_SPACING;;
numPanel.margins = UI.BASE_MARGIN;
numPanel.alignment = "fill";

// Group1. Начать список с буквы
var group1 = numPanel.add("group", undefined, { name: "group1" });
group1.orientation = "row";
group1.alignChildren = ["right", "center"];

var startString = group1.add("statictext", undefined, "Начать список с");
startString.preferredSize.width = 125;
startString.justify = "right";

// Список букв для нумерации
var charList = group1.add("dropdownlist", undefined, undefined);
charList.preferredSize = [60, UI.EDIT_TEXT_HEIGHT];

// Group2. Пропустить буквы
var group2 = numPanel.add("group", undefined);
group2.orientation = "row";
group2.alignChildren = ["left", "bottom"];

// Чекбокс, включающий удаление букв
var delChar = group2.add("checkbox", undefined, "Пропустить буквы");
delChar.preferredSize.height = UI.CHECK_HEIGHT + 4;
delChar.value = config.isCutChar;

// Буквы для удаления, через пробел или запятую
var deleteChars = group2.add("edittext");
deleteChars.preferredSize = [76, UI.EDIT_TEXT_HEIGHT + 2];
deleteChars.text = decodeURI(config.cutChars);

// ViewPanel - панель "Вид"
var viewPanel = window.add("panel", undefined, "Вид");
viewPanel.orientation = "column";
viewPanel.alignChildren = ["left", "top"];
viewPanel.spacing = UI.BASE_SPACING;
viewPanel.margins = UI.BASE_MARGIN;
viewPanel.margins.top = UI.BASE_MARGIN + 5;
viewPanel.alignment = ["fill", "top"];

// Чекбокс ставящий перед нумерацией Tab
var tabBefore = viewPanel.add("checkbox", undefined, "Tab в начале");
tabBefore.preferredSize.height = UI.CHECK_HEIGHT;
tabBefore.value = config.isTabBefore;

// Чекбокс, включающий нумерацию заглавными буквами
var capitalLetters = viewPanel.add("checkbox", undefined, "Нумерация ЗАГЛАВНЫМИ");
capitalLetters.preferredSize.height = UI.CHECK_HEIGHT;
capitalLetters.value = config.isCapital;

// Group3. Отбить от текста
var group3 = viewPanel.add("group");
group3.orientation = "row";
group3.alignChildren = ["left", "center"];
group3.spacing = UI.BASE_SPACING;
group3.margins = 0;
group3.alignment = ["fill", "top"];

var tabString = group3.add("statictext", undefined, "Отбить от текста");
tabString.alignment = ["left", "fill"];

// Поле для ввода отбивки нумерации от текста
var textDivider = group3.add("edittext");
textDivider.preferredSize.width = 97;
textDivider.alignment = ["left", "center"];
textDivider.text = decodeURI(config.dividerAfter);

// Кнопка "Сбросить" отбивку  на значение по умолчанию 
var resetTab = viewPanel.add("button", undefined, "Сбросить");
resetTab.text = "Сбросить";
resetTab.alignment = ["right", "top"];

viewPanel.add("statictext", undefined, "Применить стиль символа");

// Выпадающий список со стилями стилей символов для нумерации
var characterStyleDropList = viewPanel.add("dropdownlist");
characterStyleDropList.alignment = ["fill", "top"];

// Group4. Кнопки "ОК" и "Отмена"
var group4 = window.add("group");
group4.orientation = "row";
group4.alignChildren = ["right", "center"];
group4.spacing = UI.BASE_SPACING;
group4.alignment = ["fill", "top"];

// Кнопка "ОК" - применить нумерацию к выделенному тексту
var okButton = group4.add("button", undefined, "ОК", { name: "ok" });
// Кнопка "Отмена" - закрывающая окно скрипта
var cancelButton = group4.add("button", undefined, "Отмена", { name: "cancel" });

// Устанавливаем положение окна скрипта
if (config.windowLocation) window.location = config.windowLocation;
else window.center();

// заполняем список буквами
for (var i = 0; i < letterList.length; i++) {
  charList.add("item", letterList[i]);
}
charList.selection = config.startChar;

var currentDocument = app.activeDocument;
// Список стилей [{name, id}]
var characterStylesList = getCharacterStyles(currentDocument);

// записываем их в выпадающий список
for (i = 0; i < characterStylesList.length; i++) {
  characterStyleDropList.add("item", characterStylesList[i].name);
}
// Если новый документ, выбираем [Без стиля]
if (decodeURI(config.lastDocument) === currentDocument.name) {
  characterStyleDropList.selection = config.applyCharacterStyle;
} else {
  characterStyleDropList.selection = 0;
}
// Показываем окно скрипта
window.show();


/**
 * =======================================
 * События
 */

/**
 * Кнопка "Сбросить".
 * Устанавливаем значение по умолчанию для поля "Отбить от текста".
 */
resetTab.onClick = function () {
  textDivider.text = ")^t";
};

/**
 * Кнопка "ОК".
 * Применяем нумерацию к выделенным абзацам.
 */
okButton.onClick = function () {
  // main();
  app.doScript(main, ScriptLanguage.JAVASCRIPT, [], UndoModes.FAST_ENTIRE_SCRIPT, Script.NAME);
  app.documents[0].select(NothingEnum.nothing);
};

/**
 * Кнопка "Отмена".
 * Закрываем окно скрипта.
 */
cancelButton.onClick = function () {
  window.close();
};

/**
 * Закрытие окна скрипта.
 * Сохраняем настройки в файл конфигурации при закрытии скрипта.
 */
window.onClose = function () {
  // сохраняем текущее состояние
  saveConfig(configFile, {
    startChar: charList.selection.index,
    isCutChar: delChar.value,
    cutChars: encodeURI(deleteChars.text),
    isTabBefore: tabBefore.value,
    isCapital: capitalLetters.value,
    dividerAfter: encodeURI(textDivider.text),
    lastDocument: encodeURI(app.activeDocument.name),
    applyCharacterStyle: characterStyleDropList.selection.index,
    windowLocation: [window.location[0], window.location[1]]
  });
}


/**
 * =======================================
 * Функции
 */

/**
 * Главная функция.
 */
function main() {
  // получаем выбранный стиль
  var selectStyleID = characterStylesList[characterStyleDropList.selection.index].id;
  var selectCharacterStyle = currentDocument.characterStyles.itemByID(selectStyleID);

  // рабочий массив с буквами
  numCharList = letterList.slice(charList.selection.index);

  // массив со знаками удаления
  if (delChar.value) {
    // создаем новый массив из символов введенных для исключения:
    var ignoreCharacters = deleteChars.text.toLowerCase().split(/(,(\s+)?)|(\.(\s+)?)|((\s+)?)/);
    // имена найденных удаляем из рабочего массива
    for (var i = 0; i < ignoreCharacters.length; i++) {
      for (var j = 0; j < numCharList.length; j++) {
        if (numCharList[j] === ignoreCharacters[i]) { numCharList.splice(j, 1); }
      }
    }
  }

  // табуляция перед "нумерацией"
  var tabBeforeText = "";
  var tabBeforeJS = "";
  if (tabBefore.value === true) {
    tabBeforeText = "^t";
    tabBeforeJS = "\t";
  }

  // табуляция после
  var textDividerAfter = decodeURI(textDivider.text);

  // проверяем выделение
  if (app.selection.length === 0) {
    alert("Выделите абзацы для нумерации.", headerString);
    exit();
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
      alert("Выделите абзацы для нумерации.", headerString);
      exit();
  }

  // предупреждение, если количество выделенных абзацев больше
  // количества зарезервированных букв
  if (selectParagraphs.length > numCharList.length) {
    alert("Невозможно применить нумерацию!\nВыделенных абзацев: " + 
    selectParagraphs.length + "\nБукв в списке: " + 
      numCharList.length, headerString, true);
    exit();
  }

  // сбрасываем поиск по тексту
  app.findTextPreferences = app.changeTextPreferences = NothingEnum.nothing;
  
  // основной цикл
  for (i = (selectParagraphs.length - 1); i >= 0; i--) {
    var currentLetter = capitalLetters.value ? numCharList[i].toUpperCase() : numCharList[i];
    selectParagraphs[i].insertionPoints[0].contents = "\u200A\u200A" + tabBeforeJS + currentLetter;
    app.findTextPreferences.findWhat = "^|^|" + tabBeforeText + currentLetter;
    app.changeTextPreferences.changeTo = tabBeforeText + currentLetter + textDividerAfter;
    app.changeTextPreferences.appliedCharacterStyle = selectCharacterStyle;
    currentDocument.selection[0].paragraphs[i].changeText();
  }
  app.findTextPreferences = app.changeTextPreferences = NothingEnum.nothing;
}

/**
 * Сохраняем файл конфигурации.
 * @param {File} file - файл конфигурации,
 * @param {Object} newConfig - объект конфигурации. 
 */
function saveConfig(file, newConfig) {
  if (newConfig === undefined) {
    saveFile(file, defaultConfig.toSource());
  } else {
    file.open("r");
    var lastConfig = eval(file.read());
    file.close();
    
    if (newConfig.toSource() !== lastConfig.toSource()) {
      saveFile(file, newConfig.toSource());
    }
  }
}

/**
 * Читаем файл конфигурации.
 * @param {File} file - файл конфигурации.
 * @return {Object} объект конфигурации. 
 */
function readConfig(file) {
  file.open("r");
  var read = eval(file.read());
  file.close();

  // элементарная проверка на валидность файла 
  if (typeof defaultConfig !== "object" ||
    !(read.hasOwnProperty("startChar") &&
    read.hasOwnProperty("windowLocation"))) {
    read = defaultConfig;
    saveConfig(file);
  }
  return read;
}

/**
 * Сохраняем файл.
 * @param {File} file - сохраняемый файл.
 * @param {String} content - текстовое содержимое файла.
 */
function saveFile(file, content) {
  file.open("w");
  file.write(content);
  file.close();
}

/**
 * Получаем путь к папке, где расположен скрипт, 
 * учитывая возможность запуска из ExtendScript Debugger.
 * @return {String} путь к папке в виде строки.
 */
function getScriptFolder() {
  try { 
    // при запуске в отладчике, возникает исключение 
    return app.activeScript.path; 
  }
  catch (error) {
    return File(error.fileName).path;
  }
}

/**
 * Рекурсивно получаем список стилей символов.
 * @param {CharacterStyleGroup} parentFolder - родительская папка со стилями (весь документ),
 * @param {parentFolderName} parentFolderName - строка с именами всех родительских папок.
 * @return {Array[Object]} массив c объектами {name:имя_стиля, id:ID_стиля}.
 */
function getCharacterStyles(parentFolder, parentFolderName) {
  var stylesArray = [];
  
  var numOfCharacterStyles = parentFolder.characterStyles.length;
  for (var i = 0; i < numOfCharacterStyles; i++) {
    var currentStyle = parentFolder.characterStyles[i];    
    
    var allParentFolderName = parentFolderName !== undefined ? parentFolderName : "";
    if (parentFolder.constructor.name !== "Document") {
      allParentFolderName += parentFolder.name + " > ";
    }
    
    var styleObject = {
      name: allParentFolderName + currentStyle.name,
      id: currentStyle.id
    };
    stylesArray.push(styleObject);
  }
  
  var subFolders = parentFolder.characterStyleGroups;
  var numOfSubFolders = subFolders.length;
  
  for (var i = 0; i < numOfSubFolders; i++) {
    var currentSubFolder = subFolders[i];
    var subStylesArray = getCharacterStyles(currentSubFolder, allParentFolderName);
    stylesArray = stylesArray.concat(subStylesArray);
  }
  return stylesArray;
}
