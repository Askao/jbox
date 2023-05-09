
document.addEventListener("DOMContentLoaded", function () {
    let socket = new WebSocket(location.origin.replace(/^http/, 'ws'));
    let roomCode = '';
    let nickname = '';
    let gender = '';
    let body_weight = 0;
    let hours_drinking = 0;
    let spirit_level = 0;
    let inGame = false;
    let inLobby = false;
    let playerNum = null;
    let roundId = '';

    document.querySelector('#join-game-button').addEventListener('click', function () {
        document.querySelector('#form-roomcode-invalid').classList.add('hidden');
        document.querySelector('#form-name-invalid').classList.add('hidden');
        roomCode = document.querySelector('#form-roomcode').value.toLowerCase();
        nickname = document.querySelector('#form-name').value.toLowerCase();
        gender = document.querySelector('#form-gender').value;
        body_weight = document.querySelector('#form-weight').value;
        hours_drinking = document.querySelector('#form-hours-drinking').value;
        spirit_level = document.querySelector('#form-spirit-level').value;

        let joinedMsg = {
            messageType: 'ROOM_JOIN_REQUEST',
            roomCode,
            nickname,
            gender,
            body_weight,
            hours_drinking,
            spirit_level
        };
        socket.send(JSON.stringify(joinedMsg));
    });

    let sendInput = function (inputstr, content) {
        console.log("pressed a button: " + inputstr);
        let messageToGame = {
            messageType: 'PLAYER_INPUT',
            roomCode: roomCode,
            nickname: nickname,
            gender: gender,
            body_weight: body_weight,
            hours_drinking: hours_drinking,
            spirit_level: spirit_level,
            playerNum: playerNum,
            message: inputstr,
            content: content,
            method: "player_input"
        };
        socket.send(JSON.stringify(messageToGame));
    }
    
    socket.onmessage = (event) => {
        console.log(event);
        var message = JSON.parse(event.data);
        var room = message.roomCode.toLowerCase();
        var nick = "";

        if (message.nickname) {
            nick = message.nickname.toLowerCase();
        }
        // Only respond to messages intended for our game
        if (room === roomCode) {
            switch (message.messageType) {
                case 'ERROR_INVALID_ROOM':
                    console.log("Invalid Room");
                    console.log(message);
                    document.querySelector('#form-roomcode-invalid').classList.remove('hidden');
                    break;
                case 'ERROR_NAME_TAKEN':
                    if (!inGame) {
                        document.querySelector('#form-name-invalid').classList.remove('hidden');
                    }
                    break;
                case 'INVALID_WEIGHT_INPUT':
                    console.log("Invalid Weight Input");
                    document.querySelector('#form-weight-invalid').classList.remove('hidden');
                    break;
                case 'INVALID_HOURS_DRINKING_INPUT':
                    console.log("Invalid Hours Drinking Input");
                    document.querySelector('#form-hours-invalid').classList.remove('hidden');
                    break;
                case 'INVALID_SPIRIT_INPUT':
                    console.log("Invalid Spirit Level Input");
                    document.querySelector('#form-spirit-invalid').classList.remove('hidden');
                    break;
                case 'PLAYER_JOINED':
                    if (nick === nickname) {
                        // We've joined!
                        inGame = true;
                        inLobby = true;
                        playerNum = message.playerNum;
                        document.querySelector('#room-code-form').classList.add('hidden');
                        fetch('/debate.html')
                            .then((response) => {
                                return response.text();
                            })
                            .then((body) => {
                                document.querySelector('#game-content').innerHTML = body;
                                document.querySelector('.header').style.background = "#ffb6c1";
                            });
                    }
                    break;
                case 'GAME_LOADED':
                    inLobby = false;
                    //Hide waiting message:
                    document.getElementById("name").innerHTML = nickname
                    document.querySelector('#game-lobby').classList.add('hidden');
                    document.querySelector('#waiting-for-instructions').classList.remove('hidden');

                    break;
                case 'SEND_BROADCAST':
                    if (message.method === "round_start") {
                        document.querySelector('#waiting-for-instructions').classList.add('hidden');
                        document.querySelector('#voting').classList.remove('hidden');
                        const names = message.message.split(',');

                        for (var i = 0; i < names.length; i++) {
                            document.getElementById("voting").innerHTML += "" +
                                "<br/><button type='button' style='" +
                                "background-color:#ffb6c1; " +
                                "padding: 10px 40px; " +
                                "color: white; " +
                                "font-weight: bold;" +
                                "@media only screen and (max-width: 450px){" +
                                "background-color:#ffb6c1;" +
                                "padding: 10px 40px;" +
                                "color: white;" +
                                "font-weight: bold;" +
                                "}'>" + names[i] + "</button>";
                        }

                        document.addEventListener('click', (e) => {
                            let element = e.target;
                            if (element.tagName === "BUTTON") {
                                let messageToGame = {
                                    messageType: 'SEND_GAME_DATA',
                                    roomCode,
                                    nickname,
                                    method: "player_vote",
                                    dataType: "PLAYER_VOTE",
                                    roundId,
                                    message: element.innerText
                                }
                                document.getElementById("voting").innerHTML = "";
                                document.querySelector('#voting').classList.add('hidden');
                                socket.send(JSON.stringify(messageToGame))
                            }
                        });
                    }
                    if (message.method === "voting_done") {
                        document.getElementById("voting").innerHTML = "";
                        document.querySelector('#voting').classList.add('hidden');
                    }
                    if (message.method === "drunk_player") {
                        if (message.message === nickname){
                            document.getElementById("drunk-notification").innerHTML = `
                        <div class="notification">
                            <span class="close_button" onclick="this.parentElement.style.display='none';">Close</span>
                            You have drunk too much! Consider taking a break.
                        </div>`;
                        }
                    }
            }
        }
    };

// //Supress context menu on long tap
// window.oncontextmenu = function (event) {
//     event.preventDefault();
//     event.stopPropagation();
//     return false;
// };
    window.onbeforeunload = function () {
        var disconnectedMsg = {
            messageType: 'DISCONNECTED',
            roomCode,
            nickname
        }
        socket.send(JSON.stringify(disconnectedMsg));
        socket.onclose = function () { }; // disable onclose handler first
        socket.close();
    };
});
