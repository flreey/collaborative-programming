ace.define('ace/worker/worker_client', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/lib/event_emitter', 'ace/config'], function(require, exports, module) {


var oop = require("../lib/oop");
var EventEmitter = require("../lib/event_emitter").EventEmitter;
var config = require("../config");

var WorkerClient = function(topLevelNamespaces, mod, classname) {

    this.changeListener = this.changeListener.bind(this);

    if (config.get("packaged")) {
        this.$worker = new Worker(config.moduleUrl(mod, "worker"));
    }
    else {
        var workerUrl;
        if (typeof require.supports !== "undefined" && require.supports.indexOf("ucjs2-pinf-0") >= 0) {
            // We are running in the sourcemint loader.
            workerUrl = require.nameToUrl("ace/worker/worker_sourcemint");
        } else {
            // We are running in RequireJS.
            // nameToUrl is renamed to toUrl in requirejs 2
            if (require.nameToUrl && !require.toUrl)
                require.toUrl = require.nameToUrl;
            workerUrl = this.$normalizePath(require.toUrl("ace/worker/worker", null, "_"));
        }
        this.$worker = new Worker(workerUrl);

        var tlns = {};
        for (var i=0; i<topLevelNamespaces.length; i++) {
            var ns = topLevelNamespaces[i];
            var path = this.$normalizePath(require.toUrl(ns, null, "_").replace(/.js(\?.*)?$/, ""));

            tlns[ns] = path;
        }
    }

    this.$worker.postMessage({
        init : true,
        tlns: tlns,
        module: mod,
        classname: classname
    });

    this.callbackId = 1;
    this.callbacks = {};

    var _self = this;
    this.$worker.onerror = function(e) {
        window.console && console.log && console.log(e);
        throw e;
    };
    this.$worker.onmessage = function(e) {
        var msg = e.data;
        switch(msg.type) {
            case "log":
                window.console && console.log && console.log(msg.data);
                break;

            case "event":
                _self._emit(msg.name, {data: msg.data});
                break;

            case "call":
                var callback = _self.callbacks[msg.id];
                if (callback) {
                    callback(msg.data);
                    delete _self.callbacks[msg.id];
                }
                break;
        }
    };
};

(function(){

    oop.implement(this, EventEmitter);

    this.$normalizePath = function(path) {
        if (!location.host) // needed for file:// protocol
            return path;
        path = path.replace(/^[a-z]+:\/\/[^\/]+/, ""); // Remove domain name and rebuild it
        path = location.protocol + "//" + location.host
            // paths starting with a slash are relative to the root (host)
            + (path.charAt(0) == "/" ? "" : location.pathname.replace(/\/[^\/]*$/, ""))
            + "/" + path.replace(/^[\/]+/, "");
        return path;
    };

    this.terminate = function() {
        this._emit("terminate", {});
        this.$worker.terminate();
        this.$worker = null;
        this.$doc.removeEventListener("change", this.changeListener);
        this.$doc = null;
    };

    this.send = function(cmd, args) {
        this.$worker.postMessage({command: cmd, args: args});
    };

    this.call = function(cmd, args, callback) {
        if (callback) {
            var id = this.callbackId++;
            this.callbacks[id] = callback;
            args.push(id);
        }
        this.send(cmd, args);
    };

    this.emit = function(event, data) {
        try {
            // firefox refuses to clone objects which have function properties
            // TODO: cleanup event
            this.$worker.postMessage({event: event, data: {data: data.data}});
        }
        catch(ex) {}
    };

    this.attachToDocument = function(doc) {
        if(this.$doc)
            this.terminate();

        this.$doc = doc;
        this.call("setValue", [doc.getValue()]);
        doc.on("change", this.changeListener);
    };

    this.changeListener = function(e) {
        e.range = {
            start: e.data.range.start,
            end: e.data.range.end
        };
        this.emit("change", e);
    };

}).call(WorkerClient.prototype);

exports.WorkerClient = WorkerClient;

});

