(function() {
    // Configuration object
    const config = {
        buttonSize: '60px',
        buttonColor: '#3B82F6', // Blue color matching the design
        buttonIconColor: '#FFFFFF',
        windowWidth: '400px',
        windowHeight: '700px',
        position: 'right' // 'right' or 'left'
    };

    // Get the script URL parameter
    const currentScript = document.currentScript;
    const chatUrl = currentScript.getAttribute('data-chat-url');

    if (!chatUrl) {
        console.error('Chat URL not provided. Please add data-chat-url attribute to the script tag.');
        return;
    }

    // Create and inject styles
    const styles = `
        .oab-widget-button {
            position: fixed;
            bottom: 20px;
            ${config.position}: 20px;
            width: ${config.buttonSize};
            height: ${config.buttonSize};
            border-radius: 50%;
            background-color: ${config.buttonColor};
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            z-index: 999999;
            transition: transform 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .oab-widget-button:hover {
            transform: scale(1.1);
        }
        .oab-widget-icon {
            width: 50%;
            height: 50%;
            fill: ${config.buttonIconColor};
        }
        .oab-chat-window {
            position: fixed;
            bottom: 100px;
            ${config.position}: 20px;
            width: ${config.windowWidth};
            height: ${config.windowHeight};
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 999998;
            overflow: hidden;
            transition: transform 0.3s ease, opacity 0.3s ease;
            transform: translateY(20px);
            opacity: 0;
            pointer-events: none;
        }
        .oab-chat-window.active {
            transform: translateY(0);
            opacity: 1;
            pointer-events: all;
        }
        .oab-chat-iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Create chat button with icon
    const button = document.createElement('div');
    button.className = 'oab-widget-button';
    button.innerHTML = `
        <svg class="oab-widget-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
    `;

    // Create chat window
    const chatWindow = document.createElement('div');
    chatWindow.className = 'oab-chat-window';
    chatWindow.innerHTML = `
        <iframe class="oab-chat-iframe" src="${chatUrl}"></iframe>
    `;

    // Add elements to DOM
    document.body.appendChild(button);
    document.body.appendChild(chatWindow);

    // Toggle chat window
    let isOpen = false;
    button.addEventListener('click', () => {
        isOpen = !isOpen;
        chatWindow.classList.toggle('active', isOpen);
    });

    // Close chat when clicking outside
    document.addEventListener('click', (e) => {
        if (isOpen && !chatWindow.contains(e.target) && !button.contains(e.target)) {
            isOpen = false;
            chatWindow.classList.remove('active');
        }
    });
})(); 