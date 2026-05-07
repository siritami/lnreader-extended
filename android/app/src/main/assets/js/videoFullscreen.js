(function() {
  function handleFullscreenChange() {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (fullscreenElement && fullscreenElement.tagName === 'VIDEO') {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'video-fullscreen-enter'
      }));
    } else {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'video-fullscreen-exit'
      }));
    }
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
})();
