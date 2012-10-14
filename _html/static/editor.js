
define(function(require, exports, module) {
  return {
    init: function(ace, io) {
      var session;
      this.ace = ace;
      this.editor = this.ace.edit('editor');
      this.editor.setShowPrintMargin(true);
      this.editor.setTheme("ace/theme/monokai");
      session = this.editor.getSession();
      session.setMode("ace/mode/javascript");
      session.setUseWrapMode(true);
      return this.asyn_server(io);
    },
    asyn_server: function(io) {
      var _this = this;
      io = io.connect('http://localhost:3000');
      return io.on('connect', function() {
        var e, s, sl;
        e = _this.editor;
        s = e.getSession();
        sl = e.selection;
        e.on('change', function(e) {
          return io.send(e);
        });
        return e.on('changeSelection', function(e) {
          io.send(sl.anchor);
          return io.send(sl.lead);
        });
      });
    }
  };
});
