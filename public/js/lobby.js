/* globals $, socket, hashColor */

const $lobby = $('.lobby')
const $roomsView = $lobby.find('.rooms')
const $tabBar = $lobby.find('.tabs')

// Tab stuff
$tabBar.on('click', '.tab-rooms', function () {
    $tabBar.find('.tab').toggleClass('active', false)
    $(this).toggleClass('active', true)
    $lobby.find('.chat').hide()
    $roomsView.show()
})
function showChat (roomId, $tab = $tabBar.find(`[data-room-id="${roomId}"]`)) {
    $roomsView.hide()
    $lobby.find('.chat').hide()
    $lobby.find(`.chat[data-room-id="${roomId}"]`).show()
    $tabBar.find('.tab').toggleClass('active', false)
    $tab.toggleClass('active', true)
}
$tabBar.on('click', '.tab-chat', function () {
    const $tab = $(this)
    showChat($tab.attr('data-room-id'), $tab)
})

// Scroll the chat box to the bottom, the most recent messages.
function scrollChat () {
    const $el = $('.lobby .messages')
    $el.scrollTop($el[0].scrollHeight)
}

function timeString (timestamp) {
    return new Date(timestamp).toTimeString().substr(0, 5)
}
function usernameHTML (username) {
    return `
        <span class="username" style="color:${hashColor(username)}">${username}</span>
    `
}
function roomHTML (room) {
    return `
        <li id="${room.id}" class="activeRoom ${room.hasPassword ? 'has-password' : ''}">
            <a href="#">${room.name}</a>
        </li>
    `
}
function messageHTML (msg) {
    msg.content = msg.content
        .replace(/([^\\]|^)(__|\*\*)(?=[^\s\n])([^\n]*[^\s\\\n])\2/g, '$1<strong>$3</strong>')
        .replace(/([^\\]|^)(_|\*)(?=[^\s\n])([^\n]*[^\s\\\n])\2/g, '$1<em>$3</em>')
        .replace(/([^\\]|^)(~~)(?=[^\s\n])([^\n]*[^\s\\\n])\2/g, '$1<del>$3</del>')
    return `
        <tr class="message">
            <td class="timestamp">${timeString(msg.timestamp)}</td>
            <td class="author">
                <span class="hidden">&lt;</span>${usernameHTML(msg.author.username)}<span class="hidden">&gt;</span>
            </td>
            <td class="content">${msg.content}</td>
        </tr>
    `
}
function systemMessageHTML (msg) {
    return `
        <tr class="message system ${msg.classes && msg.classes.join(' ')}">
            <td class="timestamp">${timeString(msg.timestamp)}</td>
            <td class="author">${msg.author}</td>
            <td class="content">${msg.content}</td>
        </tr>
    `
}
function joinMessageHTML (msg) {
    return systemMessageHTML({
        classes: ['join', 'muted'],
        author: '-->',
        content: `${usernameHTML(msg.username)} has joined.`,
        timestamp: msg.timestamp
    })
}
function leaveMessageHTML (msg) {
    return systemMessageHTML({
        classes: ['leave', 'muted'],
        author: '<--',
        content: `${usernameHTML(msg.username)} has left.`,
        timestamp: msg.timestamp
    })
}
function ownerChangeMessageHTML (msg) {
    return `
        <tr class="message system">
            <td class="timestamp">${timeString(msg.timestamp)}</td>
            <td class="author">---</td>
            <td class="content">${usernameHTML(msg.username)} is now the owner.</td>
        </tr>
    `
}
function userHTML (user) {
    return `
        <li class="user ${user.owner ? 'owner' : ''}">${usernameHTML(user.username)}</li>
    `
}
function roomTabHTML (room) {
    console.log(room)
    return `
        <a href="#" class="tab tab-chat" data-room-id="${room.id}">${room.name}</a>
    `
}
function roomDisplayHTML (room) {
    console.log(room)
    return `
        <div class="chat" data-room-id="${room.id}">
            <table class="messages"></table>
            <ul class="users"></ul>
            <input type="text" class="chatbar msgBox" placeholder="Type text here">
            <button class="leaveroom" id="leave">Leave Room</button>
        </div>
    `
}

//Creates room
$('.rooms .create').click(function () {
    console.log('test?')
    var roomName = $('#roomName').val()
    var roomPass = $('#roomPass').val()
    if (!roomName) {
        return alert('Please set a room name')
    } else {
        var roomId = Math.random()*1000000000000000000
        const room = {
            id: roomId,
            name: roomName,
            password: roomPass
        }
        socket.emit('createRoom', room)
        // TODO: let activeRooms handle this
        $('#roomList').append(roomHTML(room))
        // Let's see the new room
        $roomsView.hide()
        $lobby.find('.chat').hide()
        $lobby.append(roomDisplayHTML(room))
        // Also tabs, right
        $tabBar.find('.tab').toggleClass('active', false)
        $tabBar.append(roomTabHTML(room))
        $tabBar.find('.tab:last-child').toggleClass('active', true)
    }
})

//On connection list all active rooms
socket.on('activeRooms', function (rooms) {
    console.log('[activeRooms]', rooms)
    const $roomList = $('.lobby .roomList')
    $roomList.empty()
    for (let room of rooms) {
        // console.log('[activeRooms]', id)
        $roomList.append(roomHTML(room))
    }
    if (!rooms.length) {
        $roomList.append('<li>There are no rooms!?</li>')
    }
})

//Clicking on a room will make you join
$('.rooms .roomList').on('click', '.activeRoom', function () {
    var $this = $(this)
    var id = $this.attr('id')
    var hasPassword = $this.is('.has-password')
    if (hasPassword) {
        var password = prompt('Room password?')
        socket.emit('joinRoom', {id: id, password: password})
    } else {
        socket.emit('joinRoom', {id: id})
    }
})
socket.on('joinRoomSuccess', function (room) {
    // Add a new tab for this room
    $tabBar.find('.tab').toggleClass('active', false)
    $tabBar.append(roomTabHTML(room))
    $tabBar.find('.tab:last-child').toggleClass('active', true)
    // Add a new room display for this room
    $roomsView.hide()
    $lobby.find('.chat').hide()
    $lobby.append(roomDisplayHTML(room))
    // Add the backlog messages to the interface
    for (let msg of room.messages) {
        processMessage(msg)
    }
    // Scroll the chat down to the most recent message
    scrollChat()
})
socket.on('joinRoomFail', function (reason) {
    alert(`Failed to join room: ${reason}`)
})

//Delete empty rooms
socket.on('emptyRoom', function (emptyRoom) {
    $('#' + emptyRoom).remove()
    if (!$('.roomList').find('li').length) {
        $('.roomList').append('<li>There are no rooms!?</li>')
    }
})

//Lobby stuff

//Chatbox sends msg
$('.lobby').on('keydown', '.msgBox', function (e) {
    var key = e.which
    if (key === 13) {
        let roomId = $('.tab.active').attr('data-room-id')
        console.log(roomId)
        var msg = $(this).val()
        socket.emit('sendLobbyMessage', {msg: msg, roomId: roomId})
        $(this).val('')
    }
})
function processMessage (msg) {
    let html
    switch (msg.type) {
        case 'normal':
            html = messageHTML(msg)
            break
        case 'join':
            html = joinMessageHTML(msg)
            break
        case 'leave':
            html = leaveMessageHTML(msg)
            break
        case 'ownerChange':
            html = ownerChangeMessageHTML(msg)
            break
        default:
            return console.log('Invalid message type')
    }
    $(`.chat[data-room-id="${msg.roomId}"] .messages`).append(html)
}

//Display new msg
socket.on('newMessage', function (msg) {
    console.log('[newMessage]', msg)
    const $messages = $('.messages')
    // Are we looking at the bottom of the chat right now? (this check must be
    // before we add the message)
    const isScrolled = $messages.scrollTop() + $messages.innerHeight() >= $messages[0].scrollHeight
    // Add the message to the interface
    processMessage(msg)
    // If we were at the bottom before, put us back at the bottom
    if (isScrolled) {
        scrollChat()
    }
})

socket.on('newJoinMessage', function (msg) {
    console.log('[newJoinMessage]', msg)
    $('.messages').append(joinMessageHTML(msg))
})
socket.on('newLeaveMessage', function (msg) {
    console.log('[newLeaveMessage]', msg)
    $('.messages').append(leaveMessageHTML(msg))
})

//Leaving the lobby
$('.leave').click(function () {
    const $this = $(this)
    let roomId = $('.tab.active').attr('data-room-id')
    socket.emit('leaveRoom', roomId)
    $lobby.find('.chat').hide()
    $roomsView.show()
    $this.closest('.chat').remove()
    $roomsView.show()
})

//Display usernames on room creation
socket.on('roomUsers', function (users) {
    console.log('[roomUsers]', users)
    users.sort((u1, u2) => {
        if (u1.owner && !u2.owner) return -1
        if (u2.owner && !u1.owner) return 1
        return u1.username.localeCompare(u2.username)
    })
    var $userList = $('.users')
    $userList.empty()
    for (let user of users) {
        $userList.append(userHTML(user))
    }
})

// Remove the user from the room when they reload or exit the page
window.onbeforeunload = function () {
    socket.emit('imDeadKthx')
}
