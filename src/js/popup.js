document.addEventListener("DOMContentLoaded", () => {
  const generateButton = document.getElementById("generate-linked-xml");
  const errorMessageElement = document.getElementById("error-message");
  var log_text = "";

  generateButton.addEventListener("click", () => {
    // ボタンを無効化し、ローディング状態にする
    generateButton.disabled = true;
    generateButton.classList.add("loading");

    // エラーメッセージをクリア
    errorMessageElement.textContent = "";
    errorMessageElement.style.display = "none";

    // アクティブなタブの情報を取得
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];

      // XMLファイルの場合のみ処理を実行
      if (
        currentTab.url.endsWith(".xml") ||
        currentTab.url.endsWith(".sitemap")
      ) {
        // コンテンツスクリプトを実行してXMLデータを取得
        chrome.scripting.executeScript(
          {
            target: { tabId: currentTab.id },
            function: () => {
              return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", document.location.href, true);
                xhr.overrideMimeType("text/xml"); // XMLとして解釈
                xhr.responseType = "document";
                xhr.onload = () => {
                  if (xhr.status === 200) {
                    // XMLドキュメントを文字列に変換
                    const serializer = new XMLSerializer();
                    const xmlString = serializer.serializeToString(
                      xhr.responseXML
                    );
                    resolve({ content: xmlString });
                  } else {
                    reject(new Error(`Failed to load XML: ${xhr.status}`));
                  }
                };
                xhr.onerror = () => reject(new Error("Failed to load XML"));
                xhr.send();
              });
            },
          },
          async (results) => {
            if (chrome.runtime.lastError) {
              // ボタンを元の状態に戻す
              generateButton.disabled = false;
              generateButton.classList.remove("loading");
              showError(chrome.runtime.lastError.message);
              return;
            }

            if (results && results[0] && results[0].result) {
              const xmlContent = results[0].result.content;
              await createAndOpenLinkedXMLPage(xmlContent, currentTab.url);
              // ボタンを元の状態に戻す
              generateButton.disabled = false;
              generateButton.classList.remove("loading");
            } else {
              // ボタンを元の状態に戻す
              generateButton.disabled = false;
              generateButton.classList.remove("loading");
              showError("XMLコンテンツの取得に失敗しました");
            }
          }
        );
      } else {
        // ボタンを元の状態に戻す
        generateButton.disabled = false;
        generateButton.classList.remove("loading");
        showError("XMLファイルではありません");
      }
    });
  });

  function extractUrls(xmlContent) {
    // URLを抽出する正規表現を改良
    const urlRegex = /(https?:\/\/[^\s<>"']+)/g;

    // 全URLを抽出
    const matches = xmlContent.match(urlRegex) || [];

    // 重複を削除し、スペース区切りのURLを分割
    const uniqueUrls = new Set();
    matches.forEach((url) => {
      // スペースで区切られたURLがある場合は分割
      url.split(/\s+/).forEach((singleUrl) => {
        if (singleUrl.startsWith("http")) {
          uniqueUrls.add(singleUrl);
        }
      });
    });

    return Array.from(uniqueUrls);
  }

  function checkUrlStatus(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "checkUrl", url: url }, (response) => {
        resolve({
          url,
          status: response?.status || 0,
          statusText: response?.statusText || "Unknown",
          isValid: response?.isValid || false,
          timestamp: response?.timestamp || new Date().toLocaleString(),
        });
      });
    });
  }

  function formatXMLWithIndent(xmlText) {
    // DOMParserを使用してXMLをパース
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // エラーチェック
    const parserErrors = xmlDoc.getElementsByTagName("parsererror");
    if (parserErrors.length > 0) {
      return xmlText;
    }

    // XMLをフォーマット
    const serializer = new XMLSerializer();
    let formattedXml = "";
    let indent = 0;
    const indentStep = 2;

    function addIndent() {
      return " ".repeat(indent);
    }

    function processNode(node) {
      switch (node.nodeType) {
        case Node.ELEMENT_NODE:
          formattedXml += addIndent() + `<${node.nodeName}`;

          // 属性処理
          for (let attr of node.attributes) {
            formattedXml += ` ${attr.name}="${attr.value}"`;
          }

          if (node.childNodes.length === 0) {
            formattedXml += "/>\n";
          } else {
            formattedXml += ">\n";
            indent += indentStep;

            for (let child of node.childNodes) {
              processNode(child);
            }

            indent -= indentStep;
            formattedXml += addIndent() + `</${node.nodeName}>\n`;
          }
          break;

        case Node.TEXT_NODE:
          const text = node.textContent.trim();
          if (text) {
            formattedXml += addIndent() + text + "\n";
          }
          break;

        case Node.PROCESSING_INSTRUCTION_NODE:
          formattedXml += `<?${node.nodeName} ${node.nodeValue}?>\n`;
          break;

        case Node.COMMENT_NODE:
          formattedXml += addIndent() + `<!--${node.nodeValue}-->\n`;
          break;
      }
    }

    // XML宣言や前処理命令を最初に追加
    for (let node of xmlDoc.childNodes) {
      if (
        node.nodeType === Node.PROCESSING_INSTRUCTION_NODE ||
        node.nodeType === Node.COMMENT_NODE
      ) {
        processNode(node);
      }
    }

    // ルート要素を処理
    processNode(xmlDoc.documentElement);

    return formattedXml.trim();
  }

  async function createAndOpenLinkedXMLPage(xmlContent, sourceUrl) {
    try {
      // XMLを整形
      const formattedXmlContent = formatXMLWithIndent(xmlContent);

      // URLリストを抽出
      const urlList = extractUrls(formattedXmlContent);

      // チェック結果を保存
      const urlStatuses = await Promise.all(
        urlList.map((url) => checkUrlStatus(url))
      );

      // 結果ページを生成して開く
      const resultsHtml = createLinkedXMLPage(
        xmlContent,
        formattedXmlContent,
        urlList,
        urlStatuses
      );
      const dataUrl =
        "data:text/html;charset=utf-8," + encodeURIComponent(resultsHtml);
      chrome.tabs.create({ url: dataUrl });
    } catch (error) {
      showError(`XMLの処理中にエラーが発生しました: ${error.message}`);
    }
  }

  function createLinkedXMLPage(
    originalXmlContent,
    formattedXmlContent,
    urlList,
    urlStatuses
  ) {
    // URLステータスをマップに変換（高速検索用）
    const urlStatusMap = new Map(
      urlStatuses.map((status) => [status.url, status])
    );

    const styles = `
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            .xml-content {
                white-space: pre-wrap;
                font-family: monospace;
                font-size: 14px;
                background-color: #f4f4f4;
                padding: 15px;
                border-radius: 4px;
                overflow-x: auto;
                word-break: break-all;
            }
            .raw-xml-content {
                width: 100%;
                min-height: 300px;
                margin-top: 20px;
                font-family: monospace;
                font-size: 12px;
                white-space: pre-wrap;
                word-break: break-all;
                background-color: #f9f9f9;
                border: 1px solid #ddd;
                padding: 10px;
                box-sizing: border-box;
                resize: vertical;
                overflow: auto;
            }
        `;

    const icons = {
      success: `<svg class="status-icon" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" stroke="#28a745" stroke-width="1" fill="none"/><path d="M4.5 8L7 10.5L11.5 6" stroke="#28a745" stroke-width="2" fill="none"/></svg>`,
      error: `<svg class="status-icon" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" stroke="#dc3545" stroke-width="1" fill="none"/><path d="M5 5L11 11M5 11L11 5" stroke="#dc3545" stroke-width="2"/></svg>`,
    };

    function escapeHTML(str) {
      if (typeof str !== "string") return str;
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function createUrlElement(url) {
      // const urlStatus = urlStatusMap.get(url) || { isValid: false, status: 0, statusText: 'Unknown', timestamp: new Date().toLocaleString() };
      // const icon = urlStatus.isValid ? icons.success : icons.error;
      // const tooltipContent = `
      //     <div class="tooltip-content">
      //         <span class="tooltip-label">ステータス:</span>
      //         <span>${urlStatus.status} ${urlStatus.statusText}</span>
      //         <span class="tooltip-label">チェック時刻:</span>
      //         <span>${urlStatus.timestamp}</span>
      //     </div>
      // `;
      // var result = `
      //     <span class="url-container">
      //         <span class="status-icon">
      //             ${icon}
      //             <div class="tooltip">${tooltipContent}</div>
      //         </span>
      //         <a href="${url}" class="url" target="_blank" rel="noopener noreferrer">${url}</a>
      //     </span>
      // `;
      var result = `<a href="${url}" class="url" target="_blank" rel="noopener noreferrer">${url}</a>`;
      return result;
    }

    function extractCleanUrls(text) {
      const urlRegex = /https?:\/\/[^\s<>"'`]+/g;

      const urls = text.match(urlRegex);

      return urls
        ? urls.filter((url) => {
            // 有効なURLのみをフィルタリング
            try {
              new URL(url);
              return true;
            } catch {
              return false;
            }
          })
        : [];
    }

    function formatXML(xmlText) {
      // 改行コードで配列へ変換
      const xmlTexts = escapeHTML(xmlText).split(/\n/);
      // 生成したコード
      var code = "";
      // URL変換用
      const urlRegex = /(https?:\/\/[^\s<>"'`]+)(?=['"`\s>]|$)/g;
      // スペース変換用
      const spaceRegex = /^\s/g;
      // ループ処理
      xmlTexts.forEach((xml) => {
        // 半角スペースを変換
        xml = xml.replace(spaceRegex, "&nbsp;");
        // URLをリンク＋Tooltip付きに変換
        const urls = xml.match(urlRegex);
        if (urls !== null && urls.length !== 0) {
          log_text += "====================================================\n";
          log_text += xml + "\n";
          log_text += "----------------------------------------------------\n";
          urls.forEach((target_url) => {
            var url = target_url;
            log_text += "[ORIGINAL] " + url + "\n";
            url = extractCleanUrls(url);
            log_text += "[REPLACE]  " + url + "\n";
            xml = xml.replace(url, createUrlElement(url));
            log_text += "- - - - - - - - - - - - - - - -\n";
          });
          log_text += "====================================================\n";
        }
        // codeに追加
        code += xml + "\r\n";
      });
      return code;
    }

    return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>XMLリンク付き表示</title>
                <style>${styles}</style>
            </head>
            <body>
                <h1>XMLリンク付き表示</h1>
                <pre class="xml-content">${formatXML(formattedXmlContent)}</pre>
                <h2>生のXMLコンテンツ</h2>
                <textarea class="raw-xml-content" readonly>${escapeHTML(
                  formattedXmlContent
                )}</textarea>
                <h3>ログ</h3>
                <textarea class="raw-xml-content" readonly>${log_text}</textarea>
            </body>
            </html>
        `;
  }

  function showError(message) {
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = "block";
  }
});
