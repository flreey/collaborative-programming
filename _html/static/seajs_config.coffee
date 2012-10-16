seajs.config({
    debug: 2,
    alias: {
        '$': 'lib/jquery-1.7.2.min.js'
        'vim': 'lib/ace/keybinding-vim.js'
    }
    preload: ['vim']
})
