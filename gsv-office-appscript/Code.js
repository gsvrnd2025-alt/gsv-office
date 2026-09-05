function getOrCreateSpreadsheet() {
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss && ss.getName() === "GSV E-Office") {
      return ss;
    }
  } catch (e) {}

  var files = DriveApp.getFilesByName("GSV E-Office");
  if (files.hasNext()) {
    var file = files.next();
    return SpreadsheetApp.openById(file.getId());
  } else {
    ss = SpreadsheetApp.create("GSV E-Office");
    return ss;
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    // Format headers
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight("bold");
    range.setBackground("#f1f5f9");
    range.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  var data = getDatabase();
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var res = { success: false, message: "" };
  try {
    var postData = JSON.parse(e.postData.contents);
    var ss = getOrCreateSpreadsheet();

    if (postData.action === "sync") {
      if (postData.users) syncUsers(ss, postData.users);
      if (postData.departments) syncDepartments(ss, postData.departments);
      if (postData.roles) syncRoles(ss, postData.roles);
      if (postData.settings) syncSettings(ss, postData.settings);

      res.success = true;
      res.message = "Synchronization successful";
      res.data = getDatabase();
    } else {
      res.message = "Invalid action";
    }
  } catch (err) {
    res.message = err.toString();
  }

  return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
}

function getDatabase() {
  var ss = getOrCreateSpreadsheet();
  
  var usersHeaders = ["ID", "Employee ID", "Login ID", "Email", "Full Name", "Phone", "Designation", "Role ID", "Department ID", "Status", "Password Hash"];
  var deptsHeaders = ["ID", "Name", "Description", "Color"];
  var rolesHeaders = ["ID", "Name", "Description", "Color", "Level", "Is System"];
  var settingsHeaders = ["Key", "Value", "Category", "Description"];

  var usersSheet = getOrCreateSheet(ss, "Users", usersHeaders);
  var deptsSheet = getOrCreateSheet(ss, "Departments", deptsHeaders);
  var rolesSheet = getOrCreateSheet(ss, "Roles", rolesHeaders);
  var settingsSheet = getOrCreateSheet(ss, "Settings", settingsHeaders);

  return {
    users: readSheetData(usersSheet, usersHeaders),
    departments: readSheetData(deptsSheet, deptsHeaders),
    roles: readSheetData(rolesSheet, rolesHeaders),
    settings: readSheetData(settingsSheet, settingsHeaders)
  };
}

function readSheetData(sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var lastCol = sheet.getLastColumn();
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var data = [];

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var headerKey = toCamelCase(headers[j]);
      var cellVal = row[j];
      if (cellVal === undefined || cellVal === "") {
        obj[headerKey] = null;
      } else {
        obj[headerKey] = cellVal;
      }
    }
    data.push(obj);
  }
  return data;
}

function toCamelCase(str) {
  if (str === "Key" || str === "Value" || str === "Category" || str === "Description" || str === "Name" || str === "Color" || str === "Level") {
    return str.toLowerCase();
  }
  return str.replace(/[^a-zA-Z0-9 ]/g, "").split(" ").map(function(word, idx) {
    if (idx === 0) return word.toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join("");
}

function syncUsers(ss, users) {
  var headers = ["ID", "Employee ID", "Login ID", "Email", "Full Name", "Phone", "Designation", "Role ID", "Department ID", "Status", "Password Hash"];
  var sheet = getOrCreateSheet(ss, "Users", headers);
  var lastRow = sheet.getLastRow();
  var ids = [];
  var idToRow = {};

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      var id = values[i][0];
      ids.push(id);
      idToRow[id] = i + 2; // Row number (1-indexed, header is row 1)
    }
  }

  for (var k = 0; k < users.length; k++) {
    var u = users[k];
    var rowData = [
      u.id,
      u.employeeId || "",
      u.loginId || "",
      u.email || "",
      u.fullName || "",
      u.phone || "",
      u.designation || "",
      u.roleId || "",
      u.departmentId || "",
      u.status || "active",
      u.passwordHash || ""
    ];

    if (idToRow[u.id]) {
      var rowNum = idToRow[u.id];
      sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      idToRow[u.id] = sheet.getLastRow();
    }
  }
}

function syncDepartments(ss, depts) {
  var headers = ["ID", "Name", "Description", "Color"];
  var sheet = getOrCreateSheet(ss, "Departments", headers);
  var lastRow = sheet.getLastRow();
  var idToRow = {};

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      var id = values[i][0];
      idToRow[id] = i + 2;
    }
  }

  for (var k = 0; k < depts.length; k++) {
    var d = depts[k];
    var rowData = [
      d.id,
      d.name || "",
      d.description || "",
      d.color || "#6366f1"
    ];

    if (idToRow[d.id]) {
      var rowNum = idToRow[d.id];
      sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      idToRow[d.id] = sheet.getLastRow();
    }
  }
}

function syncRoles(ss, roles) {
  var headers = ["ID", "Name", "Description", "Color", "Level", "Is System"];
  var sheet = getOrCreateSheet(ss, "Roles", headers);
  var lastRow = sheet.getLastRow();
  var idToRow = {};

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      var id = values[i][0];
      idToRow[id] = i + 2;
    }
  }

  for (var k = 0; k < roles.length; k++) {
    var r = roles[k];
    var rowData = [
      r.id,
      r.name || "",
      r.description || "",
      r.color || "#6366f1",
      r.level || 0,
      r.isSystem ? "TRUE" : "FALSE"
    ];

    if (idToRow[r.id]) {
      var rowNum = idToRow[r.id];
      sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      idToRow[r.id] = sheet.getLastRow();
    }
  }
}

function syncSettings(ss, settings) {
  var headers = ["Key", "Value", "Category", "Description"];
  var sheet = getOrCreateSheet(ss, "Settings", headers);
  var lastRow = sheet.getLastRow();
  var keyToRow = {};

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      var key = values[i][0];
      keyToRow[key] = i + 2;
    }
  }

  for (var k = 0; k < settings.length; k++) {
    var s = settings[k];
    var rowData = [
      s.key,
      s.value || "",
      s.category || "",
      s.description || ""
    ];

    if (keyToRow[s.key]) {
      var rowNum = keyToRow[s.key];
      sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      keyToRow[s.key] = sheet.getLastRow();
    }
  }
}
