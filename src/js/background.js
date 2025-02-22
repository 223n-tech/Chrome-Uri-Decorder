// メッセージリスナーを追加
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'checkUrl') {
        const { url } = request;
        
        // fetch APIを使用してURLをチェック
        fetch(url, { 
            method: 'HEAD', 
            mode: 'no-cors',
            timeout: 5000 
        })
        .then(response => {
            const result = {
                status: response.status || 200,
                statusText: response.statusText || 'OK',
                isValid: true,
                timestamp: new Date().toLocaleString()
            };
            sendResponse(result);
        })
        .catch(error => {
            const result = {
                status: 0,
                statusText: error.message || 'Network Error',
                isValid: false,
                timestamp: new Date().toLocaleString()
            };
            sendResponse(result);
        });
        
        return true; // 非同期レスポンスのために必要
    }
});
