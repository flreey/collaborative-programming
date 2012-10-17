
define(function(require, exports, module) {
  var Range, ace, editor;
  ace = '';
  editor = '';
  Range = '';
  return {
    init: function(_ace, io, project) {
      var session;
      ace = _ace;
      editor = ace.edit('editor');
      Range = ace.require('ace/range').Range;
      editor.setShowPrintMargin(true);
      editor.setTheme("ace/theme/monokai");
      session = editor.getSession();
      session.setMode("");
      session.setUseWrapMode(true);
      return this.asyn_server(io, project);
    },
    asyn_server: function(io, project) {
      var _this = this;
      io = io.connect("/project");
      return io.on('connect', function() {
        var editSession, events_stack, selection;
        editor = editor;
        window.t = editor;
        editSession = editor.getSession();
        selection = editor.selection;
        events_stack = [];
        return io.emit('join', project, function(user) {
          var emit, removeText;
          console.log(user);
          if (user === 'writer') {
            editSession.on('change', function(o) {
              return events_stack.push(o.data);
            });
            editSession.selection.on('changeSelection', function(o) {
              var range;
              range = editSession.selection.getRange();
              range.action = 'changeSelection';
              return events_stack.push(range);
            });
            editSession.selection.on('changeCursor', function() {
              var o;
              o = editor.getCursorPosition();
              o.action = 'changeCursor';
              return events_stack.push(o);
            });
            emit = function() {
              if (events_stack.length > 0) {
                io.emit('change', events_stack);
                return events_stack = [];
              }
            };
            return setInterval(emit, 100);
          } else if (user === 'reader') {
            io.on('insertText', function(data) {
              var start;
              start = data.range.start;
              return editor.insert(data.text);
            });
            io.on('changeCursor', function(data) {
              return editor.moveCursorTo(data.row, data.column);
            });
            io.on('changeSelection', function(data) {
              return selection.setRange(data);
            });
            io.on('removeText', function(data) {
              return removeText(data);
            });
            io.on('removeLines', function(data) {
              return removeText(data);
            });
            return removeText = function(data) {
              var r, range;
              r = data.range;
              range = new Range(r.start.row, r.start.column, r.end.row, r.end.column);
              return editSession.remove(range);
            };
          }
        });
      });
    }
  };
});
