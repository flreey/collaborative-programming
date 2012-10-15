
define(function(require, exports, module) {
  return {
    init: function(ace, io, project) {
      var session;
      this.ace = ace;
      this.editor = this.ace.edit('editor');
      this.editor.setShowPrintMargin(true);
      this.editor.setTheme("ace/theme/monokai");
      session = this.editor.getSession();
      session.setMode("ace/mode/javascript");
      session.setUseWrapMode(true);
      return this.asyn_server(io, project);
    },
    asyn_server: function(io, project) {
      var _this = this;
      io = io.connect("/project");
      return io.on('connect', function() {
        var editSession, editor, events_stack, selection;
        editor = _this.editor;
        editSession = editor.getSession();
        selection = editor.selection;
        events_stack = [];
        return io.emit('join', project, function(user) {
          var emit;
          console.log(user);
          if (user === 'writer') {
            editSession.on('change', function(o) {
              console.log(o);
              return events_stack.push(o);
            });
            editSession.selection.on('changeSelection', function(o) {
              return events_stack.push(event);
            });
            editSession.selection.on('changeCursor', function() {
              var o;
              o = editor.getCursorPosition();
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
            return io.on('insertText', function(data) {
              return editor.insert(data);
            });
          }
        });
      });
    }
  };
});
