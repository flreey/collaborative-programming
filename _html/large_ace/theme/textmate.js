ace.define('ace/theme/textmate', ['require', 'exports', 'module' , 'text!ace/theme/textmate.css', 'ace/lib/dom'], function(require, exports, module) {


exports.isDark = false;
exports.cssClass = "ace-tm";
exports.cssText = require('text!./textmate.css');

var dom = require("../lib/dom");
dom.importCssString(exports.cssText, exports.cssClass);
});

