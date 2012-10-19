ace.define('ace/mouse/multi_select_handler', ['require', 'exports', 'module' , 'ace/lib/event'], function(require, exports, module) {

var event = require("../lib/event");


// mouse
function isSamePoint(p1, p2) {
    return p1.row == p2.row && p1.column == p2.column;
}

function onMouseDown(e) {
    var ev = e.domEvent;
    var alt = ev.altKey;
    var shift = ev.shiftKey;
    var ctrl = e.getAccelKey();
    var button = e.getButton();

    if (e.editor.inMultiSelectMode && button == 2) {
        e.editor.textInput.onContextMenu(e.domEvent);
        return;
    }
    
    if (!ctrl && !alt) {
        if (button == 0 && e.editor.inMultiSelectMode)
            e.editor.exitMultiSelectMode();
        return;
    }

    var editor = e.editor;
    var selection = editor.selection;
    var isMultiSelect = editor.inMultiSelectMode;
    var pos = e.getDocumentPosition();
    var cursor = selection.getCursor();
    var inSelection = e.inSelection() || (selection.isEmpty() && isSamePoint(pos, cursor));


    var mouseX = e.x, mouseY = e.y;
    var onMouseSelection = function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    };

    var blockSelect = function() {
        var newCursor = editor.renderer.pixelToScreenCoordinates(mouseX, mouseY);
        var cursor = session.screenToDocumentPosition(newCursor.row, newCursor.column);

        if (isSamePoint(screenCursor, newCursor)
            && isSamePoint(cursor, selection.selectionLead))
            return;
        screenCursor = newCursor;

        editor.selection.moveCursorToPosition(cursor);
        editor.selection.clearSelection();
        editor.renderer.scrollCursorIntoView();

        editor.removeSelectionMarkers(rectSel);
        rectSel = selection.rectangularRangeBlock(screenCursor, screenAnchor);
        rectSel.forEach(editor.addSelectionMarker, editor);
        editor.updateSelectionMarkers();
    };
    
    var session = editor.session;
    var screenAnchor = editor.renderer.pixelToScreenCoordinates(mouseX, mouseY);
    var screenCursor = screenAnchor;

    

    if (ctrl && !shift && !alt && button == 0) {
        if (!isMultiSelect && inSelection)
            return; // dragging

        if (!isMultiSelect) {
            var range = selection.toOrientedRange();
            editor.addSelectionMarker(range);
        }

        var oldRange = selection.rangeList.rangeAtPoint(pos);

        event.capture(editor.container, function(){}, function() {
            var tmpSel = selection.toOrientedRange();

            if (oldRange && tmpSel.isEmpty() && isSamePoint(oldRange.cursor, tmpSel.cursor))
                selection.substractPoint(tmpSel.cursor);
            else {
                if (range) {
                    editor.removeSelectionMarker(range);
                    selection.addRange(range);
                }
                selection.addRange(tmpSel);
            }
        });

    } else if (!shift && alt && button == 0) {
        e.stop();

        if (isMultiSelect && !ctrl)
            selection.toSingleRange();
        else if (!isMultiSelect && ctrl)
            selection.addRange();

        selection.moveCursorToPosition(pos);
        selection.clearSelection();

        var rectSel = [];

        var onMouseSelectionEnd = function(e) {
            clearInterval(timerId);
            editor.removeSelectionMarkers(rectSel);
            for (var i = 0; i < rectSel.length; i++)
                selection.addRange(rectSel[i]);
        };

        var onSelectionInterval = blockSelect;

        event.capture(editor.container, onMouseSelection, onMouseSelectionEnd);
        var timerId = setInterval(function() {onSelectionInterval();}, 20);

        return e.preventDefault();
    }
}


exports.onMouseDown = onMouseDown;

});

