// -----------------------------------------------------------------------------
// 「popup.html」表示時に発火する'DOMContentLoaded'イベントリスナーの設定
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {

    // ページが読み込まれたら URL をデコード
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var currentTab = tabs[0];
  
      if (currentTab && currentTab.url) {
        var decodedUrl = decodeUnicode(currentTab.url);
        document.getElementById('urlContainer').innerText = currentTab.url;
  
        // 同じ場合はデコード関連のボタンとコンテナを非表示にする
        if (currentTab.url !== decodedUrl) {
          document.getElementById('copyDecButton').style.display = 'inline';
          document.getElementById('urlDecContainer').style.display = 'inline';
          document.getElementById('urlDecContainer').innerText = decodedUrl;
        }
      } else {
        console.error("無効なタブまたはURLプロパティが見つかりません.");
      }
    });
  
    // 「COPY」ボタン押下時に発火する'click'イベントリスナーの設定
    document.getElementById('copyButton').addEventListener('click', function () {
      var urlText = document.getElementById('urlContainer').innerText;
      copyToClipboard(urlText);
    });
  
    // 「COPY」ボタン押下時に発火する'click'イベントリスナーの設定
    document.getElementById('copyDecButton').addEventListener('click', function () {
      var urlText = document.getElementById('urlDecContainer').innerText;
      copyToClipboard(urlText);
    });
  });
  
  // -----------------------------------------------------------------------------
  // URLをデコードする関数
  // -----------------------------------------------------------------------------
  function decodeUnicode(url) {
  
    try {
      url = decodeURIComponent(url);
      // UTF-16（%uXXXX 形式）を通常の URL エンコードに変換してデコード
      url = url.replace(/%u([0-9A-Fa-f]{4})/g, function (match, hex) {
        return String.fromCharCode(parseInt(hex, 16));
      });
    } catch (err) {
      // UTF-16（%uXXXX 形式）を通常の URL エンコードに変換してデコード
      url = url.replace(/%u([0-9A-Fa-f]{4})/g, function (match, hex) {
        return String.fromCharCode(parseInt(hex, 16));
      });
    }
  
    try {
      url = decodeURIComponent(url);
    } catch (err) {
      console.error("decodeURIComponent ERROR:", url, err);
    }
    return url;
  }
  
  // -----------------------------------------------------------------------------
  // クリップボードへテキストをコピーする
  // -----------------------------------------------------------------------------
  async function copyToClipboard(text) {
  
    try {
      // クリップボードへコピーチャレンジ
      await navigator.clipboard.writeText(text);
  
      // クリップボードへコピーチャレンジ成功
      const successMessage = 'クリップボードへのコピーが成功しました.';
      console.log(successMessage + ':', text);
      document.getElementById('status').innerText = successMessage;
  
    } catch (err) {
  
      // クリップボードへコピーチャレンジ失敗
      const errorMessage = 'クリップボードへのコピーが失敗しました.';
      console.error(errorMessage + ':', err);
      document.getElementById('status').innerText = errorMessage;
    }
  }
  