ace.define('ace/token_iterator', ['require', 'exports', 'module' ], function(require, exports, module) {


/**
 * class TokenIterator
 *
 * This class provides an essay way to treat the document as a stream of tokens, and provides methods to iterate over these tokens.
 *
 **/

/**
 * new TokenIterator(session, initialRow, initialColumn)
 * - session (EditSession): The session to associate with
 * - initialRow (Number): The row to start the tokenizing at
 * - initialColumn (Number): The column to start the tokenizing at
 *
 * Creates a new token iterator object. The inital token index is set to the provided row and column coordinates.
 *
 **/
var TokenIterator = function(session, initialRow, initialColumn) {
    this.$session = session;
    this.$row = initialRow;
    this.$rowTokens = session.getTokens(initialRow);

    var token = session.getTokenAt(initialRow, initialColumn);
    this.$tokenIndex = token ? token.index : -1;
};

(function() {
   
    /**
    * TokenIterator.stepBackward() -> [String]
    * + (String): If the current point is not at the top of the file, this function returns `null`. Otherwise, it returns an array of the tokenized strings.
    * 
    * Tokenizes all the items from the current point to the row prior in the document. 
    **/ 
    this.stepBackward = function() {
        this.$tokenIndex -= 1;
        
        while (this.$tokenIndex < 0) {
            this.$row -= 1;
            if (this.$row < 0) {
                this.$row = 0;
                return null;
            }
                
            this.$rowTokens = this.$session.getTokens(this.$row);
            this.$tokenIndex = this.$rowTokens.length - 1;
        }
            
        return this.$rowTokens[this.$tokenIndex];
    };   
    this.stepForward = function() {
        var rowCount = this.$session.getLength();
        this.$tokenIndex += 1;
        
        while (this.$tokenIndex >= this.$rowTokens.length) {
            this.$row += 1;
            if (this.$row >= rowCount) {
                this.$row = rowCount - 1;
                return null;
            }

            this.$rowTokens = this.$session.getTokens(this.$row);
            this.$tokenIndex = 0;
        }
            
        return this.$rowTokens[this.$tokenIndex];
    };      
    this.getCurrentToken = function () {
        return this.$rowTokens[this.$tokenIndex];
    };      
    this.getCurrentTokenRow = function () {
        return this.$row;
    };     
    this.getCurrentTokenColumn = function() {
        var rowTokens = this.$rowTokens;
        var tokenIndex = this.$tokenIndex;
        
        // If a column was cached by EditSession.getTokenAt, then use it
        var column = rowTokens[tokenIndex].start;
        if (column !== undefined)
            return column;
            
        column = 0;
        while (tokenIndex > 0) {
            tokenIndex -= 1;
            column += rowTokens[tokenIndex].value.length;
        }
        
        return column;  
    };
            
}).call(TokenIterator.prototype);

exports.TokenIterator = TokenIterator;
});

