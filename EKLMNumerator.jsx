// EKLMNumerator, v.1.7
// © vetl1489, Vitaly Shutikov
// vetl1489@gmail.com
// Adobe InDesign Script. Нумерация буквами русского алфавита.

#targetengine "eklmn";

var scriptName = "EKLMNumerator";
var scriptVersion = "v. 1.7";
var scriptAuthor = "© vetl1489";
var configFileName = scriptName + ".conf";

// Конфигурация по умолчанию
var defaultConfig = {
  startChar: 0,
  isCutChar: false,
  cutChars: encodeURI("ё,й,ъ,ь"),
  isTabBefore: false,
  dividerAfter: encodeURI(")^t"),
  lastDocument: encodeURI(app.activeDocument.name),
  applyCharacterStyle: 0,
  windowLocation: null
};

// массив букв
var letterList = ["а", "б", "в", "г", "д", "е", "ё", "ж", "з", "и", "й", "к", "л", "м", "н", "о", "п", "р", "с", "т", "у", "ф", "х", "ц", "ч", "ш", "щ", "ъ", "ы", "ь", "э", "ю", "я"];

// Выходим, если не можем работать
if (parseInt(app.version, 10) < 6) {
  alert("Скрипт для InDesign CS4 и старших версий.", scriptName + ", " + scriptVersion, true);
  exit();
}
if (app.documents.length === 0) exit();

// Считываем конфиг
var configFile = new File(app.activeScript.path + "/" + configFileName);
if (!configFile.exists) {
  saveConfig(configFile);
  var config = defaultConfig;
} else {
  var config = readConfig(configFile);
}

// Формируем интерфейс
var ui = new Window("palette", scriptName + ", " + scriptVersion + " | " + scriptAuthor, [0, 0, 250, 340]);

var numPanel = ui.add("panel", [10, 10, 240, 92], "Нумерация");
var myS1 = numPanel.add("statictext", [10, 15, 130, 30], "Начать список с");
myS1.justify = "right";
var charList = numPanel.add("dropdownlist", [140, 10, 195, 32], undefined);
var delChar = numPanel.add("checkbox", [10, 40, 135, 55], "Пропустить буквы");
delChar.value = config.isCutChar;
var deleteChars = numPanel.add("edittext", [140, 37, 215, 59], undefined);
deleteChars.text = decodeURI(config.cutChars);

var viewPanel = ui.add("panel", [10, 100, 240, 275], "Вид");
var tabBefore = viewPanel.add("checkbox", [10, 15, 200, 30], "Tab в начале");
tabBefore.value = config.isTabBefore;
viewPanel.add("statictext", [10, 40, 120, 55], "Отбить от текста");
var textDivider = viewPanel.add("edittext", [120, 38, 215, 58], undefined);
textDivider.text = decodeURI(config.dividerAfter);
var resetTab = viewPanel.add("button", [130, 67, 205, 90], "Сбросить");
viewPanel.add("statictext", [10, 108, 165, 123], "Применить стиль символа");
var characterStyleDropList = viewPanel.add("dropdownlist", [10, 130, 215, 150], undefined);

var okButton = ui.add("button", [85, 300, 155, 325], "OK", { name: "ok" });
var cancelButton = ui.add("button", [170, 300, 235, 325], "Отмена", { name: "cancel" });
if (config.windowLocation) ui.location = config.windowLocation;
else ui.center();

// заполняем список буквами
for (var i = 0; i < letterList.length; i++) {
  charList.add("item", letterList[i]);
}
charList.selection = config.startChar;

// Стили и группы стилей символов
var currentDocument = app.activeDocument;
var characterStyles = currentDocument.characterStyles;
var characterStyleGroups = currentDocument.characterStyleGroups;

// Таблица стилей [{name, id}]
var characterStylesList = getCharacterStyles(currentDocument);

// записываем их в выпадающий список
for (i = 0; i < characterStylesList.length; i++) {
  characterStyleDropList.add("item", characterStylesList[i].name);
}
// Если новый документ, выбираем [Без стиля]
if (decodeURI(config.lastDocument) === app.activeDocument.name) {
  characterStyleDropList.selection = config.applyCharacterStyle;
} else {
  characterStyleDropList.selection = 0;
}

ui.show();


/**
 * События
 */
// Кнопка Сбросить
resetTab.onClick = function () {
  textDivider.text = ")^t";
};
// Кнопка ОК
okButton.onClick = function () {
  // main();
  app.doScript(main, ScriptLanguage.JAVASCRIPT, [], UndoModes.FAST_ENTIRE_SCRIPT, scriptName);
};
// Кнопка Отмена
cancelButton.onClick = function () {
  ui.close();
};
// Закрыть окно
ui.onClose = function () {
  // сохраняем текущее состояние
  saveConfig(configFile, {
    startChar: charList.selection.index,
    isCutChar: delChar.value,
    cutChars: encodeURI(deleteChars.text),
    isTabBefore: tabBefore.value,
    dividerAfter: encodeURI(textDivider.text),
    lastDocument: encodeURI(app.activeDocument.name),
    applyCharacterStyle: characterStyleDropList.selection.index,
    windowLocation: [ui.location[0], ui.location[1]]
  });
}

/**
 * Главная функция.
 */
function main() {
  // получаем выбранный стиль
  var selectCharacterStyle = currentDocument.characterStyles.itemByID(characterStylesList[characterStyleDropList.selection.index].id);

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
    alert("Выделите абзацы для нумерации.", scriptName, true);
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
      var selectParagraphs = currentDocument.selection[0].paragraphs;
      break;
    default:
      alert("Выделите абзацы для нумерации.", scriptName, true);
      exit();
  }

  // предупреждение, если количество выделенных абзацев больше
  // количества зарезервированных букв
  if (selectParagraphs.length > numCharList.length) {
    alert("Невозможно обработать!\nВыделенных абзацев: " + 
    selectParagraphs.length + "\nБукв в списке: " + 
    numCharList.length, scriptName + ", " + scriptVersion, true);
    exit();
  }

  // сбрасываем поиск по тексту
  app.findTextPreferences = app.changeTextPreferences = NothingEnum.nothing;
  
  // основной цикл
  for (i = (selectParagraphs.length - 1); i >= 0; i--) {
    selectParagraphs[i].insertionPoints[0].contents = "\u200A\u200A" + tabBeforeJS + numCharList[i];
    app.findTextPreferences.findWhat = "^|^|" + tabBeforeText + numCharList[i];
    app.changeTextPreferences.changeTo = tabBeforeText + numCharList[i] + textDividerAfter;
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
  configFile.open("r");
  var lastConfig = eval(configFile.read());
  configFile.close();
  
  if (newConfig === undefined) {
    file.open("w");
    file.write(defaultConfig.toSource());
    file.close();
  } else if (newConfig.toSource() !== lastConfig.toSource()) {
    file.open("w");
    file.write(newConfig.toSource());
    file.close();
  }
}

/**
 * Читаем файл конфигурации.
 * @param {File} file - файл конфигурации.
 * @return {Object} конфигурация. 
 */
function readConfig(file) {
  file.open("r");
  var read = eval(file.read());
  file.close();

  if (typeof defaultConfig !== "object" ||
    !(read.hasOwnProperty("startChar") &&
    read.hasOwnProperty("windowLocation"))) {
    read = defaultConfig;
    saveConfig(file);
  }
  return read;
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
