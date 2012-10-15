define((require, exports, module) ->
    init: (ace, io, project) ->
        @ace = ace
        @editor = @ace.edit('editor')
        @editor.setShowPrintMargin(true)
        @editor.setTheme("ace/theme/monokai")
        session = @editor.getSession()
        session.setMode("ace/mode/javascript")
        session.setUseWrapMode(true)

        @asyn_server(io, project)

    asyn_server: (io, project) ->
        #$ = require('$')
        io = io.connect("/project")
        io.on('connect', () =>
            e = @editor
            s = e.getSession()
            sl = e.selection
            io.emit('join', project)

            emit_msg = false
            $(document).keypress((event) ->
                emit_msg = true
            )

            e.on('change', (o)->
                console.log emit_msg
                if emit_msg
                    console.log o
                    io.emit('change', {action: o.data.action, text: o.data.text})
                    emit_msg = false
            )

            e.on('changeSelection', (o)->
                arow = sl.anchor.row
                acol = sl.anchor.column
                lrow = sl.lead.row
                lcol = sl.lead.column

                if arow != lrow || acol != lcol
                    io.emit('change_selection',
                        {arow: arow, acol: acol,
                        lrow: lrow, lcol: lcol}
                    )
            )

            io.on('insertText', (data) ->
                e.insert(data)
            )
        )
)
