ace.define('ace/edit_session', ['require', 'exports', 'module' , 'ace/config', 'ace/lib/oop', 'ace/lib/lang', 'ace/lib/net', 'ace/lib/event_emitter', 'ace/selection', 'ace/mode/text', 'ace/range', 'ace/document', 'ace/background_tokenizer', 'ace/search_highlight', 'ace/edit_session/folding', 'ace/edit_session/bracket_match'], function(require, exports, module) {


var config = require("./config");
var oop = require("./lib/oop");
var lang = require("./lib/lang");
var net = require("./lib/net");
var EventEmitter = require("./lib/event_emitter").EventEmitter;
var Selection = require("./selection").Selection;
var TextMode = require("./mode/text").Mode;
var Range = require("./range").Range;
var Document = require("./document").Document;
var BackgroundTokenizer = require("./background_tokenizer").BackgroundTokenizer;
var SearchHighlight = require("./search_highlight").SearchHighlight;

// events 
/**
 * EditSession@change(e)
 * - e (Object): An object containing a `delta` of information about the change.
 *
 * Emitted when the document changes.
 **/
/**
 * EditSession@changeTabSize()
 *
 * Emitted when the tab size changes, via [[EditSession.setTabSize]].
 **/
/**
 * EditSession@changeOverwrite()
 *
 * Emitted when the ability to overwrite text changes, via [[EditSession.setOverwrite]].
 **/
/**
 * EditSession@changeBreakpoint()
 *
 * Emitted when the gutter changes, either by setting or removing breakpoints, or when the gutter decorations change.
 **/
/**
 * EditSession@changeFrontMarker()
 *
 * Emitted when a front marker changes.
 **/
/**
 * EditSession@changeBackMarker()
 *
 * Emitted when a back marker changes.
 **/
/**
 * EditSession@changeAnnotation()
 *
 * Emitted when an annotation changes, like through [[EditSession.setAnnotations]].
 **/
/**
 * EditSession@tokenizerUpdate(e)
 * - e (Object): An object containing one property, `"data"`, that contains information about the changing rows
 *
 * Emitted when a background tokenizer asynchronously processes new rows.
 *
 **/
/** hide
 * EditSession@loadMode(e)
 * 
 *
 *
 **/
/** 
 * EditSession@changeMode()
 * 
 * Emitted when the current mode changes.
 *
 **/
/** 
 * EditSession@changeWrapMode()
 * 
 * Emitted when the wrap mode changes.
 *
 **/
/** 
 * EditSession@changeWrapLimit()
 * 
 * Emitted when the wrapping limit changes.
 *
 **/
/**
 * EditSession@changeFold(e)
 *
 * Emitted when a code fold is added or removed.
 *
 **/
 /**
 * EditSession@changeScrollTop(scrollTop) 
 * - scrollTop (Number): The new scroll top value
 *
 * Emitted when the scroll top changes.
 **/
/**
 * EditSession@changeScrollLeft(scrollLeft) 
 * - scrollLeft (Number): The new scroll left value
 *
 * Emitted when the scroll left changes.
 **/
     
     
/**
 * new EditSession(text, mode)
 * - text (Document | String): If `text` is a `Document`, it associates the `EditSession` with it. Otherwise, a new `Document` is created, with the initial text
 * - mode (TextMode): The inital language mode to use for the document
 *
 * Sets up a new `EditSession` and associates it with the given `Document` and `TextMode`.
 *
 **/

var EditSession = function(text, mode) {
    this.$modified = true;
    this.$breakpoints = [];
    this.$decorations = [];
    this.$frontMarkers = {};
    this.$backMarkers = {};
    this.$markerId = 1;
    this.$resetRowCache(0);
    this.$wrapData = [];
    this.$foldData = [];
    this.$rowLengthCache = [];
    this.$undoSelect = true;
    this.$foldData.toString = function() {
        var str = "";
        this.forEach(function(foldLine) {
            str += "\n" + foldLine.toString();
        });
        return str;
    }

    if (typeof text == "object" && text.getLine) {
        this.setDocument(text);
    } else {
        this.setDocument(new Document(text));
    }

    this.selection = new Selection(this);
    this.setMode(mode);
};


(function() {

    oop.implement(this, EventEmitter);
    this.setDocument = function(doc) {
        if (this.doc)
            throw new Error("Document is already set");

        this.doc = doc;
        doc.on("change", this.onChange.bind(this));
        this.on("changeFold", this.onChangeFold.bind(this));

        if (this.bgTokenizer) {
            this.bgTokenizer.setDocument(this.getDocument());
            this.bgTokenizer.start(0);
        }
    };
    this.getDocument = function() {
        return this.doc;
    };
    this.$resetRowCache = function(docRow) {
        if (!docRow) {
            this.$docRowCache = [];
            this.$screenRowCache = [];
            return;
        }

        var i = this.$getRowCacheIndex(this.$docRowCache, docRow) + 1;
        var l = this.$docRowCache.length;
        this.$docRowCache.splice(i, l);
        this.$screenRowCache.splice(i, l);

    };

    this.$getRowCacheIndex = function(cacheArray, val) {
        var low = 0;
        var hi = cacheArray.length - 1;

        while (low <= hi) {
            var mid = (low + hi) >> 1;
            var c = cacheArray[mid];

            if (val > c)
                low = mid + 1;
            else if (val < c)
                hi = mid - 1;
            else
                return mid;
        }

        return low && low -1;
    };

    this.onChangeFold = function(e) {
        var fold = e.data;
        this.$resetRowCache(fold.start.row);
    };

    this.onChange = function(e) {
        var delta = e.data;
        this.$modified = true;

        this.$resetRowCache(delta.range.start.row);

        var removedFolds = this.$updateInternalDataOnChange(e);
        if (!this.$fromUndo && this.$undoManager && !delta.ignore) {
            this.$deltasDoc.push(delta);
            if (removedFolds && removedFolds.length != 0) {
                this.$deltasFold.push({
                    action: "removeFolds",
                    folds:  removedFolds
                });
            }

            this.$informUndoManager.schedule();
        }

        this.bgTokenizer.$updateOnChange(delta);
        this._emit("change", e);
    };
    this.setValue = function(text) {
        this.doc.setValue(text);
        this.selection.moveCursorTo(0, 0);
        this.selection.clearSelection();

        this.$resetRowCache(0);
        this.$deltas = [];
        this.$deltasDoc = [];
        this.$deltasFold = [];
        this.getUndoManager().reset();
    };
    /** alias of: EditSession.getValue
    * EditSession.toString() -> String
    *
    * Returns the current [[Document `Document`]] as a string.
    *
    **/
    this.getValue =
    this.toString = function() {
        return this.doc.getValue();
    };
    this.getSelection = function() {
        return this.selection;
    };
    this.getState = function(row) {
        return this.bgTokenizer.getState(row);
    };
    this.getTokens = function(row) {
        return this.bgTokenizer.getTokens(row);
    };
    this.getTokenAt = function(row, column) {
        var tokens = this.bgTokenizer.getTokens(row);
        var token, c = 0;
        if (column == null) {
            i = tokens.length - 1;
            c = this.getLine(row).length;
        } else {
            for (var i = 0; i < tokens.length; i++) {
                c += tokens[i].value.length;
                if (c >= column)
                    break;
            }
        }
        token = tokens[i];
        if (!token)
            return null;
        token.index = i;
        token.start = c - token.value.length;
        return token;
    };

    this.highlight = function(re) {
        if (!this.$searchHighlight) {
            var highlight = new SearchHighlight(null, "ace_selected_word", "text");
            this.$searchHighlight = this.addDynamicMarker(highlight);
        }
        this.$searchHighlight.setRegexp(re);
    }
    /**
    * EditSession.setUndoManager(undoManager)
    * - undoManager (UndoManager): The new undo manager
    *
    * Sets the undo manager.
    **/
    this.setUndoManager = function(undoManager) {
        this.$undoManager = undoManager;
        this.$deltas = [];
        this.$deltasDoc = [];
        this.$deltasFold = [];

        if (this.$informUndoManager)
            this.$informUndoManager.cancel();

        if (undoManager) {
            var self = this;
            this.$syncInformUndoManager = function() {
                self.$informUndoManager.cancel();

                if (self.$deltasFold.length) {
                    self.$deltas.push({
                        group: "fold",
                        deltas: self.$deltasFold
                    });
                    self.$deltasFold = [];
                }

                if (self.$deltasDoc.length) {
                    self.$deltas.push({
                        group: "doc",
                        deltas: self.$deltasDoc
                    });
                    self.$deltasDoc = [];
                }

                if (self.$deltas.length > 0) {
                    undoManager.execute({
                        action: "aceupdate",
                        args: [self.$deltas, self]
                    });
                }

                self.$deltas = [];
            }
            this.$informUndoManager =
                lang.deferredCall(this.$syncInformUndoManager);
        }
    };

    this.$defaultUndoManager = {
        undo: function() {},
        redo: function() {},
        reset: function() {}
    };
    this.getUndoManager = function() {
        return this.$undoManager || this.$defaultUndoManager;
    },

    /**
    * EditSession.getTabString() -> String
    *
    * Returns the current value for tabs. If the user is using soft tabs, this will be a series of spaces (defined by [[EditSession.getTabSize `getTabSize()`]]); otherwise it's simply `'\t'`.
    **/
    this.getTabString = function() {
        if (this.getUseSoftTabs()) {
            return lang.stringRepeat(" ", this.getTabSize());
        } else {
            return "\t";
        }
    };

    this.$useSoftTabs = true;
    this.setUseSoftTabs = function(useSoftTabs) {
        if (this.$useSoftTabs === useSoftTabs) return;

        this.$useSoftTabs = useSoftTabs;
    };
    this.getUseSoftTabs = function() {
        return this.$useSoftTabs;
    };

    this.$tabSize = 4;
    this.setTabSize = function(tabSize) {
        if (isNaN(tabSize) || this.$tabSize === tabSize) return;

        this.$modified = true;
        this.$rowLengthCache = [];
        this.$tabSize = tabSize;
        this._emit("changeTabSize");
    };
    this.getTabSize = function() {
        return this.$tabSize;
    };
    this.isTabStop = function(position) {
        return this.$useSoftTabs && (position.column % this.$tabSize == 0);
    };

    this.$overwrite = false;
    this.setOverwrite = function(overwrite) {
        if (this.$overwrite == overwrite) return;

        this.$overwrite = overwrite;
        this._emit("changeOverwrite");
    };
    this.getOverwrite = function() {
        return this.$overwrite;
    };
    this.toggleOverwrite = function() {
        this.setOverwrite(!this.$overwrite);
    };
    this.addGutterDecoration = function(row, className) {
        if (!this.$decorations[row])
            this.$decorations[row] = "";
        this.$decorations[row] += " " + className;
        this._emit("changeBreakpoint", {});
    };
    this.removeGutterDecoration = function(row, className) {
        this.$decorations[row] = (this.$decorations[row] || "").replace(" " + className, "");
        this._emit("changeBreakpoint", {});
    };
    this.getBreakpoints = function() {
        return this.$breakpoints;
    };
    this.setBreakpoints = function(rows) {
        this.$breakpoints = [];
        for (var i=0; i<rows.length; i++) {
            this.$breakpoints[rows[i]] = "ace_breakpoint";
        }
        this._emit("changeBreakpoint", {});
    };
    this.clearBreakpoints = function() {
        this.$breakpoints = [];
        this._emit("changeBreakpoint", {});
    };
    this.setBreakpoint = function(row, className) {
        if (className === undefined)
            className = "ace_breakpoint";
        if (className)
            this.$breakpoints[row] = className;
        else
            delete this.$breakpoints[row];
        this._emit("changeBreakpoint", {});
    };
    this.clearBreakpoint = function(row) {
        delete this.$breakpoints[row];
        this._emit("changeBreakpoint", {});
    };
    this.addMarker = function(range, clazz, type, inFront) {
        var id = this.$markerId++;

        var marker = {
            range : range,
            type : type || "line",
            renderer: typeof type == "function" ? type : null,
            clazz : clazz,
            inFront: !!inFront,
            id: id
        }

        if (inFront) {
            this.$frontMarkers[id] = marker;
            this._emit("changeFrontMarker")
        } else {
            this.$backMarkers[id] = marker;
            this._emit("changeBackMarker")
        }

        return id;
    };
    this.addDynamicMarker = function(marker, inFront) {
        if (!marker.update)
            return;
        var id = this.$markerId++;
        marker.id = id;
        marker.inFront = !!inFront;

        if (inFront) {
            this.$frontMarkers[id] = marker;
            this._emit("changeFrontMarker")
        } else {
            this.$backMarkers[id] = marker;
            this._emit("changeBackMarker")
        }

        return marker;
    };
    this.removeMarker = function(markerId) {
        var marker = this.$frontMarkers[markerId] || this.$backMarkers[markerId];
        if (!marker)
            return;

        var markers = marker.inFront ? this.$frontMarkers : this.$backMarkers;
        if (marker) {
            delete (markers[markerId]);
            this._emit(marker.inFront ? "changeFrontMarker" : "changeBackMarker");
        }
    };
    this.getMarkers = function(inFront) {
        return inFront ? this.$frontMarkers : this.$backMarkers;
    };
    /**
    * EditSession.setAnnotations(annotations)
    * - annotations (Array): A list of annotations
    *
    * Sets annotations for the `EditSession`. This functions emits the `'changeAnnotation'` event.
    **/
    this.setAnnotations = function(annotations) {
        this.$annotations = {};
        for (var i=0; i<annotations.length; i++) {
            var annotation = annotations[i];
            var row = annotation.row;
            if (this.$annotations[row])
                this.$annotations[row].push(annotation);
            else
                this.$annotations[row] = [annotation];
        }
        this._emit("changeAnnotation", {});
    };
    this.getAnnotations = function() {
        return this.$annotations || {};
    };
    this.clearAnnotations = function() {
        this.$annotations = {};
        this._emit("changeAnnotation", {});
    };
    this.$detectNewLine = function(text) {
        var match = text.match(/^.*?(\r?\n)/m);
        if (match) {
            this.$autoNewLine = match[1];
        } else {
            this.$autoNewLine = "\n";
        }
    };
    this.getWordRange = function(row, column) {
        var line = this.getLine(row);

        var inToken = false;
        if (column > 0)
            inToken = !!line.charAt(column - 1).match(this.tokenRe);

        if (!inToken)
            inToken = !!line.charAt(column).match(this.tokenRe);
        
        if (inToken)
            var re = this.tokenRe;
        else if (/^\s+$/.test(line.slice(column-1, column+1)))
            var re = /\s/;
        else
            var re = this.nonTokenRe;

        var start = column;
        if (start > 0) {
            do {
                start--;
            }
            while (start >= 0 && line.charAt(start).match(re));
            start++;
        }

        var end = column;
        while (end < line.length && line.charAt(end).match(re)) {
            end++;
        }

        return new Range(row, start, row, end);
    };
    this.getAWordRange = function(row, column) {
        var wordRange = this.getWordRange(row, column);
        var line = this.getLine(wordRange.end.row);

        while (line.charAt(wordRange.end.column).match(/[ \t]/)) {
            wordRange.end.column += 1;
        }
        return wordRange;
    };
    this.setNewLineMode = function(newLineMode) {
        this.doc.setNewLineMode(newLineMode);
    };
    this.getNewLineMode = function() {
        return this.doc.getNewLineMode();
    };

    this.$useWorker = true;
    this.setUseWorker = function(useWorker) {
        if (this.$useWorker == useWorker)
            return;

        this.$useWorker = useWorker;

        this.$stopWorker();
        if (useWorker)
            this.$startWorker();
    };
    this.getUseWorker = function() {
        return this.$useWorker;
    };
    this.onReloadTokenizer = function(e) {
        var rows = e.data;
        this.bgTokenizer.start(rows.first);
        this._emit("tokenizerUpdate", e);
    };

    this.$modes = {};
    this._loadMode = function(mode, callback) {
        if (!this.$modes["null"])
            this.$modes["null"] = this.$modes["ace/mode/text"] = new TextMode();

        if (this.$modes[mode])
            return callback(this.$modes[mode]);

        var _self = this;
        var module;
        try {
            module = require(mode);
        } catch (e) {};
        // sometimes require returns empty object (this bug is present in requirejs 2 as well)
        if (module && module.Mode)
            return done(module);

        // set mode to text until loading is finished
        if (!this.$mode)
            this.$setModePlaceholder();

        fetch(mode, function() {
            require([mode], done);
        });

        function done(module) {
            if (_self.$modes[mode])
                return callback(_self.$modes[mode]);

            _self.$modes[mode] = new module.Mode();
            _self.$modes[mode].$id = mode;
            _self._emit("loadmode", {
                name: mode,
                mode: _self.$modes[mode]
            });
            callback(_self.$modes[mode]);
        }

        function fetch(name, callback) {
            if (!config.get("packaged"))
                return callback();

            net.loadScript(config.moduleUrl(name, "mode"), callback);
        }
    };

    this.$setModePlaceholder = function() {
        this.$mode = this.$modes["null"];
        var tokenizer = this.$mode.getTokenizer();

        if (!this.bgTokenizer) {
            this.bgTokenizer = new BackgroundTokenizer(tokenizer);
            var _self = this;
            this.bgTokenizer.addEventListener("update", function(e) {
                _self._emit("tokenizerUpdate", e);
            });
        } else {
            this.bgTokenizer.setTokenizer(tokenizer);
        }
        this.bgTokenizer.setDocument(this.getDocument());

        this.tokenRe = this.$mode.tokenRe;
        this.nonTokenRe = this.$mode.nonTokenRe;
    };
    this.$mode = null;
    this.$modeId = null;
    this.setMode = function(mode) {
        mode = mode || "null";
        // load on demand
        if (typeof mode === "string") {
            if (this.$modeId == mode)
                return;

            this.$modeId = mode;
            var _self = this;
            this._loadMode(mode, function(module) {
                if (_self.$modeId !== mode)
                    return;

                _self.setMode(module);
            });
            return;
        }

        if (this.$mode === mode) return;
        this.$mode = mode;
        this.$modeId = mode.$id;

        this.$stopWorker();

        if (this.$useWorker)
            this.$startWorker();

        var tokenizer = mode.getTokenizer();

        if(tokenizer.addEventListener !== undefined) {
            var onReloadTokenizer = this.onReloadTokenizer.bind(this);
            tokenizer.addEventListener("update", onReloadTokenizer);
        }

        if (!this.bgTokenizer) {
            this.bgTokenizer = new BackgroundTokenizer(tokenizer);
            var _self = this;
            this.bgTokenizer.addEventListener("update", function(e) {
                _self._emit("tokenizerUpdate", e);
            });
        } else {
            this.bgTokenizer.setTokenizer(tokenizer);
        }

        this.bgTokenizer.setDocument(this.getDocument());
        this.bgTokenizer.start(0);

        this.tokenRe = mode.tokenRe;
        this.nonTokenRe = mode.nonTokenRe;

        this.$setFolding(mode.foldingRules);

        this._emit("changeMode");
    };
    this.$stopWorker = function() {
        if (this.$worker)
            this.$worker.terminate();

        this.$worker = null;
    };
    this.$startWorker = function() {
        if (typeof Worker !== "undefined" && !require.noWorker) {
            try {
                this.$worker = this.$mode.createWorker(this);
            } catch (e) {
                console.log("Could not load worker");
                console.log(e);
                this.$worker = null;
            }
        }
        else
            this.$worker = null;
    };
    this.getMode = function() {
        return this.$mode;
    };

    this.$scrollTop = 0;
    this.setScrollTop = function(scrollTop) {
        scrollTop = Math.round(Math.max(0, scrollTop));
        if (this.$scrollTop === scrollTop)
            return;

        this.$scrollTop = scrollTop;
        this._emit("changeScrollTop", scrollTop);
    };
    this.getScrollTop = function() {
        return this.$scrollTop;
    };

    this.$scrollLeft = 0;
    this.setScrollLeft = function(scrollLeft) {
        scrollLeft = Math.round(Math.max(0, scrollLeft));
        if (this.$scrollLeft === scrollLeft)
            return;

        this.$scrollLeft = scrollLeft;
        this._emit("changeScrollLeft", scrollLeft);
    };
    this.getScrollLeft = function() {
        return this.$scrollLeft;
    };
    this.getScreenWidth = function() {
        this.$computeWidth();
        return this.screenWidth;
    };

    this.$computeWidth = function(force) {
        if (this.$modified || force) {
            this.$modified = false;

            if (this.$useWrapMode)
                return this.screenWidth = this.$wrapLimit;

            var lines = this.doc.getAllLines();
            var cache = this.$rowLengthCache;
            var longestScreenLine = 0;
            var foldIndex = 0;
            var foldLine = this.$foldData[foldIndex];
            var foldStart = foldLine ? foldLine.start.row : Infinity;
            var len = lines.length;

            for (var i = 0; i < len; i++) {
                if (i > foldStart) {
                    i = foldLine.end.row + 1;
                    if (i >= len)
                        break;
                    foldLine = this.$foldData[foldIndex++];
                    foldStart = foldLine ? foldLine.start.row : Infinity;
                }

                if (cache[i] == null)
                    cache[i] = this.$getStringScreenWidth(lines[i])[0];

                if (cache[i] > longestScreenLine)
                    longestScreenLine = cache[i];
            }
            this.screenWidth = longestScreenLine;
        }
    };
    this.getLine = function(row) {
        return this.doc.getLine(row);
    };
    this.getLines = function(firstRow, lastRow) {
        return this.doc.getLines(firstRow, lastRow);
    };
    this.getLength = function() {
        return this.doc.getLength();
    };
    this.getTextRange = function(range) {
        return this.doc.getTextRange(range || this.selection.getRange());
    };
    this.insert = function(position, text) {
        return this.doc.insert(position, text);
    };
    this.remove = function(range) {
        return this.doc.remove(range);
    };
    this.undoChanges = function(deltas, dontSelect) {
        if (!deltas.length)
            return;

        this.$fromUndo = true;
        var lastUndoRange = null;
        for (var i = deltas.length - 1; i != -1; i--) {
            var delta = deltas[i];
            if (delta.group == "doc") {
                this.doc.revertDeltas(delta.deltas);
                lastUndoRange =
                    this.$getUndoSelection(delta.deltas, true, lastUndoRange);
            } else {
                delta.deltas.forEach(function(foldDelta) {
                    this.addFolds(foldDelta.folds);
                }, this);
            }
        }
        this.$fromUndo = false;
        lastUndoRange &&
            this.$undoSelect &&
            !dontSelect &&
            this.selection.setSelectionRange(lastUndoRange);
        return lastUndoRange;
    };
    this.redoChanges = function(deltas, dontSelect) {
        if (!deltas.length)
            return;

        this.$fromUndo = true;
        var lastUndoRange = null;
        for (var i = 0; i < deltas.length; i++) {
            var delta = deltas[i];
            if (delta.group == "doc") {
                this.doc.applyDeltas(delta.deltas);
                lastUndoRange =
                    this.$getUndoSelection(delta.deltas, false, lastUndoRange);
            }
        }
        this.$fromUndo = false;
        lastUndoRange &&
            this.$undoSelect &&
            !dontSelect &&
            this.selection.setSelectionRange(lastUndoRange);
        return lastUndoRange;
    };
    this.setUndoSelect = function(enable) {
        this.$undoSelect = enable;
    };
    this.$getUndoSelection = function(deltas, isUndo, lastUndoRange) {
        function isInsert(delta) {
            var insert =
                delta.action == "insertText" || delta.action == "insertLines";
            return isUndo ? !insert : insert;
        }

        var delta = deltas[0];
        var range, point;
        var lastDeltaIsInsert = false;
        if (isInsert(delta)) {
            range = delta.range.clone();
            lastDeltaIsInsert = true;
        } else {
            range = Range.fromPoints(delta.range.start, delta.range.start);
            lastDeltaIsInsert = false;
        }

        for (var i = 1; i < deltas.length; i++) {
            delta = deltas[i];
            if (isInsert(delta)) {
                point = delta.range.start;
                if (range.compare(point.row, point.column) == -1) {
                    range.setStart(delta.range.start);
                }
                point = delta.range.end;
                if (range.compare(point.row, point.column) == 1) {
                    range.setEnd(delta.range.end);
                }
                lastDeltaIsInsert = true;
            } else {
                point = delta.range.start;
                if (range.compare(point.row, point.column) == -1) {
                    range =
                        Range.fromPoints(delta.range.start, delta.range.start);
                }
                lastDeltaIsInsert = false;
            }
        }

        // Check if this range and the last undo range has something in common.
        // If true, merge the ranges.
        if (lastUndoRange != null) {
            var cmp = lastUndoRange.compareRange(range);
            if (cmp == 1) {
                range.setStart(lastUndoRange.start);
            } else if (cmp == -1) {
                range.setEnd(lastUndoRange.end);
            }
        }

        return range;
    },

    /** related to: Document.replace
    * EditSession.replace(range, text) -> Object
    * - range (Range): A specified Range to replace
    * - text (String): The new text to use as a replacement
    * + (Object): Returns an object containing the final row and column, like this:<br/>
    * ```{row: endRow, column: 0}```<br/>
    * If the text and range are empty, this function returns an object containing the current `range.start` value.<br/>
    * If the text is the exact same as what currently exists, this function returns an object containing the current `range.end` value.
    *
    * Replaces a range in the document with the new `text`.
    *
    *
    *
    **/
    this.replace = function(range, text) {
        return this.doc.replace(range, text);
    };
    this.moveText = function(fromRange, toPosition) {
        var text = this.getTextRange(fromRange);
        this.remove(fromRange);

        var toRow = toPosition.row;
        var toColumn = toPosition.column;

        // Make sure to update the insert location, when text is removed in
        // front of the chosen point of insertion.
        if (!fromRange.isMultiLine() && fromRange.start.row == toRow &&
            fromRange.end.column < toColumn)
            toColumn -= text.length;

        if (fromRange.isMultiLine() && fromRange.end.row < toRow) {
            var lines = this.doc.$split(text);
            toRow -= lines.length - 1;
        }

        var endRow = toRow + fromRange.end.row - fromRange.start.row;
        var endColumn = fromRange.isMultiLine() ?
                        fromRange.end.column :
                        toColumn + fromRange.end.column - fromRange.start.column;

        var toRange = new Range(toRow, toColumn, endRow, endColumn);

        this.insert(toRange.start, text);

        return toRange;
    };
    this.indentRows = function(startRow, endRow, indentString) {
        indentString = indentString.replace(/\t/g, this.getTabString());
        for (var row=startRow; row<=endRow; row++)
            this.insert({row: row, column:0}, indentString);
    };
    this.outdentRows = function (range) {
        var rowRange = range.collapseRows();
        var deleteRange = new Range(0, 0, 0, 0);
        var size = this.getTabSize();

        for (var i = rowRange.start.row; i <= rowRange.end.row; ++i) {
            var line = this.getLine(i);

            deleteRange.start.row = i;
            deleteRange.end.row = i;
            for (var j = 0; j < size; ++j)
                if (line.charAt(j) != ' ')
                    break;
            if (j < size && line.charAt(j) == '\t') {
                deleteRange.start.column = j;
                deleteRange.end.column = j + 1;
            } else {
                deleteRange.start.column = 0;
                deleteRange.end.column = j;
            }
            this.remove(deleteRange);
        }
    };
    this.moveLinesUp = function(firstRow, lastRow) {
        if (firstRow <= 0) return 0;

        var removed = this.doc.removeLines(firstRow, lastRow);
        this.doc.insertLines(firstRow - 1, removed);
        return -1;
    };
    this.moveLinesDown = function(firstRow, lastRow) {
        if (lastRow >= this.doc.getLength()-1) return 0;

        var removed = this.doc.removeLines(firstRow, lastRow);
        this.doc.insertLines(firstRow+1, removed);
        return 1;
    };
    this.duplicateLines = function(firstRow, lastRow) {
        var firstRow = this.$clipRowToDocument(firstRow);
        var lastRow = this.$clipRowToDocument(lastRow);

        var lines = this.getLines(firstRow, lastRow);
        this.doc.insertLines(firstRow, lines);

        var addedRows = lastRow - firstRow + 1;
        return addedRows;
    };


    this.$clipRowToDocument = function(row) {
        return Math.max(0, Math.min(row, this.doc.getLength()-1));
    };

    this.$clipColumnToRow = function(row, column) {
        if (column < 0)
            return 0;
        return Math.min(this.doc.getLine(row).length, column);
    };


    this.$clipPositionToDocument = function(row, column) {
        column = Math.max(0, column);

        if (row < 0) {
            row = 0;
            column = 0;
        } else {
            var len = this.doc.getLength();
            if (row >= len) {
                row = len - 1;
                column = this.doc.getLine(len-1).length;
            } else {
                column = Math.min(this.doc.getLine(row).length, column);
            }
        }

        return {
            row: row,
            column: column
        };
    };

    this.$clipRangeToDocument = function(range) {
        if (range.start.row < 0) {
            range.start.row = 0;
            range.start.column = 0;
        } else {
            range.start.column = this.$clipColumnToRow(
                range.start.row,
                range.start.column
            );
        }

        var len = this.doc.getLength() - 1;
        if (range.end.row > len) {
            range.end.row = len;
            range.end.column = this.doc.getLine(len).length;
        } else {
            range.end.column = this.$clipColumnToRow(
                range.end.row,
                range.end.column
            );
        }
        return range;
    };

    // WRAPMODE
    this.$wrapLimit = 80;
    this.$useWrapMode = false;
    this.$wrapLimitRange = {
        min : null,
        max : null
    };
    this.setUseWrapMode = function(useWrapMode) {
        if (useWrapMode != this.$useWrapMode) {
            this.$useWrapMode = useWrapMode;
            this.$modified = true;
            this.$resetRowCache(0);

            // If wrapMode is activaed, the wrapData array has to be initialized.
            if (useWrapMode) {
                var len = this.getLength();
                this.$wrapData = [];
                for (var i = 0; i < len; i++) {
                    this.$wrapData.push([]);
                }
                this.$updateWrapData(0, len - 1);
            }

            this._emit("changeWrapMode");
        }
    };
    this.getUseWrapMode = function() {
        return this.$useWrapMode;
    };

    // Allow the wrap limit to move freely between min and max. Either
    // parameter can be null to allow the wrap limit to be unconstrained
    // in that direction. Or set both parameters to the same number to pin
    // the limit to that value.
    /**
    * EditSession.setWrapLimitRange(min, max)
    * - min (Number): The minimum wrap value (the left side wrap)
    * - max (Number): The maximum wrap value (the right side wrap)
    *
    * Sets the boundaries of wrap. Either value can be `null` to have an unconstrained wrap, or, they can be the same number to pin the limit. If the wrap limits for `min` or `max` are different, this method also emits the `'changeWrapMode'` event.
    **/
    this.setWrapLimitRange = function(min, max) {
        if (this.$wrapLimitRange.min !== min || this.$wrapLimitRange.max !== max) {
            this.$wrapLimitRange.min = min;
            this.$wrapLimitRange.max = max;
            this.$modified = true;
            // This will force a recalculation of the wrap limit
            this._emit("changeWrapMode");
        }
    };
    this.adjustWrapLimit = function(desiredLimit) {
        var wrapLimit = this.$constrainWrapLimit(desiredLimit);
        if (wrapLimit != this.$wrapLimit && wrapLimit > 0) {
            this.$wrapLimit = wrapLimit;
            this.$modified = true;
            if (this.$useWrapMode) {
                this.$updateWrapData(0, this.getLength() - 1);
                this.$resetRowCache(0);
                this._emit("changeWrapLimit");
            }
            return true;
        }
        return false;
    };
    this.$constrainWrapLimit = function(wrapLimit) {
        var min = this.$wrapLimitRange.min;
        if (min)
            wrapLimit = Math.max(min, wrapLimit);

        var max = this.$wrapLimitRange.max;
        if (max)
            wrapLimit = Math.min(max, wrapLimit);

        // What would a limit of 0 even mean?
        return Math.max(1, wrapLimit);
    };
    this.getWrapLimit = function() {
        return this.$wrapLimit;
    };
    this.getWrapLimitRange = function() {
        // Avoid unexpected mutation by returning a copy
        return {
            min : this.$wrapLimitRange.min,
            max : this.$wrapLimitRange.max
        };
    };
    this.$updateInternalDataOnChange = function(e) {
        var useWrapMode = this.$useWrapMode;
        var len;
        var action = e.data.action;
        var firstRow = e.data.range.start.row;
        var lastRow = e.data.range.end.row;
        var start = e.data.range.start;
        var end = e.data.range.end;
        var removedFolds = null;

        if (action.indexOf("Lines") != -1) {
            if (action == "insertLines") {
                lastRow = firstRow + (e.data.lines.length);
            } else {
                lastRow = firstRow;
            }
            len = e.data.lines ? e.data.lines.length : lastRow - firstRow;
        } else {
            len = lastRow - firstRow;
        }

        if (len != 0) {
            if (action.indexOf("remove") != -1) {
                this[useWrapMode ? "$wrapData" : "$rowLengthCache"].splice(firstRow, len);

                var foldLines = this.$foldData;
                removedFolds = this.getFoldsInRange(e.data.range);
                this.removeFolds(removedFolds);

                var foldLine = this.getFoldLine(end.row);
                var idx = 0;
                if (foldLine) {
                    foldLine.addRemoveChars(end.row, end.column, start.column - end.column);
                    foldLine.shiftRow(-len);

                    var foldLineBefore = this.getFoldLine(firstRow);
                    if (foldLineBefore && foldLineBefore !== foldLine) {
                        foldLineBefore.merge(foldLine);
                        foldLine = foldLineBefore;
                    }
                    idx = foldLines.indexOf(foldLine) + 1;
                }

                for (idx; idx < foldLines.length; idx++) {
                    var foldLine = foldLines[idx];
                    if (foldLine.start.row >= end.row) {
                        foldLine.shiftRow(-len);
                    }
                }

                lastRow = firstRow;
            } else {
                var args;
                if (useWrapMode) {
                    args = [firstRow, 0];
                    for (var i = 0; i < len; i++) args.push([]);
                    this.$wrapData.splice.apply(this.$wrapData, args);
                } else {
                    args = Array(len);
                    args.unshift(firstRow, 0);
                    this.$rowLengthCache.splice.apply(this.$rowLengthCache, args);
                }

                // If some new line is added inside of a foldLine, then split
                // the fold line up.
                var foldLines = this.$foldData;
                var foldLine = this.getFoldLine(firstRow);
                var idx = 0;
                if (foldLine) {
                    var cmp = foldLine.range.compareInside(start.row, start.column)
                    // Inside of the foldLine range. Need to split stuff up.
                    if (cmp == 0) {
                        foldLine = foldLine.split(start.row, start.column);
                        foldLine.shiftRow(len);
                        foldLine.addRemoveChars(
                            lastRow, 0, end.column - start.column);
                    } else
                    // Infront of the foldLine but same row. Need to shift column.
                    if (cmp == -1) {
                        foldLine.addRemoveChars(firstRow, 0, end.column - start.column);
                        foldLine.shiftRow(len);
                    }
                    // Nothing to do if the insert is after the foldLine.
                    idx = foldLines.indexOf(foldLine) + 1;
                }

                for (idx; idx < foldLines.length; idx++) {
                    var foldLine = foldLines[idx];
                    if (foldLine.start.row >= firstRow) {
                        foldLine.shiftRow(len);
                    }
                }
            }
        } else {
            // Realign folds. E.g. if you add some new chars before a fold, the
            // fold should "move" to the right.
            len = Math.abs(e.data.range.start.column - e.data.range.end.column);
            if (action.indexOf("remove") != -1) {
                // Get all the folds in the change range and remove them.
                removedFolds = this.getFoldsInRange(e.data.range);
                this.removeFolds(removedFolds);

                len = -len;
            }
            var foldLine = this.getFoldLine(firstRow);
            if (foldLine) {
                foldLine.addRemoveChars(firstRow, start.column, len);
            }
        }

        if (useWrapMode && this.$wrapData.length != this.doc.getLength()) {
            console.error("doc.getLength() and $wrapData.length have to be the same!");
        }

        if (useWrapMode)
            this.$updateWrapData(firstRow, lastRow);
        else
            this.$updateRowLengthCache(firstRow, lastRow);

        return removedFolds;
    };

    this.$updateRowLengthCache = function(firstRow, lastRow, b) {
        this.$rowLengthCache[firstRow] = null;
        this.$rowLengthCache[lastRow] = null;
    };
    this.$updateWrapData = function(firstRow, lastRow) {
        var lines = this.doc.getAllLines();
        var tabSize = this.getTabSize();
        var wrapData = this.$wrapData;
        var wrapLimit = this.$wrapLimit;
        var tokens;
        var foldLine;

        var row = firstRow;
        lastRow = Math.min(lastRow, lines.length - 1);
        while (row <= lastRow) {
            foldLine = this.getFoldLine(row, foldLine);
            if (!foldLine) {
                tokens = this.$getDisplayTokens(lang.stringTrimRight(lines[row]));
                wrapData[row] = this.$computeWrapSplits(tokens, wrapLimit, tabSize);
                row ++;
            } else {
                tokens = [];
                foldLine.walk(
                    function(placeholder, row, column, lastColumn) {
                        var walkTokens;
                        if (placeholder) {
                            walkTokens = this.$getDisplayTokens(
                                            placeholder, tokens.length);
                            walkTokens[0] = PLACEHOLDER_START;
                            for (var i = 1; i < walkTokens.length; i++) {
                                walkTokens[i] = PLACEHOLDER_BODY;
                            }
                        } else {
                            walkTokens = this.$getDisplayTokens(
                                lines[row].substring(lastColumn, column),
                                tokens.length);
                        }
                        tokens = tokens.concat(walkTokens);
                    }.bind(this),
                    foldLine.end.row,
                    lines[foldLine.end.row].length + 1
                );
                // Remove spaces/tabs from the back of the token array.
                while (tokens.length != 0 && tokens[tokens.length - 1] >= SPACE)
                    tokens.pop();

                wrapData[foldLine.start.row]
                    = this.$computeWrapSplits(tokens, wrapLimit, tabSize);
                row = foldLine.end.row + 1;
            }
        }
    };

    // "Tokens"
    var CHAR = 1,
        CHAR_EXT = 2,
        PLACEHOLDER_START = 3,
        PLACEHOLDER_BODY =  4,
        PUNCTUATION = 9,
        SPACE = 10,
        TAB = 11,
        TAB_SPACE = 12;
    this.$computeWrapSplits = function(tokens, wrapLimit) {
        if (tokens.length == 0) {
            return [];
        }

        var splits = [];
        var displayLength = tokens.length;
        var lastSplit = 0, lastDocSplit = 0;

        function addSplit(screenPos) {
            var displayed = tokens.slice(lastSplit, screenPos);

            // The document size is the current size - the extra width for tabs
            // and multipleWidth characters.
            var len = displayed.length;
            displayed.join("").
                // Get all the TAB_SPACEs.
                replace(/12/g, function() {
                    len -= 1;
                }).
                // Get all the CHAR_EXT/multipleWidth characters.
                replace(/2/g, function() {
                    len -= 1;
                });

            lastDocSplit += len;
            splits.push(lastDocSplit);
            lastSplit = screenPos;
        }

        while (displayLength - lastSplit > wrapLimit) {
            // This is, where the split should be.
            var split = lastSplit + wrapLimit;

            // If there is a space or tab at this split position, then making
            // a split is simple.
            if (tokens[split] >= SPACE) {
                // Include all following spaces + tabs in this split as well.
                while (tokens[split] >= SPACE) {
                    split ++;
                }
                addSplit(split);
                continue;
            }

            // === ELSE ===
            // Check if split is inside of a placeholder. Placeholder are
            // not splitable. Therefore, seek the beginning of the placeholder
            // and try to place the split beofre the placeholder's start.
            if (tokens[split] == PLACEHOLDER_START
                || tokens[split] == PLACEHOLDER_BODY)
            {
                // Seek the start of the placeholder and do the split
                // before the placeholder. By definition there always
                // a PLACEHOLDER_START between split and lastSplit.
                for (split; split != lastSplit - 1; split--) {
                    if (tokens[split] == PLACEHOLDER_START) {
                        // split++; << No incremental here as we want to
                        //  have the position before the Placeholder.
                        break;
                    }
                }

                // If the PLACEHOLDER_START is not the index of the
                // last split, then we can do the split
                if (split > lastSplit) {
                    addSplit(split);
                    continue;
                }

                // If the PLACEHOLDER_START IS the index of the last
                // split, then we have to place the split after the
                // placeholder. So, let's seek for the end of the placeholder.
                split = lastSplit + wrapLimit;
                for (split; split < tokens.length; split++) {
                    if (tokens[split] != PLACEHOLDER_BODY)
                    {
                        break;
                    }
                }

                // If spilt == tokens.length, then the placeholder is the last
                // thing in the line and adding a new split doesn't make sense.
                if (split == tokens.length) {
                    break;  // Breaks the while-loop.
                }

                // Finally, add the split...
                addSplit(split);
                continue;
            }

            // === ELSE ===
            // Search for the first non space/tab/placeholder/punctuation token backwards.
            var minSplit = Math.max(split - 10, lastSplit - 1);
            while (split > minSplit && tokens[split] < PLACEHOLDER_START) {
                split --;
            }
            while (split > minSplit && tokens[split] == PUNCTUATION) {
                split --;
            }
            // If we found one, then add the split.
            if (split > minSplit) {
                addSplit(++split);
                continue;
            }

            // === ELSE ===
            split = lastSplit + wrapLimit;
            // The split is inside of a CHAR or CHAR_EXT token and no space
            // around -> force a split.
            addSplit(split);
        }
        return splits;
    };
    this.$getDisplayTokens = function(str, offset) {
        var arr = [];
        var tabSize;
        offset = offset || 0;

        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            // Tab
            if (c == 9) {
                tabSize = this.getScreenTabSize(arr.length + offset);
                arr.push(TAB);
                for (var n = 1; n < tabSize; n++) {
                    arr.push(TAB_SPACE);
                }
            }
            // Space
            else if (c == 32) {
                arr.push(SPACE);
            } else if((c > 39 && c < 48) || (c > 57 && c < 64)) {
                arr.push(PUNCTUATION);
            }
            // full width characters
            else if (c >= 0x1100 && isFullWidth(c)) {
                arr.push(CHAR, CHAR_EXT);
            } else {
                arr.push(CHAR);
            }
        }
        return arr;
    };
    this.$getStringScreenWidth = function(str, maxScreenColumn, screenColumn) {
        if (maxScreenColumn == 0)
            return [0, 0];
        if (maxScreenColumn == null)
            maxScreenColumn = Infinity;
        screenColumn = screenColumn || 0;

        var c, column;
        for (column = 0; column < str.length; column++) {
            c = str.charCodeAt(column);
            // tab
            if (c == 9) {
                screenColumn += this.getScreenTabSize(screenColumn);
            }
            // full width characters
            else if (c >= 0x1100 && isFullWidth(c)) {
                screenColumn += 2;
            } else {
                screenColumn += 1;
            }
            if (screenColumn > maxScreenColumn) {
                break;
            }
        }

        return [screenColumn, column];
    };
    this.getRowLength = function(row) {
        if (!this.$useWrapMode || !this.$wrapData[row]) {
            return 1;
        } else {
            return this.$wrapData[row].length + 1;
        }
    };
    this.getScreenLastRowColumn = function(screenRow) {
        var pos = this.screenToDocumentPosition(screenRow, Number.MAX_VALUE);
        return this.documentToScreenColumn(pos.row, pos.column);
    };
    this.getDocumentLastRowColumn = function(docRow, docColumn) {
        var screenRow = this.documentToScreenRow(docRow, docColumn);
        return this.getScreenLastRowColumn(screenRow);
    };
    this.getDocumentLastRowColumnPosition = function(docRow, docColumn) {
        var screenRow = this.documentToScreenRow(docRow, docColumn);
        return this.screenToDocumentPosition(screenRow, Number.MAX_VALUE / 10);
    };
    this.getRowSplitData = function(row) {
        if (!this.$useWrapMode) {
            return undefined;
        } else {
            return this.$wrapData[row];
        }
    };
    this.getScreenTabSize = function(screenColumn) {
        return this.$tabSize - screenColumn % this.$tabSize;
    };
    this.screenToDocumentRow = function(screenRow, screenColumn) {
        return this.screenToDocumentPosition(screenRow, screenColumn).row;
    };
    this.screenToDocumentColumn = function(screenRow, screenColumn) {
        return this.screenToDocumentPosition(screenRow, screenColumn).column;
    };
    this.screenToDocumentPosition = function(screenRow, screenColumn) {
        if (screenRow < 0)
            return {row: 0, column: 0};

        var line;
        var docRow = 0;
        var docColumn = 0;
        var column;
        var row = 0;
        var rowLength = 0;

        var rowCache = this.$screenRowCache;
        var i = this.$getRowCacheIndex(rowCache, screenRow);
        if (0 < i && i < rowCache.length) {
            var row = rowCache[i];
            var docRow = this.$docRowCache[i];
            var doCache = screenRow > row || (screenRow == row && i == rowCache.length - 1);
        } else {
            var doCache = i != 0 || !rowCache.length;
        }

        var maxRow = this.getLength() - 1;
        var foldLine = this.getNextFoldLine(docRow);
        var foldStart = foldLine ? foldLine.start.row : Infinity;

        while (row <= screenRow) {
            rowLength = this.getRowLength(docRow);
            if (row + rowLength - 1 >= screenRow || docRow >= maxRow) {
                break;
            } else {
                row += rowLength;
                docRow++;
                if (docRow > foldStart) {
                    docRow = foldLine.end.row+1;
                    foldLine = this.getNextFoldLine(docRow, foldLine);
                    foldStart = foldLine ? foldLine.start.row : Infinity;
                }
            }
            if (doCache) {
                this.$docRowCache.push(docRow);
                this.$screenRowCache.push(row);
            }
        }

        if (foldLine && foldLine.start.row <= docRow) {
            line = this.getFoldDisplayLine(foldLine);
            docRow = foldLine.start.row;
        } else if (row + rowLength <= screenRow || docRow > maxRow) {
            // clip at the end of the document
            return {
                row: maxRow,
                column: this.getLine(maxRow).length
            }
        } else {
            line = this.getLine(docRow);
            foldLine = null;
        }

        if (this.$useWrapMode) {
            var splits = this.$wrapData[docRow];
            if (splits) {
                column = splits[screenRow - row];
                if(screenRow > row && splits.length) {
                    docColumn = splits[screenRow - row - 1] || splits[splits.length - 1];
                    line = line.substring(docColumn);
                }
            }
        }

        docColumn += this.$getStringScreenWidth(line, screenColumn)[1];

        // We remove one character at the end so that the docColumn
        // position returned is not associated to the next row on the screen.
        if (this.$useWrapMode && docColumn >= column)
            docColumn = column - 1;

        if (foldLine)
            return foldLine.idxToPosition(docColumn);

        return {row: docRow, column: docColumn};
    };
    this.documentToScreenPosition = function(docRow, docColumn) {
        // Normalize the passed in arguments.
        if (typeof docColumn === "undefined")
            var pos = this.$clipPositionToDocument(docRow.row, docRow.column);
        else
            pos = this.$clipPositionToDocument(docRow, docColumn);

        docRow = pos.row;
        docColumn = pos.column;

        var screenRow = 0;
        var foldStartRow = null;
        var fold = null;

        // Clamp the docRow position in case it's inside of a folded block.
        fold = this.getFoldAt(docRow, docColumn, 1);
        if (fold) {
            docRow = fold.start.row;
            docColumn = fold.start.column;
        }

        var rowEnd, row = 0;


        var rowCache = this.$docRowCache;
        var i = this.$getRowCacheIndex(rowCache, docRow);
        if (0 < i && i < rowCache.length) {
            var row = rowCache[i];
            var screenRow = this.$screenRowCache[i];
            var doCache = docRow > row || (docRow == row && i == rowCache.length - 1);
        } else {
            var doCache = i != 0 || !rowCache.length;
        }

        var foldLine = this.getNextFoldLine(row);
        var foldStart = foldLine ?foldLine.start.row :Infinity;

        while (row < docRow) {
            if (row >= foldStart) {
                rowEnd = foldLine.end.row + 1;
                if (rowEnd > docRow)
                    break;
                foldLine = this.getNextFoldLine(rowEnd, foldLine);
                foldStart = foldLine ?foldLine.start.row :Infinity;
            }
            else {
                rowEnd = row + 1;
            }

            screenRow += this.getRowLength(row);
            row = rowEnd;

            if (doCache) {
                this.$docRowCache.push(row);
                this.$screenRowCache.push(screenRow);
            }
        }

        // Calculate the text line that is displayed in docRow on the screen.
        var textLine = "";
        // Check if the final row we want to reach is inside of a fold.
        if (foldLine && row >= foldStart) {
            textLine = this.getFoldDisplayLine(foldLine, docRow, docColumn);
            foldStartRow = foldLine.start.row;
        } else {
            textLine = this.getLine(docRow).substring(0, docColumn);
            foldStartRow = docRow;
        }
        // Clamp textLine if in wrapMode.
        if (this.$useWrapMode) {
            var wrapRow = this.$wrapData[foldStartRow];
            var screenRowOffset = 0;
            while (textLine.length >= wrapRow[screenRowOffset]) {
                screenRow ++;
                screenRowOffset++;
            }
            textLine = textLine.substring(
                wrapRow[screenRowOffset - 1] || 0, textLine.length
            );
        }

        return {
            row: screenRow,
            column: this.$getStringScreenWidth(textLine)[0]
        };
    };
    this.documentToScreenColumn = function(row, docColumn) {
        return this.documentToScreenPosition(row, docColumn).column;
    };
    this.documentToScreenRow = function(docRow, docColumn) {
        return this.documentToScreenPosition(docRow, docColumn).row;
    };
    this.getScreenLength = function() {
        var screenRows = 0;
        var fold = null;
        if (!this.$useWrapMode) {
            screenRows = this.getLength();

            // Remove the folded lines again.
            var foldData = this.$foldData;
            for (var i = 0; i < foldData.length; i++) {
                fold = foldData[i];
                screenRows -= fold.end.row - fold.start.row;
            }
        } else {
            var lastRow = this.$wrapData.length;
            var row = 0, i = 0;
            var fold = this.$foldData[i++];
            var foldStart = fold ? fold.start.row :Infinity;

            while (row < lastRow) {
                screenRows += this.$wrapData[row].length + 1;
                row ++;
                if (row > foldStart) {
                    row = fold.end.row+1;
                    fold = this.$foldData[i++];
                    foldStart = fold ?fold.start.row :Infinity;
                }
            }
        }

        return screenRows;
    }

    // For every keystroke this gets called once per char in the whole doc!!
    // Wouldn't hurt to make it a bit faster for c >= 0x1100
    function isFullWidth(c) {
        if (c < 0x1100)
            return false;
        return c >= 0x1100 && c <= 0x115F ||
               c >= 0x11A3 && c <= 0x11A7 ||
               c >= 0x11FA && c <= 0x11FF ||
               c >= 0x2329 && c <= 0x232A ||
               c >= 0x2E80 && c <= 0x2E99 ||
               c >= 0x2E9B && c <= 0x2EF3 ||
               c >= 0x2F00 && c <= 0x2FD5 ||
               c >= 0x2FF0 && c <= 0x2FFB ||
               c >= 0x3000 && c <= 0x303E ||
               c >= 0x3041 && c <= 0x3096 ||
               c >= 0x3099 && c <= 0x30FF ||
               c >= 0x3105 && c <= 0x312D ||
               c >= 0x3131 && c <= 0x318E ||
               c >= 0x3190 && c <= 0x31BA ||
               c >= 0x31C0 && c <= 0x31E3 ||
               c >= 0x31F0 && c <= 0x321E ||
               c >= 0x3220 && c <= 0x3247 ||
               c >= 0x3250 && c <= 0x32FE ||
               c >= 0x3300 && c <= 0x4DBF ||
               c >= 0x4E00 && c <= 0xA48C ||
               c >= 0xA490 && c <= 0xA4C6 ||
               c >= 0xA960 && c <= 0xA97C ||
               c >= 0xAC00 && c <= 0xD7A3 ||
               c >= 0xD7B0 && c <= 0xD7C6 ||
               c >= 0xD7CB && c <= 0xD7FB ||
               c >= 0xF900 && c <= 0xFAFF ||
               c >= 0xFE10 && c <= 0xFE19 ||
               c >= 0xFE30 && c <= 0xFE52 ||
               c >= 0xFE54 && c <= 0xFE66 ||
               c >= 0xFE68 && c <= 0xFE6B ||
               c >= 0xFF01 && c <= 0xFF60 ||
               c >= 0xFFE0 && c <= 0xFFE6;
    };

}).call(EditSession.prototype);

require("./edit_session/folding").Folding.call(EditSession.prototype);
require("./edit_session/bracket_match").BracketMatch.call(EditSession.prototype);

exports.EditSession = EditSession;
});

