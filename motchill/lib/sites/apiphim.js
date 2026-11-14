  function apiPhimAdapter(doc, pageUrl) {
    return baseAdapter(families.APIPHIM, [
      { selector: '.topmovie-wrapper', position: 'before' },
      { selector: '.apx-home-discovery', position: 'before' },
      { selector: '.home-sections-layout', position: 'before' },
      { selector: 'main', position: 'prepend' },
      { selector: '.apx-main', position: 'prepend' },
      { selector: 'body', position: 'prepend' },
    ], 'a[href*="/play/"]', doc, pageUrl);
  }
