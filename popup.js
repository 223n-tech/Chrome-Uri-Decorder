// -----------------------------------------------------------------------------
// 「popup.html」表示時に発火する'DOMContentLoaded'イベントリスナーの設定
// -----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  // ページが読み込まれたら URL をデコード
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];

    if (currentTab && currentTab.url) {
      var decodedUrl = decodeUnicode(currentTab.url);
      document.getElementById("urlContainer").innerText = currentTab.url;
      document.getElementById("titleContainer").innerText = currentTab.title;

      // 同じ場合はデコード関連のボタンとコンテナを非表示にする
      if (currentTab.url === decodedUrl) {
        document.getElementById("decHr").style.border = "none";
      } else {
        document.getElementById("urlDecContainer").style.display = "inline";
        document.getElementById("urlDecContainer").innerText = decodedUrl;
        document.getElementById("copyDecUrlButton").style.display = "inline";
        document.getElementById("copyTitleAndDecUrlButton").style.display = "inline";
      }
    } else {
      console.error("無効なタブまたはURLプロパティが見つかりません.");
    }
  });

  // 「COPY(TITLE)」
  document
    .getElementById("copyTitleButton")
    .addEventListener("click", function () {
      var titleText = document.getElementById("titleContainer").innerText;
      copyToClipboard(titleText);
    });

  // 「COPY(URL)」
  document
    .getElementById("copyUrlButton")
    .addEventListener("click", function () {
      var urlText = document.getElementById("urlContainer").innerText;
      copyToClipboard(urlText);
  });

  // 「COPY(URL+TITLE)」
  document
    .getElementById("copyTitleAndUrlButton")
    .addEventListener("click", function () {
      var urlText = document.getElementById("urlContainer").innerText;
      var titleText = document.getElementById("titleContainer").innerText;
      var copyText = [titleText, urlText].join("\n");
      copyToClipboard(copyText);
    });

  // 「COPY(URL)」
  document
    .getElementById("copyDecUrlButton")
    .addEventListener("click", function () {
      var urlText = document.getElementById("urlDecContainer").innerText;
      copyToClipboard(urlText);
    });


  // 「COPY(URL+TITLE)」
  document
    .getElementById("copyTitleAndDecUrlButton")
    .addEventListener("click", function () {
      var urlText = document.getElementById("urlDecContainer").innerText;
      var titleText = document.getElementById("titleContainer").innerText;
      var copyText = [titleText, urlText].join("\n");
      copyToClipboard(copyText);
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
    document.getElementById("status").innerText = "";

    // クリップボードへコピーチャレンジ
    await navigator.clipboard.writeText(text);

    // クリップボードへコピーチャレンジ成功
    const successMessage = "クリップボードへのコピーが成功しました.";
    console.log(successMessage + ":", text);
    document.getElementById("status").innerText = successMessage;
  } catch (err) {
    // クリップボードへコピーチャレンジ失敗
    const errorMessage = "クリップボードへのコピーが失敗しました.";
    console.error(errorMessage + ":", err);
    document.getElementById("status").innerText = errorMessage;
  }
}
