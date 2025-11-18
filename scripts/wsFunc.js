let user = null;
const wsUrl = `ws://${window.location.host}/chat`;
const socket = new WebSocket(wsUrl);
const messages = document.getElementById('messages');

socket.onopen = () => {
    console.log("connected!")
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    console.log(data);
    console.log(data.user);

    switch (data.type) {
        case 'message':
            addMessage(data.message, data.user);
            break;

        case 'server_shutdown':
            socket.close();
            break;

        case 'define':
            user = data.user;
            break;

        case 'auth':
            if (data.success) {
                setLoggedInState(data.username);
            }

        default:
            console.log("error");
    }
};

function addMessage(message, sender = user) {
    const messagesDiv = document.getElementById('messages');
    const newMessage = document.createElement('div');

    newMessage.textContent = `${sender}: ${message}`;
    messagesDiv.appendChild(newMessage);

    // Scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}


function sendMessage(message) {
    socket.send(JSON.stringify({
        'type': 'message',
        'user': user,
        'message': message,
        'timestamp': new Date().toISOString()
    }));
}


document.getElementById('logout').addEventListener('click', () => {
    if (!user) return;

    socket.send(JSON.stringify({
        type: 'logout',
        user: user
    }));

    setLoggedOutState();
});

function setLoggedInState(username) {
    user = username;
    document.getElementById("login").disabled = true;
    document.getElementById("signup").disabled = true;
    document.getElementById("logout").disabled = false;
    console.log("Logged in as:", user);
}

function setLoggedOutState() {
    user = null;
    document.getElementById("login").disabled = false;
    document.getElementById("signup").disabled = false;
    document.getElementById("logout").disabled = true;
    console.log("Logged out");
}