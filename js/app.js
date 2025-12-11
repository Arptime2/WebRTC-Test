document.addEventListener('DOMContentLoaded', () => {
    const createInviteBtn = document.getElementById('createInvite');
    const copyLinkBtn = document.getElementById('copyLink');
    const connectOfferBtn = document.getElementById('connectOffer');
    const copyAnswerBtn = document.getElementById('copyAnswer');
    const sendMessageBtn = document.getElementById('sendMessage');
    const messageInput = document.getElementById('messageInput');
    const inviteLinkInput = document.getElementById('inviteLink');
    const offerSdpTextarea = document.getElementById('offerSdp');
    const answerSdpTextarea = document.getElementById('answerSdp');
    const localIpInput = document.getElementById('localIp');
    const myIpInput = document.getElementById('myIp');

    // Set default IP
    rtcManager.getLocalIP().then(ip => {
        console.log('Detected local IP:', ip);
        myIpInput.value = ip;
    });

    // Check if URL has offer
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    if (urlParams.has('offer')) {
        const offerSdp = atob(urlParams.get('offer'));
        offerSdpTextarea.value = offerSdp;
        document.getElementById('sdpSection').style.display = 'block';
        updateStatus('Offer received. Click "Connect with Offer" to join.');
    }

    document.getElementById('loadInvite').addEventListener('click', () => {
        const inviteLink = document.getElementById('pasteInviteLink').value;
        if (!inviteLink) {
            updateStatus('Please paste the invite link.');
            return;
        }
        try {
            const url = new URL(inviteLink);
            const hashParams = new URLSearchParams(url.hash.substring(1));
            if (hashParams.has('offer')) {
                const offerSdp = atob(hashParams.get('offer'));
                offerSdpTextarea.value = offerSdp;
                document.getElementById('sdpSection').style.display = 'block';
                updateStatus('Offer loaded. Click "Connect with Offer" to join.');
            } else {
                updateStatus('Invalid invite link.');
            }
        } catch (e) {
            updateStatus('Invalid URL.');
        }
    });

    createInviteBtn.addEventListener('click', async () => {
        console.log('Create invite clicked');
        const myIp = myIpInput.value;
        updateStatus('Creating offer...');
        const offerSdp = await rtcManager.createOffer(myIp);
        const encodedOffer = btoa(offerSdp);
        const inviteUrl = `${window.location.origin}${window.location.pathname}#offer=${encodedOffer}&myip=${encodeURIComponent(myIp)}`;
        inviteLinkInput.value = inviteUrl;
        document.getElementById('inviteSection').style.display = 'block';
        document.getElementById('pasteAnswerSection').style.display = 'block';
        updateStatus('Invite link created. Share it and wait for answer.');

        // Show local IP for cross-network help
        const localIP = await rtcManager.getLocalIP();
        localIpInput.value = localIP;
        document.getElementById('ipSection').style.display = 'block';
    });

    copyLinkBtn.addEventListener('click', () => {
        inviteLinkInput.select();
        document.execCommand('copy');
        updateStatus('Link copied to clipboard!');
    });

    connectOfferBtn.addEventListener('click', async () => {
        console.log('Connect offer clicked');
        const offerSdp = offerSdpTextarea.value;
        if (!offerSdp) {
            updateStatus('Please paste the offer SDP.');
            return;
        }
        const myIp = myIpInput.value;
        updateStatus('Creating answer...');
        const answerSdp = await rtcManager.createAnswer(offerSdp, myIp);
        const encodedAnswer = btoa(answerSdp);
        const answerUrl = `${window.location.origin}${window.location.pathname}#answer=${encodedAnswer}&myip=${encodeURIComponent(myIp)}`;
        document.getElementById('answerLink').value = answerUrl;
        document.getElementById('answerSection').style.display = 'block';
        updateStatus('Answer link created. Copy and send it to the initiator.');
    });

    copyAnswerBtn.addEventListener('click', () => {
        document.getElementById('answerLink').select();
        document.execCommand('copy');
        updateStatus('Answer link copied to clipboard!');
    });

    document.getElementById('loadAnswer').addEventListener('click', async () => {
        console.log('Load answer clicked');
        const answerLink = document.getElementById('pasteAnswerLink').value;
        if (!answerLink) {
            updateStatus('Please paste the answer link.');
            return;
        }
        try {
            const url = new URL(answerLink);
            const hashParams = new URLSearchParams(url.hash.substring(1));
            if (hashParams.has('answer')) {
                const answerSdp = atob(hashParams.get('answer'));
                console.log('Decoded answer SDP');
                updateStatus('Setting answer...');
                await rtcManager.setAnswer(answerSdp);
                updateStatus('Answer set. Connecting...');
            } else {
                updateStatus('Invalid answer link.');
            }
        } catch (e) {
            console.log('Error loading answer:', e);
            updateStatus('Invalid URL.');
        }
    });

    sendMessageBtn.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            rtcManager.sendMessage(message);
            messageInput.value = '';
        }
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessageBtn.click();
        }
    });
});

function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

function showChat() {
    document.getElementById('chatSection').style.display = 'block';
}

function appendMessage(message) {
    const chat = document.getElementById('chat');
    chat.value += message + '\n';
    chat.scrollTop = chat.scrollHeight;
}