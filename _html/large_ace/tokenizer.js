ace.define('ace/tokenizer', ['require', 'exports', 'module' ], function(require, exports, module) {


/**
 * class Tokenizer
 *
 * This class takes a set of highlighting rules, and creates a tokenizer out of them. For more information, see [the wiki on extending highlighters](https://github.com/ajaxorg/ace/wiki/Creating-or-Extending-an-Edit-Mode#wiki-extendingTheHighlighter).
 *
 **/

/**
 * new Tokenizer(rules, flag)
 * - rules (Object): The highlighting rules
 * - flag (String): Any additional regular expression flags to pass (like "i" for case insensitive)
 *
 * Constructs a new tokenizer based on the given rules and flags.
 *
 **/
var Tokenizer = function(rules, flag) {
    flag = flag ? "g" + flag : "g";
    this.rules = rules;

    this.regExps = {};
    this.matchMappings = {};
    for ( var key in this.rules) {
        var rule = this.rules[key];
        var state = rule;
        var ruleRegExps = [];
        var matchTotal = 0;
        var mapping = this.matchMappings[key] = {};

        for ( var i = 0; i < state.length; i++) {

            if (state[i].regex instanceof RegExp)
                state[i].regex = state[i].regex.toString().slice(1, -1);

            // Count number of matching groups. 2 extra groups from the full match
            // And the catch-all on the end (used to force a match);
            var matchcount = new RegExp("(?:(" + state[i].regex + ")|(.))").exec("a").length - 2;

            // Replace any backreferences and offset appropriately.
            var adjustedregex = state[i].regex.replace(/\\([0-9]+)/g, function (match, digit) {
                return "\\" + (parseInt(digit, 10) + matchTotal + 1);
            });

            if (matchcount > 1 && state[i].token.length !== matchcount-1)
                throw new Error("For " + state[i].regex + " the matching groups and length of the token array don't match (rule #" + i + " of state " + key + ")");

            mapping[matchTotal] = {
                rule: i,
                len: matchcount
            };
            matchTotal += matchcount;

            ruleRegExps.push(adjustedregex);
        }

        this.regExps[key] = new RegExp("(?:(" + ruleRegExps.join(")|(") + ")|(.))", flag);
    }
};

(function() {

    /**
    * Tokenizer.getLineTokens() -> Object
    *
    * Returns an object containing two properties: `tokens`, which contains all the tokens; and `state`, the current state.
    **/
    this.getLineTokens = function(line, startState) {
        var currentState = startState || "start";
        var state = this.rules[currentState];
        var mapping = this.matchMappings[currentState];
        var re = this.regExps[currentState];
        re.lastIndex = 0;

        var match, tokens = [];

        var lastIndex = 0;

        var token = {
            type: null,
            value: ""
        };

        while (match = re.exec(line)) {
            var type = "text";
            var rule = null;
            var value = [match[0]];

            for (var i = 0; i < match.length-2; i++) {
                if (match[i + 1] === undefined)
                    continue;

                rule = state[mapping[i].rule];

                if (mapping[i].len > 1)
                    value = match.slice(i+2, i+1+mapping[i].len);

                // compute token type
                if (typeof rule.token == "function")
                    type = rule.token.apply(this, value);
                else
                    type = rule.token;

                if (rule.next) {
                    currentState = rule.next;
                    state = this.rules[currentState];
                    mapping = this.matchMappings[currentState];
                    lastIndex = re.lastIndex;

                    re = this.regExps[currentState];

                    if (re === undefined) {
                         throw new Error("You indicated a state of " + rule.next + " to go to, but it doesn't exist!");
                    }

                    re.lastIndex = lastIndex;
                }
                break;
            }

            if (value[0]) {
                if (typeof type == "string") {
                    value = [value.join("")];
                    type = [type];
                }
                for (var i = 0; i < value.length; i++) {
                    if (!value[i])
                        continue;

                    if ((!rule || rule.merge || type[i] === "text") && token.type === type[i]) {
                        token.value += value[i];
                    } else {
                        if (token.type)
                            tokens.push(token);

                        token = {
                            type: type[i],
                            value: value[i]
                        };
                    }
                }
            }

            if (lastIndex == line.length)
                break;

            lastIndex = re.lastIndex;
        }

        if (token.type)
            tokens.push(token);

        return {
            tokens : tokens,
            state : currentState
        };
    };

}).call(Tokenizer.prototype);

exports.Tokenizer = Tokenizer;
});
