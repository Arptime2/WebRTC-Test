class WebRTCManager {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.isInitiator = false;
    }

    replaceIpInSdp(sdp, newIp) {
        return sdp.split('\n').map(line => {
            if (line.startsWith('a=candidate:')) {
                const parts = line.split(' ');
                if (parts.length > 4) {
                    parts[4] = newIp;
                    return parts.join(' ');
                }
            }
            return line;
        }).join('\n');
    }

    createPeerConnection() {
        console.log('Creating peer connection');
        this.peerConnection = new RTCPeerConnection(); // No ICE servers
        this.iceGatheringComplete = false;
        this.candidates = [];

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE candidate generated:', event.candidate);
                this.candidates.push(event.candidate);
            } else {
                console.log('ICE gathering complete');
                this.iceGatheringComplete = true;
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state change:', this.peerConnection.connectionState);
            updateStatus(`Connection: ${this.peerConnection.connectionState}`);
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state change:', this.peerConnection.iceConnectionState);
            if (this.peerConnection.iceConnectionState === 'connected') {
                updateStatus('Connected! You can now chat.');
                showChat();
            } else if (this.peerConnection.iceConnectionState === 'failed') {
                updateStatus('Connection failed. Ensure same network or share public IPs manually.');
            } else if (this.peerConnection.iceConnectionState === 'completed') {
                updateStatus('ICE completed. Waiting for data channel...');
            }
        };

        this.peerConnection.onsignalingstatechange = () => {
            console.log('Signaling state:', this.peerConnection.signalingState);
        };
    }

    async createOffer(myIp) {
        console.log('Creating offer');
        this.isInitiator = true;
        this.createPeerConnection();

        this.dataChannel = this.peerConnection.createDataChannel('chat');
        this.setupDataChannel();

        console.log('Creating offer SDP');
        const offer = await this.peerConnection.createOffer();
        console.log('Setting local description for offer');
        await this.peerConnection.setLocalDescription(offer);

        // Wait for ICE gathering to complete
        await new Promise(resolve => {
            const check = () => {
                if (this.iceGatheringComplete) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });

        let sdp = this.peerConnection.localDescription.sdp;
        // Add candidates to SDP
        if (this.candidates.length > 0) {
            sdp += '\n' + this.candidates.map(c => 'a=' + c.candidate).join('\n');
        }
        console.log('Original offer SDP:', sdp);
        sdp = sdp.split('\n').filter(line => !line.startsWith('a=max-message-size')).join('\n');
        console.log('Filtered offer SDP:', sdp);
        sdp = this.replaceIpInSdp(sdp, myIp);
        console.log('Replaced offer SDP:', sdp);
        console.log('Offer SDP created');
        return sdp;
    }

    async createAnswer(offerSdp, myIp) {
        console.log('Creating answer');
        this.isInitiator = false;
        this.createPeerConnection();

        this.peerConnection.ondatachannel = (event) => {
            console.log('Data channel received');
            this.dataChannel = event.channel;
            this.setupDataChannel();
        };

        offerSdp = offerSdp.split('\n').filter(line => !line.startsWith('a=max-message-size')).join('\n');
        console.log('Setting remote description with offer');
        await this.peerConnection.setRemoteDescription({ type: 'offer', sdp: offerSdp });
        console.log('Creating answer SDP');
        const answer = await this.peerConnection.createAnswer();
        console.log('Setting local description for answer');
        await this.peerConnection.setLocalDescription(answer);

        // Wait for ICE gathering to complete
        await new Promise(resolve => {
            const check = () => {
                if (this.iceGatheringComplete) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });

        let sdp = this.peerConnection.localDescription.sdp;
        // Add candidates to SDP
        if (this.candidates.length > 0) {
            sdp += '\n' + this.candidates.map(c => 'a=' + c.candidate).join('\n');
        }
        console.log('Original answer SDP:', sdp);
        sdp = sdp.split('\n').filter(line => !line.startsWith('a=max-message-size')).join('\n');
        console.log('Filtered answer SDP:', sdp);
        sdp = this.replaceIpInSdp(sdp, myIp);
        console.log('Replaced answer SDP:', sdp);
        console.log('Answer SDP created');
        return sdp;
    }

    async setAnswer(answerSdp) {
        console.log('Setting answer');
        answerSdp = answerSdp.split('\n').filter(line => !line.startsWith('a=max-message-size')).join('\n');
        console.log('Setting remote description with answer');
        await this.peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp });
        console.log('Answer set');
        console.log('Connection state after set answer:', this.peerConnection.connectionState);
        console.log('ICE connection state after set answer:', this.peerConnection.iceConnectionState);
        // Timeout to check if connected
        setTimeout(() => {
            console.log('Timeout check - Connection state:', this.peerConnection.connectionState);
            console.log('Timeout check - ICE connection state:', this.peerConnection.iceConnectionState);
            if (this.peerConnection.iceConnectionState !== 'connected' && this.peerConnection.iceConnectionState !== 'completed') {
                updateStatus('Connection failed. For same PC testing, use two different browsers (e.g., Chrome and Firefox). For cross-network, ensure public IPs are entered and shared.');
            }
        }, 30000);
    }

    setupDataChannel() {
        console.log('Setting up data channel');
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            updateStatus('Connected! You can now chat.');
            showChat();
        };

        this.dataChannel.onmessage = (event) => {
            console.log('Message received:', event.data);
            appendMessage('Peer: ' + event.data);
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            updateStatus('Connection closed.');
        };

        this.dataChannel.onerror = (error) => {
            console.log('Data channel error:', error);
        };
    }

    sendMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(message);
            appendMessage('You: ' + message);
        }
    }

    getLocalIP() {
        // Attempt to get local IP or address
        return new Promise((resolve) => {
            const pc = new RTCPeerConnection();
            pc.createDataChannel('');
            pc.createOffer().then(offer => pc.setLocalDescription(offer));
            pc.onicecandidate = (ice) => {
                if (ice && ice.candidate && ice.candidate.address) {
                    resolve(ice.candidate.address);
                    pc.close();
                }
            };
            setTimeout(() => {
                resolve('Unable to detect local IP');
                pc.close();
            }, 5000);
        });
    }
}

const rtcManager = new WebRTCManager();