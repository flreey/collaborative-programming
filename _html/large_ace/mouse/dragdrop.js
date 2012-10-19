ace.define('ace/mouse/dragdrop', ['require', 'exports', 'module' , 'ace/lib/event'], function(require, exports, module) {


var event = require("../lib/event");

var DragdropHandler = function(mouseHandler) {
    var editor = mouseHandler.editor;
    var dragSelectionMarker, x, y;
    var timerId, range, isBackwards;
    var dragCursor, counter = 0;

    var mouseTarget = editor.container;
    event.addListener(mouseTarget, "dragenter", function(e) {
        counter++;
        if (!dragSelectionMarker) {
            range = editor.getSelectionRange();
            isBackwards = editor.selection.isBackwards();
            var style = editor.getSelectionStyle();
            dragSelectionMarker = editor.session.addMarker(range, "ace_selection", style);
            editor.clearSelection();
            clearInterval(timerId);
            timerId = setInterval(onDragInterval, 20);
        }
        return event.preventDefault(e);
    });

    event.addListener(mouseTarget, "dragover", function(e) {
        x = e.clientX;
        y = e.clientY;
        return event.preventDefault(e);
    });
    
    var onDragInterval =  function() {
        dragCursor = editor.renderer.screenToTextCoordinates(x, y);
        editor.moveCursorToPosition(dragCursor);
        editor.renderer.scrollCursorIntoView();
    };
    
    event.addListener(mouseTarget, "dragleave", function(e) {
        counter--;
        if (counter > 0)
            return;
        console.log(e.type, counter,e.target);
        clearInterval(timerId);
        editor.session.removeMarker(dragSelectionMarker);
        dragSelectionMarker = null;
        editor.selection.setSelectionRange(range, isBackwards);
        return event.preventDefault(e);
    });
    
    event.addListener(mouseTarget, "drop", function(e) {
        console.log(e.type, counter,e.target);
        counter = 0;
        clearInterval(timerId);
        editor.session.removeMarker(dragSelectionMarker);
        dragSelectionMarker = null;

        range.end = editor.session.insert(dragCursor, e.dataTransfer.getData('Text'));
        range.start = dragCursor;
        editor.focus();
        editor.selection.setSelectionRange(range);
        return event.preventDefault(e);
    });

};

exports.DragdropHandler = DragdropHandler;
});

