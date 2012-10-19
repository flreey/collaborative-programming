ace.define('ace/renderloop', ['require', 'exports', 'module' , 'ace/lib/event'], function(require, exports, module) {


var event = require("./lib/event");

/** internal, hide
 * new RenderLoop(onRender, win)
 *
 * 
 *
**/
var RenderLoop = function(onRender, win) {
    this.onRender = onRender;
    this.pending = false;
    this.changes = 0;
    this.window = win || window;
};

(function() {

    /** internal, hide
     * RenderLoop.schedule(change)
     * - change (Array):
     * 
     * 
     **/
    this.schedule = function(change) {
        //this.onRender(change);
        //return;
        this.changes = this.changes | change;
        if (!this.pending) {
            this.pending = true;
            var _self = this;
            event.nextTick(function() {
                _self.pending = false;
                var changes;
                while (changes = _self.changes) {
                    _self.changes = 0;
                    _self.onRender(changes);
                }
            }, this.window);
        }
    };

}).call(RenderLoop.prototype);

exports.RenderLoop = RenderLoop;
});

