document.getElementById('send').addEventListener('click', () => {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (message) {
        addMessage(message);
        sendMessage(message);

        // Clear input
        input.value = '';
    }
});

// Also send on Enter key
document.getElementById('messageInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        document.getElementById('send').click();
    }
});



