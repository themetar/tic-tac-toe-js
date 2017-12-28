var TICTAC = (function () {
    var SIZE = 3,
        X = "X",
        O = "O",
        BLANK = "*", // constants
        board = [BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK],
        lines_to_check, lines_per_field,
        i,
        gui_board_fields,
        CSS_CLASS = {   FIELD: "field",
                        ACTIVE: "active", INACTIVE: "inactive",
                        PROMPT_SHOWING: "prompt showing", PROMPT_HIDDEN: "prompt hidden",
                        X: "x", O: "o",
                        WIN: "win"  },
        COLUMN_INDICES = { 0: [0, 3, 6], 1: [1, 4, 7], 2: [2, 5, 8] },
        ROW_INDICES = { 0: [0, 1, 2], 1: [3, 4, 5], 2: [6, 7, 8] },
        DIAG_INDICES = { 0: [0, 4, 8], 1: [2, 4, 6] },
        STATE = {INIT: "init", PLAYING: "playing", IDLE: "idle"},
        game_state = STATE.INIT,
        DIFFICULTY = {EASY: "easy", MEDIUM: "medium", HARD: "hard"},
        game_difficulty = DIFFICULTY.MEDIUM,
        starting_player,
        COMPUTER = "c", HUMAN = "h",
        human_symbol, computer_symbol,
        human_num_wins = 0, computer_num_wins = 0,
        winning_move, winning_fields = [];


    /////
    // Add a method to the array protoype. It returns the elements of anarray specified by an array of indices.
    //
    Array.prototype.select = function (array) {
        var i, result = [];
        for (i = 0; i < array.length; i += 1) {
            result[i] = this[array[i]];
        }
        return result;
    };

    ////
    // add all lines together
    //
    lines_to_check = [];
    for (i = 0; i < SIZE; i += 1) {
        lines_to_check.push(COLUMN_INDICES[i]);
    }
    for (i = 0; i < SIZE; i += 1) {
        lines_to_check.push(ROW_INDICES[i]);
    }
    for (i = 0; i < 2; i += 1) {
        lines_to_check.push(DIAG_INDICES[i]);
    }

    ////
    // lines per field
    //
    lines_per_field = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (pos){
        var line, result = [];
        for (var i = 0; i < lines_to_check.length; i++) {
            line = lines_to_check[i];
            if (line.indexOf(pos) !== -1) {
                result.push(line);
            }
        }

        return result;
    });

    ////
    // check if some symbol has made a line of three. return that symbol
    // else return BLANK symbol
    //
    var board_winner = function (board, last_move) {
        var symbol,
            i,
            lines, line,
            eq = function (item) { return item === symbol; },
            red = function (acc, val) {return acc && val; };

        if (last_move) { lines = lines_per_field[last_move]; } else { lines = lines_to_check; }

        for (i = 0; i < lines.length; i += 1) {
            line = board.select(lines[i]);
            symbol = line[0];
            if (symbol !== BLANK) {
                if (line.map(eq).reduce(red, true)) {
                    return symbol;
                }
            }
        }

        return BLANK;
    };

    ////
    // helper function: get empty fields i.e. available moves
    //
    var available_moves = function (board) {
        return [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(function (item) { return board[item] === BLANK; });
    };

    ////
    // helper function: convert board (board state) to a number
    //
    var board_to_index = function (board) {
        var i,
            n = 0;
        for (i = 8; i >= 0; i--) {
            n *= 3;
            n += (board[i] === X ? 1 : (board[i] === O ? 2 : 0));
        }

        return n;
    };

    ////
    // memoized minimax function. do a state search from a starting board and assign a value to the states.
    //
    var evaluate_board = (function () {

        // memory
        var values_for_X = [];
        var values_for_O = [];

        // recursive state-search function
        var eval_func = function (board, for_symbol) {
            var winner,
                value = 0,
                oponent_value,
                moves,
                other_symbol,
                new_board,
                i,
                board_n,
                memo_array;


            for_symbol = for_symbol || X;

            board_n = board_to_index(board);
            memo_array = for_symbol === X ? values_for_X : values_for_O;

            if (memo_array[board_n]  || memo_array[board_n] === 0) {
                return memo_array[board_n];
            }

            // if not in memory:

            moves = available_moves(board);

            winner = board_winner(board);

            if (winner !== BLANK) {
                value = winner === for_symbol ? 1 : -1;
            } else if (moves.length === 0) {
                value = winner === BLANK ? 0 : (winner === for_symbol ? 1 : -1);
            } else {
                value = Number.MAX_VALUE;
                other_symbol = for_symbol === X ? O : X;
                for (i = 0; i < moves.length; i += 1) {
                    new_board = board.slice(); // make copy;
                    new_board[moves[i]] = other_symbol;
                    oponent_value = -(eval_func(new_board, other_symbol)); // invert value; win for oponent is a loss
                    value = oponent_value < value ? oponent_value : value; // choose min
                }
            }

            // write to memory
            memo_array[board_n] = value;
            // return
            return value;
        }

        return eval_func;
    }());


    var choose_computer_move = function (board, difficulty) {
        var moves = available_moves(board),
            values = [],
            max_val,
            top_moves;

        if (difficulty === DIFFICULTY.HARD) {
            values = moves.map(move => {
                var new_board = board.slice();
                new_board[move] = computer_symbol;
                return evaluate_board(new_board, computer_symbol);
            });
        } else if (difficulty === DIFFICULTY.MEDIUM) {
            values = moves.map(move => {
                var new_board = board.slice();
                new_board[move] = computer_symbol;
                if (board_winner(new_board, move) === computer_symbol) {
                    return 1; // a win is worth 1
                }
                new_board = board.slice();
                new_board[move] = human_symbol;
                if (board_winner(new_board, move) === human_symbol) {
                    return 0; // blocking the opponent is worth 0
                }
                // else:
                return -1; // random move is worth the least
            });
        } else {
            values = moves.map(move => {
                var new_board = board.slice();
                new_board[move] = computer_symbol;
                return (board_winner(new_board, move) === computer_symbol ? -1 : 0); // avoid winning like the plague :)
            });
        }

        max_val = values.slice().sort((a, b) => (b-a))[0];
        top_moves = moves.filter((item, index) => (values[index] === max_val)); // select best moves
        return top_moves[Math.floor(Math.random() * top_moves.length)]; // choose one of the best moves

    };

    var click_handler_generator = function(i) {
        return function () {
                var winner;

                // check play state
                if (game_state !== STATE.PLAYING) {
                    return; // exit early
                }

                // player move
                if (board[i] === BLANK) {
                    board[i] = human_symbol;
                    update_display(i);
                }else{
                    return; // do nothing
                }


                winner = board_winner(board, i); // player move is field index 'i'
                if (winner !== BLANK || available_moves(board).length === 0){
                    // game end
                    if (winner !== BLANK) {
                        human_num_wins = human_num_wins + 1;
                        winning_move = i;
                        document.getElementsByClassName("human_score")[0].innerHTML = human_num_wins;
                    } else {
                        winning_move = undefined;
                    }
                    goto_idle_state();
                    return; // exit function
                }

                // computer move
                computer_move();
            };
    };

    var computer_move = function () {
        var winner,
            move;
        if (available_moves(board).length !== 0) {
            move = choose_computer_move(board, game_difficulty);
            board[move] = computer_symbol;
            update_display(move);
        }

        winner = board_winner(board, move);
        if (winner !== BLANK || available_moves(board).length === 0){
            // game end
            if (winner !== BLANK) {
                computer_num_wins = computer_num_wins + 1;
                winning_move = move;
                document.getElementsByClassName("computer_score")[0].innerHTML = computer_num_wins;
            } else {
                winning_move = undefined;
            }
            goto_idle_state();
        }
    };

    var setup_gui_board = function () {
        var board_div = document.querySelector(".board"),
            i,
            field_inactive = [CSS_CLASS.FIELD, CSS_CLASS.INACTIVE].join(" ");

        if (board_div){
            gui_board_fields = board_div.querySelectorAll(".field");
            if (gui_board_fields && gui_board_fields.length) {
                gui_board_fields = Array.prototype.slice.apply(gui_board_fields, [0, 9]);
                for (i = 0; i< gui_board_fields.length; i++) {
                    gui_board_fields[i].className = field_inactive;
                    gui_board_fields[i].addEventListener("click", click_handler_generator(i));
                }
            }
        }
    };

    var setup_radio = function () {
        var settings_inputs = document.querySelectorAll("input[type=\"radio\"]");
        console.log(settings_inputs);
        if (settings_inputs) {
            for(i = 0; i < 3; i++) {
                settings_inputs[i].addEventListener("change", radio_handler);
            }
        }
    }

    var update_display = function (field_index) {
        var i, css_classes = [], indices;
        if (typeof field_index === "number") {
            indices = [field_index];
        } else {
            indices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        }

        for (i = 0; i < indices.length; i++) {
            field_index = indices[i];
            css_classes = [CSS_CLASS.FIELD];

            if (game_state === STATE.INIT || game_state === STATE.IDLE || (game_state === STATE.PLAYING && board[field_index] !== BLANK)) {
                css_classes.push(CSS_CLASS.INACTIVE);
            } else {
                css_classes.push(CSS_CLASS.ACTIVE);
            }

            if (board[field_index] === X) {
                css_classes.push(CSS_CLASS.X);
            } else if (board[field_index] === O) {
                css_classes.push(CSS_CLASS.O);
            }

            if (winning_fields.indexOf(field_index) !== -1) {
                css_classes.push(CSS_CLASS.WIN);
            }

            gui_board_fields[field_index].className = css_classes.join(" ");

        }
    };

    var radio_handler = function (e) {
        if (e.target.checked) {
            game_difficulty = e.target.value;
            console.log(game_difficulty);
        }
    };

    var button_handler = function (e) {
        console.log("play");
        goto_playing_state();
    }

    var goto_playing_state = function () {
        // if from init state, choose random "previous" starting player
        if (game_state === STATE.INIT) {
            starting_player = Math.random() <= .5 ? HUMAN : COMPUTER;
        }

        // update var
        game_state = STATE.PLAYING;

        // hide prompt
        document.getElementsByClassName("prompt")[0].className = CSS_CLASS.PROMPT_HIDDEN;

        // reset board
        board = [BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK];

        // reset winning move of last game
        winning_move = undefined;
        winning_fields = [];

        // update board display
        update_display();

        // switch starting player
        starting_player = starting_player === COMPUTER ? HUMAN : COMPUTER;

        // set human and computer's symbols
        if (starting_player === COMPUTER) {
            computer_symbol = X;
            human_symbol = O;
        } else {
            human_symbol = X;
            computer_symbol = O;
        }


        // if computer, make move
        if (starting_player === COMPUTER) {
            computer_move();
        }

    };

    var goto_idle_state = function () {


        // update var
        game_state = STATE.IDLE;

        // show prompt
        document.getElementsByClassName("prompt")[0].className = CSS_CLASS.PROMPT_SHOWING;

        // find winning fields
        if (winning_move || winning_move === 0) {
            winning_fields = lines_per_field[winning_move].filter(function (line) {
                return line.map(function (item) { return board[item] === board[line[0]]; }).reduce(function (acc, val) { return acc && val; }, true);
            });
            winning_fields = winning_fields[0];
        }

        update_display();

    }

    /**
    Main
    **/
    var run = function () {

        console.log(lines_to_check);
        console.log(lines_per_field);

        // setup gui - board
        setup_gui_board();
        // setup gui - difficulty settings
        setup_radio();
        // setup gui - play button
        document.getElementsByClassName("button")[0].addEventListener("click", button_handler);
        //
        //update_display();

        //board[choose_computer_move()] = O;
        //update_display();


    };



    return {
        run : run
    };
}());
